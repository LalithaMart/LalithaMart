import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryPriorities,
} from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Wrap async handlers
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lalitha_mart/categories',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

router.route('/priority')
  .put(protect, admin, asyncHandler(updateCategoryPriorities));

import { cacheRoute } from '../middleware/cacheMiddleware.js';

router.route('/')
  .get(cacheRoute(3600), asyncHandler(getCategories)) // Cache categories for 1 hour
  .post(protect, admin, upload.single('image'), asyncHandler(createCategory));

router.route('/:id')
  .put(protect, admin, upload.single('image'), asyncHandler(updateCategory))
  .delete(protect, admin, asyncHandler(deleteCategory));

export default router;
