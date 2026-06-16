import express from 'express';
import {
  createSettlement,
  getMySettlements,
  getSettlements,
  verifySettlement,
  getSettlementReport,
  adminSubmitSettlement,
} from '../controllers/settlementController.js';
import { protect, admin, delivery } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.route('/admin-submit').post(protect, admin, asyncHandler(adminSubmitSettlement));
router.route('/report').get(protect, admin, asyncHandler(getSettlementReport));
router.route('/').post(protect, delivery, asyncHandler(createSettlement)).get(protect, admin, asyncHandler(getSettlements));
router.route('/my').get(protect, delivery, asyncHandler(getMySettlements));
router.route('/:id/verify').put(protect, admin, asyncHandler(verifySettlement));

export default router;
