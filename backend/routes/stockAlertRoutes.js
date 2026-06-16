import express from 'express';
import { createStockAlert, checkStockAlert, removeStockAlert, getMyAlerts } from '../controllers/stockAlertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-alerts', protect, getMyAlerts);
router.post('/', protect, createStockAlert);
router.get('/check/:productId', protect, checkStockAlert);
router.delete('/:productId', protect, removeStockAlert);

export default router;
