import express from 'express';
import { createStockAlert, checkStockAlert, removeStockAlert, getMyAlerts } from '../controllers/stockAlertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/my-alerts', protect, asyncHandler(getMyAlerts));
router.post('/', protect, asyncHandler(createStockAlert));
router.get('/check/:productId', protect, asyncHandler(checkStockAlert));
router.delete('/:productId', protect, asyncHandler(removeStockAlert));

export default router;
