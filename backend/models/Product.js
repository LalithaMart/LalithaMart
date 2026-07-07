/**
 * @module ProductModel
 * @description Mongoose schema and model for Product
 */
import mongoose from 'mongoose';

const productSchema = mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative']
    },
    priority: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: 'pcs',
    },
    sku: {
      type: String,
    },
    images: [
      {
        type: String,
        required: true,
      }
    ],
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    rating: {
      type: Number,
      default: 0,
    },
    isOnHold: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ category: 1, priority: -1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ priority: -1, rating: -1 });

productSchema.pre('save', function(next) {
  if (this.discountPrice > this.price) {
    next(new Error('Discount price cannot exceed actual price'));
  } else {
    next();
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;
