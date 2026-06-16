import express from 'express';
import { getWishlist, toggleWishlistItem } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getWishlist);
router.route('/toggle').post(protect, toggleWishlistItem);

export default router;
