import express from 'express';
import { 
  getNotifications, 
  markNotificationRead, 
  markNotificationClicked,
  deleteNotification, 
  deleteReadNotifications, 
  deleteAllNotifications,
  saveFCMToken,
  getNotificationAnalytics
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/analytics', protect, admin, asyncHandler(getNotificationAnalytics));
router.get('/', protect, asyncHandler(getNotifications));
router.post('/token', protect, asyncHandler(saveFCMToken));
router.delete('/read', protect, asyncHandler(deleteReadNotifications));
router.delete('/all', protect, asyncHandler(deleteAllNotifications));
router.put('/:id/read', protect, asyncHandler(markNotificationRead));
router.put('/:id/click', protect, asyncHandler(markNotificationClicked));
router.delete('/:id', protect, asyncHandler(deleteNotification));

export default router;
