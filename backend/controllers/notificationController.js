import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * @desc    Get user notifications (Customer/Delivery/Admin)
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  let query;
  if (req.user.role === 'admin') {
    query = { $or: [{ targetRole: 'admin' }, { userId: req.user._id }], isCleared: { $ne: true } };
  } else {
    query = { userId: req.user._id, isCleared: { $ne: true } };
  }
  
  const notifications = await Notification.find(query).sort({ createdAt: -1 });
  res.json(notifications);
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (notification) {
    // Simple ownership check
    if (notification.userId && notification.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401);
      throw new Error('Not authorized');
    }
    notification.isRead = true;
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
};

/**
 * @desc    Mark notification as clicked (deep link engagement)
 * @route   PUT /api/notifications/:id/click
 * @access  Private
 */
const markNotificationClicked = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (notification) {
    notification.isClicked = true;
    notification.isRead = true; // clicking also reads it
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (notification) {
    if (notification.userId && notification.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401);
      throw new Error('Not authorized');
    }
    notification.isCleared = true;
    await notification.save();
    res.json({ message: 'Notification removed' });
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/notifications/read
 * @access  Private
 */
const deleteReadNotifications = async (req, res) => {
  let query;
  if (req.user.role === 'admin') {
    query = { $or: [{ targetRole: 'admin' }, { userId: req.user._id }], isRead: true };
  } else {
    query = { userId: req.user._id, isRead: true };
  }
  await Notification.updateMany(query, { isCleared: true });
  res.json({ message: 'Read notifications removed' });
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications/all
 * @access  Private
 */
const deleteAllNotifications = async (req, res) => {
  let query;
  if (req.user.role === 'admin') {
    query = { $or: [{ targetRole: 'admin' }, { userId: req.user._id }] };
  } else {
    query = { userId: req.user._id };
  }
  await Notification.updateMany(query, { isCleared: true });
  res.json({ message: 'All notifications removed' });
};

/**
 * @desc    Save FCM push token for user
 * @route   POST /api/notifications/token
 * @access  Private
 */
const saveFCMToken = async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);
  
  if (user) {
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }
    res.json({ message: 'Token saved' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

const getNotificationAnalytics = async (req, res) => {
  const { startDate, endDate, customerFilter, productFilter } = req.query;

  let customersQuery = { role: 'customer' };
  if (customerFilter) {
    customersQuery.name = { $regex: customerFilter, $options: 'i' };
  }
  const customers = await User.find(customersQuery).select('_id');
  const customerIds = customers.map(c => c._id);

  const filter = {
    $or: [
      { targetRole: 'customer' },
      { userId: { $in: customerIds } }
    ]
  };

  if (customerFilter) {
     filter.$or = [ { userId: { $in: customerIds } } ];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  if (productFilter) {
     filter.message = { $regex: productFilter, $options: 'i' };
  }

  const total = await Notification.countDocuments(filter);
  const read = await Notification.countDocuments({ ...filter, isRead: true });
  const clicked = await Notification.countDocuments({ ...filter, isClicked: true });
  
  res.json({ 
    total, 
    read, 
    clicked, 
    readRate: total > 0 ? (read/total)*100 : 0, 
    clickRate: total > 0 ? (clicked/total)*100 : 0 
  });
};

export { 
  getNotifications, 
  markNotificationRead, 
  markNotificationClicked,
  deleteNotification, 
  deleteReadNotifications, 
  deleteAllNotifications,
  saveFCMToken,
  getNotificationAnalytics
};
