import express from 'express';
import {
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
} from '../controllers/orderController.js';
import { protect, admin, delivery } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.route('/')
  .post(protect, asyncHandler(addOrderItems))
  .get(protect, admin, asyncHandler(getOrders));

router.route('/myorders').get(protect, asyncHandler(getMyOrders));
router.route('/assigned').get(protect, delivery, asyncHandler(getAssignedOrders));

router.route('/counts').get(protect, admin, asyncHandler(getOrderCounts));

router.route('/:id').get(protect, asyncHandler(getOrderById));
router.route('/:id/assign').put(protect, admin, asyncHandler(assignDeliveryPartner));
router.route('/:id/cancel').put(protect, asyncHandler(cancelOrder));
router.route('/:id/modify').put(protect, admin, asyncHandler(modifyOrder));
router.route('/:id/status').put(protect, delivery, asyncHandler(updateOrderStatus));
router.route('/:id/cancel-delivery').put(protect, delivery, upload.single('image'), asyncHandler(cancelDelivery));
router.route('/:id/verify-otp').post(protect, delivery, asyncHandler(verifyDeliveryOTP));

export default router;
