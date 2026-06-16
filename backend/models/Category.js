/**
 * @module CategoryModel
 * @description Mongoose schema and model for Category
 */
import mongoose from 'mongoose';

const categorySchema = mongoose.Schema(
  {
    categoryId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
