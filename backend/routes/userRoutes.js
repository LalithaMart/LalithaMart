import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  approveUser,
  updateLiveLocation,
} from '../controllers/userController.js';
import { registerUser } from '../controllers/authController.js';
import { protect, admin, delivery } from '../middleware/authMiddleware.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.route('/location').put(protect, delivery, asyncHandler(updateLiveLocation));

router.route('/')
  .get(protect, admin, asyncHandler(getUsers))
  .post(protect, admin, asyncHandler(registerUser));

router.route('/profile')
  .get(protect, asyncHandler(getUserProfile))
  .put(protect, asyncHandler(updateUserProfile));

router.route('/:id/approve')
  .put(protect, admin, asyncHandler(approveUser));

router.route('/:id')
  .get(protect, admin, asyncHandler(getUserById))
  .put(protect, admin, asyncHandler(updateUser))
  .delete(protect, admin, asyncHandler(deleteUser));

export default router;
