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

router.get('/analytics', protect, admin, getNotificationAnalytics);
router.get('/', protect, getNotifications);
router.post('/token', protect, saveFCMToken);
router.delete('/read', protect, deleteReadNotifications);
router.delete('/all', protect, deleteAllNotifications);
router.put('/:id/read', protect, markNotificationRead);
router.put('/:id/click', protect, markNotificationClicked);
router.delete('/:id', protect, deleteNotification);

export default router;
