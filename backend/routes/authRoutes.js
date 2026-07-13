import express from 'express';
import {
  registerUser,
  sendSignupOtp,
  verifySignupOtp,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  impersonateUser,
  reactivateAccount,
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs for auth routes
  message: 'Too many authentication attempts from this IP, please try again in an hour'
});

// Wrap async handlers to catch errors and pass them to error middleware
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/register', authLimiter, asyncHandler(registerUser));
router.post('/send-signup-otp', authLimiter, asyncHandler(sendSignupOtp));
router.post('/verify-signup-otp', authLimiter, asyncHandler(verifySignupOtp));
router.post('/login', authLimiter, asyncHandler(loginUser));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/verify-otp', asyncHandler(verifyOtp));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/impersonate/:id', protect, admin, asyncHandler(impersonateUser));
router.post('/reactivate', asyncHandler(reactivateAccount));

export default router;
