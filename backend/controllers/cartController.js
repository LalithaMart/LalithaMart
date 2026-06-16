import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

/**
 * @desc    Get user cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }
  
  res.json(cart);
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

  let newQuantity = quantity;
  if (existingItemIndex >= 0) {
    newQuantity = cart.items[existingItemIndex].quantity + quantity;
  }

  if (newQuantity > product.stock) {
    try {
      const { getIO } = await import('../config/socket.js');
      const Notification = (await import('../models/Notification.js')).default;
      const notif = await Notification.create({
        message: `High Demand: Customer tried to add ${newQuantity} of ${product.name} but only ${product.stock} in stock.`,
        type: 'System',
        relatedId: product._id,
        targetRole: 'admin'
      });
      getIO().to('admin-room').emit('new-notification', notif);
    } catch(e) {}
    res.status(400);
    throw new Error(`We only have ${product.stock} items available right now.`);
  }

  if (existingItemIndex >= 0) {
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  cart = await cart.populate('items.product');

  res.json(cart);
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/:itemId
 * @access  Private
 */
const updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    const item = cart.items.find(i => i._id.toString() === req.params.itemId || i.product.toString() === req.params.itemId);
    if (item) {
      const product = await Product.findById(item.product);
      if (quantity > product.stock) {
        try {
          const { getIO } = await import('../config/socket.js');
          const Notification = (await import('../models/Notification.js')).default;
          const notif = await Notification.create({
            message: `High Demand: Customer tried to add ${quantity} of ${product.name} but only ${product.stock} in stock.`,
            type: 'System',
            relatedId: product._id,
            targetRole: 'admin'
          });
          getIO().to('admin-room').emit('new-notification', notif);
        } catch(e) {}
        res.status(400);
        throw new Error(`We only have ${product.stock} items available right now.`);
      }
      item.quantity = quantity;
      await cart.save();
      const updatedCart = await cart.populate('items.product');
      res.json(updatedCart);
    } else {
      res.status(404);
      throw new Error('Item not found in cart');
    }
  } else {
    res.status(404);
    throw new Error('Cart not found');
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/:itemId
 * @access  Private
 */
const removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    const itemIndex = cart.items.findIndex(i => i._id.toString() === req.params.itemId || i.product.toString() === req.params.itemId);
    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      const updatedCart = await cart.populate('items.product');
      res.json(updatedCart);
    } else {
      res.status(404);
      throw new Error('Item not found in cart');
    }
  } else {
    res.status(404);
    throw new Error('Cart not found');
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    cart.items = [];
    await cart.save();
    res.json({ message: 'Cart cleared' });
  } else {
    res.status(404);
    throw new Error('Cart not found');
  }
};

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
