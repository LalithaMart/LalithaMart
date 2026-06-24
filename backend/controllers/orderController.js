import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import OTP from '../models/OTP.js';
import Counter from '../models/Counter.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

import Notification from '../models/Notification.js';

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
const addOrderItems = async (req, res) => {
  if (req.user.isBlocked) {
    res.status(403);
    throw new Error('Your account is blocked. You cannot place orders.');
  }

  const { orderItems, deliveryAddress, paymentMethod, totalAmount } = req.body;

  if (totalAmount === undefined || isNaN(totalAmount) || totalAmount < 0) {
    res.status(400);
    throw new Error('Invalid total amount');
  }

  if (deliveryAddress && deliveryAddress.phone) {
    if (!/^\d{10}$/.test(deliveryAddress.phone)) {
      res.status(400);
      throw new Error('Please provide a valid 10-digit phone number for delivery');
    }
  }

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else {
    // Generate Order ID ORD-YYYY-MM-DD-XXXXXX
    const dateStr = new Date().toISOString().split('T')[0];
    const counterId = `order_seq_global`;
    
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    const orderId = `ORD-${dateStr}-${String(counter.seq).padStart(6, '0')}`;

    const order = new Order({
      orderId,
      orderItems,
      customer: req.user._id,
      deliveryAddress,
      paymentMethod,
      totalAmount: Math.max(0, totalAmount),
    });

    const createdOrder = await order.save();

    // Pre-flight stock validation
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Insufficient stock for product: ${item.name}`);
      }
    }

    // Decrease Stock Atomically
    for (const item of orderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      
      if (updatedProduct) {
        try {
          getIO().emit('stock-updated', { productId: item.product, newStock: updatedProduct.stock });
          if (updatedProduct.stock === 0) {
            const outOfStockNotif = await Notification.create({
              message: `URGENT: ${updatedProduct.name} is now out of stock!`,
              type: 'System',
              relatedId: updatedProduct._id,
              targetRole: 'admin',
              link: `/admin/products?edit=${updatedProduct._id}`
            });
            getIO().to('admin-room').emit('new-notification', outOfStockNotif);
          }
        } catch (e) {}
      }
    }

    // Increment customer order count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalOrders': 1 }
    });

    // Clear user cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    // Emit realtime event
    try {
      getIO().to('admin-room').emit('new-order', createdOrder);
      
      const newNotif = await Notification.create({
        message: `New Order Received: ${orderId} for ₹${totalAmount}`,
        type: 'Order',
        relatedId: createdOrder._id,
        targetRole: 'admin',
        link: `/admin?assignOrder=${createdOrder._id}`
      });
      getIO().to('admin-room').emit('new-notification', newNotif);
    } catch (e) {
      console.log('Socket IO error:', e);
    }

    res.status(201).json(createdOrder);
  }
};

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('deliveryPartner', 'name phone');

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Get all orders (Admin) with filtering, pagination, and sorting
 * @route   GET /api/orders
 * @access  Private/Admin
 */
const getOrders = async (req, res) => {
  const { status, startDate, endDate, search, sortBy, sortOrder, page, limit } = req.query;
  
  let filter = {};

  if (status && status !== 'All') {
    filter.status = status;
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  } else if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $lte: end };
  }

  if (search) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);
    
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { customer: { $in: userIds } },
      { deliveryPartner: { $in: userIds } }
    ];
  }

  let sortOptions = { createdAt: -1 };
  if (sortBy) {
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'date') sortOptions = { createdAt: order };
    if (sortBy === 'value') sortOptions = { totalAmount: order };
  }

  let query = Order.find(filter)
    .populate('customer', 'name phone email')
    .populate('deliveryPartner', 'name phone')
    .sort(sortOptions);

  // default to max 100 limit if page is not provided to optimize non-paginated queries
  if (!page) {
    query = query.limit(100);
  }

  if (page) {
    const pageSize = parseInt(limit) || 10;
    const skip = (parseInt(page) - 1) * pageSize;
    
    query = query.skip(skip).limit(pageSize);
    const orders = await query;
    const total = await Order.countDocuments(filter);

    return res.json({
      orders,
      page: parseInt(page),
      pages: Math.ceil(total / pageSize),
      total
    });
  }

  const orders = await query;
  res.json(orders);
};

/**
 * @desc    Get order counts by status (Admin)
 * @route   GET /api/orders/counts
 * @access  Private/Admin
 */
const getOrderCounts = async (req, res) => {
  const { startDate, endDate, search } = req.query;
  
  let filter = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  } else if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $lte: end };
  }

  if (search) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);
    
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { customer: { $in: userIds } },
      { deliveryPartner: { $in: userIds } }
    ];
  }

  const counts = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    All: 0,
    Pending: 0,
    Assigned: 0,
    'Out for Delivery': 0,
    Completed: 0,
    Cancelled: 0,
  };

  counts.forEach(c => {
    if (result[c._id] !== undefined) {
      result[c._id] = c.count;
    }
    result.All += c.count;
  });

  res.json(result);
};

/**
 * @desc    Assign delivery partner
 * @route   PUT /api/orders/:id/assign
 * @access  Private/Admin
 */
const assignDeliveryPartner = async (req, res) => {
  const { partnerId } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    if (['Out for Delivery', 'Delivered', 'Completed'].includes(order.status)) {
      res.status(400);
      throw new Error(`Order is already ${order.status} and cannot be reassigned.`);
    }

    // Check if partner is available
    const partner = await User.findById(partnerId);
    if (!partner || !['delivery', 'admin'].includes(partner.role)) {
      res.status(400);
      throw new Error('Invalid delivery partner');
    }
    if (!partner.isAvailable) {
      res.status(400);
      throw new Error('Delivery partner is currently offline and cannot be assigned.');
    }

    if (order.cancelledBy && order.cancelledBy.includes(partnerId)) {
      res.status(400);
      throw new Error('This partner previously cancelled this order and cannot be reassigned to it.');
    }

    order.deliveryPartner = partnerId;
    order.status = 'Assigned';
    const updatedOrder = await order.save();
    
    // Cleanup any admin notifications related to this order being cancelled
    try {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.deleteMany({ relatedId: order._id, type: 'Delivery' });

      const dpNotif = await Notification.create({
        title: 'New Order Assigned 📦',
        message: `You have been assigned to deliver Order ${updatedOrder.orderId || updatedOrder._id.toString().substring(18)}.`,
        type: 'Delivery',
        relatedId: updatedOrder._id,
        userId: partnerId,
        targetRole: 'specific',
        link: `/delivery?orderId=${updatedOrder._id}`
      });
      getIO().to(partnerId.toString()).emit('new-notification', dpNotif);
    } catch (e) {}

    try {
      getIO().to(order.customer.toString()).emit('order-updated', updatedOrder);
      getIO().to('admin-room').emit('order-updated', updatedOrder);
      getIO().to(partnerId.toString()).emit('order-assigned', updatedOrder);
    } catch (e) {}
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Get assigned orders (Delivery Partner)
 * @route   GET /api/orders/assigned
 * @access  Private/Delivery
 */
const getAssignedOrders = async (req, res) => {
  const orders = await Order.find({
    $or: [
      { deliveryPartner: req.user._id },
      { cancelledBy: req.user._id }
    ]
  }).populate('customer', 'name phone');
  res.json(orders);
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Delivery
 */
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    // If marking as delivered, generate OTP for customer
    if (status === 'Delivered' && order.status !== 'Delivered') {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      order.deliveryOTP = generatedOtp;
      // SIMULATION: Send OTP to customer phone
      console.log(`[SMS SIMULATION] Order Delivery OTP for ${order.id} is ${generatedOtp}`);
    }

    order.status = status;
    const updatedOrder = await order.save();
    try {
      getIO().to(order.customer.toString()).emit('order-updated', updatedOrder);
      getIO().to('admin-room').emit('order-updated', updatedOrder);
    } catch (e) {}
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Cancel order (Admin or Customer)
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error('Cancellation reason is required');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    // Permission check
    if (req.user.role !== 'admin' && order.customer.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to cancel this order');
    }

    // Status check based on role
    if (req.user.role !== 'admin') {
      if (['Out for Delivery', 'Delivered', 'Completed'].includes(order.status)) {
        res.status(400);
        throw new Error('Order cannot be cancelled at this stage.');
      }
    } else {
      if (order.status === 'Completed' || order.status === 'Delivered') {
        res.status(400);
        throw new Error('Cannot cancel a completed or delivered order');
      }
    }
    
    order.status = 'Cancelled';
    order.cancelReason = reason;
    order.isRefunded = true; // Assuming COD, so technically no refund, but tracking it
    
    // Return items to stock
    for (const item of order.orderItems) {
      const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { new: true });
      if (product) {
        try {
          getIO().emit('stock-updated', { productId: item.product, newStock: product.stock });
        } catch (e) {}
      }
    }

    const updatedOrder = await order.save();
    
    try {
      getIO().to(order.customer.toString()).emit('order-cancelled', updatedOrder);
      getIO().to('admin-room').emit('order-cancelled', updatedOrder);
      
      const cancelNotif = await Notification.create({
        message: `Order Cancelled: ${order.orderId} (${reason})`,
        type: 'Order',
        relatedId: updatedOrder._id,
        targetRole: 'admin',
        link: `/admin?assignOrder=${updatedOrder._id}`
      });
      getIO().to('admin-room').emit('new-notification', cancelNotif);

      const customerNotif = await Notification.create({
        message: `Your Order ${order.orderId} was cancelled. Reason: ${reason}`,
        type: 'Order',
        relatedId: updatedOrder._id,
        userId: order.customer,
        targetRole: 'specific',
        link: `/profile?orderId=${updatedOrder._id}`
      });
      getIO().to(order.customer.toString()).emit('new-notification', customerNotif);

      if (order.deliveryPartner) {
        const dpNotif = await Notification.create({
          message: `Your assigned order was cancelled: ${order.orderId}`,
          type: 'Delivery',
          relatedId: updatedOrder._id,
          userId: order.deliveryPartner,
          targetRole: 'specific',
          link: `/delivery?orderId=${updatedOrder._id}`
        });
        getIO().to(order.deliveryPartner.toString()).emit('new-notification', dpNotif);
      }
    } catch (e) {}

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Verify delivery OTP and complete order
 * @route   POST /api/orders/:id/verify-otp
 * @access  Private/Delivery
 */
const verifyDeliveryOTP = async (req, res) => {
  const { otp, paymentMethod } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    if (order.deliveryOTP === otp) {
      order.status = 'Completed';
      if (paymentMethod) {
        order.paymentMethod = paymentMethod;
      }
      order.paymentStatus = 'Completed';
      
      const updatedOrder = await order.save();
      
      // Update delivery partner stats
      if (order.deliveryPartner) {
        const incFields = { 'stats.successfulDeliveries': 1 };
        if (paymentMethod === 'Cash' || paymentMethod === 'COD') {
          incFields['stats.cashCollections'] = updatedOrder.totalAmount;
          // Note: Removed pendingCashToSubmit increment here to compute daily cash on-the-fly in settlements
        } else if (paymentMethod === 'UPI') {
          incFields['stats.upiCollections'] = updatedOrder.totalAmount;
        }
        
        await User.findByIdAndUpdate(order.deliveryPartner, {
          $inc: incFields
        });
      }
      try {
        getIO().to(order.customer.toString()).emit('order-updated', updatedOrder);
        getIO().to('admin-room').emit('order-updated', updatedOrder);
      } catch (e) {}
      res.json(updatedOrder);
    } else {
      res.status(400);
      throw new Error('Invalid OTP');
    }
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Modify order (Admin)
 * @route   PUT /api/orders/:id/modify
 * @access  Private/Admin
 */
const modifyOrder = async (req, res) => {
  const { orderItems, totalAmount, reason } = req.body;
  
  if (!reason) {
    res.status(400);
    throw new Error('Modification reason is required');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    if (order.status === 'Completed' || order.status === 'Cancelled' || order.status === 'Delivered') {
      res.status(400);
      throw new Error(`Cannot modify a ${order.status.toLowerCase()} order`);
    }

    // Save snapshot
    const previousSnapshot = {
      orderItems: order.orderItems,
      totalAmount: order.totalAmount
    };

    // Stock adjustments
    // First, restore old items to stock
    for (const item of order.orderItems) {
      const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { new: true });
      if (product) {
        try {
          getIO().emit('stock-updated', { productId: item.product, newStock: product.stock });
        } catch (e) {}
      }
    }
    
    // Then, deduct new items from stock
    for (const item of orderItems) {
      const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }, { new: true });
      if (product) {
        try {
          getIO().emit('stock-updated', { productId: item.product, newStock: product.stock });
        } catch (e) {}
      }
    }

    order.orderItems = orderItems;
    order.totalAmount = totalAmount;
    
    const newSnapshot = { orderItems, totalAmount };
    order.modificationLogs.push({
      reason,
      previousSnapshot,
      newSnapshot
    });

    const updatedOrder = await order.save();
    
    try {
      getIO().to(order.customer.toString()).emit('order-modified', updatedOrder);
      getIO().to('admin-room').emit('order-modified', updatedOrder);
      if (order.deliveryPartner) {
        getIO().to(order.deliveryPartner.toString()).emit('order-modified', updatedOrder);
      }
    } catch (e) {}

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

/**
 * @desc    Cancel delivery (Delivery Partner)
 * @route   PUT /api/orders/:id/cancel-delivery
 * @access  Private/Delivery
 */
const cancelDelivery = async (req, res) => {
  const { reason } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  
  if (!reason) {
    res.status(400);
    throw new Error('Cancellation reason is required');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    if (order.deliveryPartner && order.deliveryPartner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to cancel this delivery');
    }
    
    const deliveryPartnerId = order.deliveryPartner;

    order.deliveryPartner = null;
    order.status = 'Pending';
    order.deliveryCancellationReason = reason;
    if (image) {
      order.deliveryCancellationImage = image;
    }
    
    if (!order.cancelledBy) {
      order.cancelledBy = [];
    }
    if (!order.cancelledBy.includes(deliveryPartnerId)) {
      order.cancelledBy.push(deliveryPartnerId);
    }

    const updatedOrder = await order.save();
    
    // Increment cancelled deliveries stat
    if (deliveryPartnerId) {
      await User.findByIdAndUpdate(deliveryPartnerId, {
        $inc: { 'stats.cancelledDeliveries': 1 }
      });
    }
    
    try {
      getIO().to('admin-room').emit('delivery-cancelled', { order: updatedOrder, partner: req.user.name, reason });
      const Notification = (await import('../models/Notification.js')).default;
      const newNotif = await Notification.create({
        message: `order "${order.orderId}" is cancelled by ${req.user.name} (${req.user.partnerId || 'Pending'})`,
        type: 'Delivery',
        relatedId: order._id,
        targetRole: 'admin',
        link: `/admin?assignOrder=${order._id}`
      });
      getIO().to('admin-room').emit('new-notification', newNotif);
    } catch (e) {}

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

export {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  assignDeliveryPartner,
  getAssignedOrders,
  updateOrderStatus,
  verifyDeliveryOTP,
  cancelOrder,
  modifyOrder,
  cancelDelivery,
  getOrderCounts
};
