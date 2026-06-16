import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.route('/')
  .get(protect, asyncHandler(getCart))
  .post(protect, asyncHandler(addToCart))
  .delete(protect, asyncHandler(clearCart));

router.route('/:itemId')
  .put(protect, asyncHandler(updateCartItem))
  .delete(protect, asyncHandler(removeFromCart));

export default router;
