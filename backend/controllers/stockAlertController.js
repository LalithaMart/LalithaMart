import StockAlert from '../models/StockAlert.js';
import Product from '../models/Product.js';

/**
 * @desc    Register for a stock alert (Notify Me)
 * @route   POST /api/stock-alerts
 * @access  Private
 */
const createStockAlert = async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if an active alert already exists
  const existingAlert = await StockAlert.findOne({
    user: req.user._id,
    product: productId,
    isActive: true
  });

  if (existingAlert) {
    return res.status(400).json({ message: 'You are already subscribed to alerts for this product.' });
  }

  const stockAlert = await StockAlert.create({
    user: req.user._id,
    product: productId,
    isActive: true
  });

  res.status(201).json(stockAlert);
};

/**
 * @desc    Check if user is subscribed to a stock alert
 * @route   GET /api/stock-alerts/check/:productId
 * @access  Private
 */
const checkStockAlert = async (req, res) => {
  const { productId } = req.params;

  const existingAlert = await StockAlert.findOne({
    user: req.user._id,
    product: productId,
    isActive: true
  });

  res.json({ isSubscribed: !!existingAlert });
};

/**
 * @desc    Get all active stock alerts for the logged in user
 * @route   GET /api/stock-alerts/my-alerts
 * @access  Private
 */
const getMyAlerts = async (req, res) => {
  const alerts = await StockAlert.find({ user: req.user._id, isActive: true });
  res.json(alerts.map(a => a.product));
};

/**
 * @desc    Remove a stock alert
 * @route   DELETE /api/stock-alerts/:productId
 * @access  Private
 */
const removeStockAlert = async (req, res) => {
  const { productId } = req.params;

  await StockAlert.findOneAndDelete({
    user: req.user._id,
    product: productId,
    isActive: true
  });

  res.json({ message: 'Alert removed' });
};

export { createStockAlert, checkStockAlert, removeStockAlert, getMyAlerts };
