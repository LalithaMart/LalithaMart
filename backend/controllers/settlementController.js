import Settlement from '../models/Settlement.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

/**
 * @desc    Submit a new settlement
 * @route   POST /api/settlements
 * @access  Private/Delivery
 */
export const createSettlement = async (req, res) => {
  const { amount, type, notes } = req.body;

  if (amount === undefined || isNaN(amount) || amount <= 0) {
    res.status(400);
    throw new Error('Please enter a valid numeric amount');
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // Compute today's pending cash
  const todayOrders = await Order.find({
    deliveryPartner: req.user._id,
    status: { $in: ['Completed', 'Delivered'] },
    updatedAt: { $gte: start, $lte: end },
    paymentMethod: { $in: ['Cash', 'COD'] }
  });

  const todayCollected = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const todaySettlements = await Settlement.find({
    deliveryPartner: req.user._id,
    createdAt: { $gte: start, $lte: end },
    status: { $in: ['PENDING', 'VERIFIED'] },
    type: 'CASH'
  });

  const todaySubmitted = todaySettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  const pendingForToday = todayCollected - todaySubmitted;

  if (type === 'CASH' && amount > pendingForToday) {
    res.status(400);
    throw new Error(`Amount exceeds today's pending cash (₹${pendingForToday})`);
  }

  const settlement = new Settlement({
    deliveryPartner: req.user._id,
    amount,
    type: type || 'CASH',
    notes,
    status: 'PENDING',
  });

  const createdSettlement = await settlement.save();
  res.status(201).json(createdSettlement);
};

/**
 * @desc    Get settlements for logged in delivery partner
 * @route   GET /api/settlements/my
 * @access  Private/Delivery
 */
export const getMySettlements = async (req, res) => {
  const settlements = await Settlement.find({ deliveryPartner: req.user._id }).sort({ createdAt: -1 });
  res.json(settlements);
};

/**
 * @desc    Get all settlements
 * @route   GET /api/settlements
 * @access  Private/Admin
 */
export const getSettlements = async (req, res) => {
  const settlements = await Settlement.find()
    .populate('deliveryPartner', 'name phone')
    .populate('verifiedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(settlements);
};

/**
 * @desc    Verify/Update settlement status
 * @route   PUT /api/settlements/:id/verify
 * @access  Private/Admin
 */
export const verifySettlement = async (req, res) => {
  const { status, notes } = req.body;
  const settlement = await Settlement.findById(req.params.id);

  if (!settlement) {
    res.status(404);
    throw new Error('Settlement not found');
  }

  if (settlement.status === 'VERIFIED') {
    res.status(400);
    throw new Error('Settlement is already verified');
  }

  settlement.status = status;
  if (notes) settlement.notes = notes;
  
  if (status === 'VERIFIED') {
    settlement.verifiedBy = req.user._id;
    settlement.verifiedAt = Date.now();
  }

  const updatedSettlement = await settlement.save();
  res.json(updatedSettlement);
};

/**
 * @desc    Get settlements report for all delivery partners by date
 * @route   GET /api/settlements/report
 * @access  Private/Admin
 */
export const getSettlementReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let orderFilter = { status: { $in: ['Completed', 'Delivered'] } };
  let settlementFilter = { status: 'VERIFIED' };
  
  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    orderFilter.updatedAt = { $gte: start, $lte: end };
    settlementFilter.verifiedAt = { $gte: start, $lte: end };
  }
  
  const dateRange = (start && end) ? { start, end } : { start: 'All Time', end: 'All Time' };

  // 1. Get all delivery partners and admins
  const partners = await User.find({ role: { $in: ['delivery', 'admin'] } }).select('_id name phone stats partnerId role');

  // 2. Get all completed/delivered orders within the date range
  const orders = await Order.find({
    ...orderFilter,
    deliveryPartner: { $exists: true, $ne: null }
  });

  // 3. Get all verified settlements within the date range
  const settlements = await Settlement.find(settlementFilter);

  // 4. Aggregate data per partner
  const reportMap = {};
  
  // Initialize map
  partners.forEach(partner => {
    reportMap[partner._id.toString()] = {
      partner: partner,
      ordersDelivered: 0,
      cashCollected: 0,
      upiCollected: 0,
      totalCollected: 0,
      pendingCash: 0,
      submittedCash: 0
    };
  });

  // Add order collections
  orders.forEach(order => {
    const partnerId = order.deliveryPartner.toString();
    if (!reportMap[partnerId]) {
      reportMap[partnerId] = {
        partner: { _id: partnerId, name: 'Unknown/Deleted Partner', phone: '-' },
        ordersDelivered: 0,
        cashCollected: 0,
        upiCollected: 0,
        totalCollected: 0,
        pendingCash: 0,
        submittedCash: 0
      };
    }
    
    reportMap[partnerId].ordersDelivered += 1;
    
    const amount = order.totalAmount || 0;
    
    if (order.paymentMethod === 'Cash' || order.paymentMethod === 'COD') {
      reportMap[partnerId].cashCollected += amount;
      reportMap[partnerId].totalCollected += amount;
    } else if (order.paymentMethod === 'UPI') {
      reportMap[partnerId].upiCollected += amount;
      reportMap[partnerId].totalCollected += amount;
    }
  });

  // Add settlements
  settlements.forEach(settlement => {
    const partnerId = settlement.deliveryPartner.toString();
    if (reportMap[partnerId]) {
      reportMap[partnerId].submittedCash += settlement.amount || 0;
    }
  });

  // Calculate pending cash
  Object.values(reportMap).forEach(report => {
    report.pendingCash = Math.max(0, report.cashCollected - report.submittedCash);
  });

  // Convert map to array
  const reportData = Object.values(reportMap);

  res.json({
    dateRange,
    data: reportData
  });
};

/**
 * @desc    Admin submit settlement (Clear pending cash)
 * @route   POST /api/settlements/admin-submit
 * @access  Private/Admin
 */
export const adminSubmitSettlement = async (req, res) => {
  const { partnerId, startDate, endDate } = req.body;

  const partner = await User.findById(partnerId);
  if (!partner || partner.role !== 'delivery') {
    res.status(404);
    throw new Error('Delivery partner not found');
  }

  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  let orderFilter = {
    deliveryPartner: partner._id,
    status: { $in: ['Completed', 'Delivered'] },
    paymentMethod: { $in: ['Cash', 'COD'] }
  };

  let settlementFilter = {
    deliveryPartner: partner._id,
    status: { $in: ['PENDING', 'VERIFIED'] },
    type: 'CASH'
  };

  if (start && end) {
    orderFilter.updatedAt = { $gte: start, $lte: end };
    settlementFilter.createdAt = { $gte: start, $lte: end };
  }

  // Compute pending cash for this partner
  const todayOrders = await Order.find(orderFilter);
  const todayCollected = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const todaySettlements = await Settlement.find(settlementFilter);
  const todaySubmitted = todaySettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  const amountToSettle = todayCollected - todaySubmitted;

  if (amountToSettle <= 0) {
    res.status(400);
    const timeRangeStr = (start && end) ? 'this date range' : 'all time';
    throw new Error(`No pending cash to settle for ${timeRangeStr} for this partner`);
  }

  // Create Verified Settlement Record
  const settlement = new Settlement({
    deliveryPartner: partner._id,
    amount: amountToSettle,
    type: 'CASH',
    status: 'VERIFIED',
    notes: `Admin cleared pending COD cash for ${(startDate && endDate) ? 'selected date range' : 'all time'}`,
    verifiedBy: req.user._id,
    verifiedAt: Date.now()
  });

  await settlement.save();

  try {
    const { getIO } = await import('../config/socket.js');
    getIO().to(`user-${partner._id}`).emit('settlement-updated', {
      message: `₹${amountToSettle} COD cash confirmed by Admin.`
    });
    getIO().to(`user-${partner._id}`).emit('user-updated', partner);
  } catch (e) {}

  res.status(200).json({ message: 'Cash successfully submitted', settlement });
};
