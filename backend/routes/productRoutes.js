import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  updateProductPriorities,
  getInventoryStats
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

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
    folder: 'lalitha_mart/products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

router.route('/priority')
  .put(protect, admin, asyncHandler(updateProductPriorities));

import { cacheRoute } from '../middleware/cacheMiddleware.js';

router.route('/')
  .get(asyncHandler(getProducts))
  .post(protect, admin, upload.array('images', 5), asyncHandler(createProduct));

router.route('/inventory/stats')
  .get(protect, admin, asyncHandler(getInventoryStats));

router.route('/:id')
  .get(asyncHandler(getProductById))
  .put(protect, admin, upload.array('images', 5), asyncHandler(updateProduct))
  .delete(protect, admin, asyncHandler(deleteProduct));

router.route('/:id/reviews').post(protect, asyncHandler(createProductReview));

export default router;
