import express from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/storeSettingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.route('/').get(asyncHandler(getStoreSettings)).put(protect, admin, asyncHandler(updateStoreSettings));

export default router;
