import express from 'express';
import { getWishlist, toggleWishlistItem } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.route('/').get(protect, asyncHandler(getWishlist));
router.route('/toggle').post(protect, asyncHandler(toggleWishlistItem));

export default router;
