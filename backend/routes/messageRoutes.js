import express from 'express';
import { createMessage, getMessages, updateMessageStatus, deleteMessage } from '../controllers/messageController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// protect middleware can be made optional for createMessage, 
// but since this is for customer/delivery portals, they are logged in.
// We'll use a custom middleware or just allow it with optional auth, or use standard protect.
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const optionalProtect = (req, res, next) => {
  protect(req, res, () => next());
};

router.route('/').post(optionalProtect, asyncHandler(createMessage)).get(protect, admin, asyncHandler(getMessages));
router.route('/:id').delete(protect, admin, asyncHandler(deleteMessage));
router.route('/:id/status').put(protect, admin, asyncHandler(updateMessageStatus));

export default router;
