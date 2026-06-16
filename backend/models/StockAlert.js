/**
 * @module StockAlertModel
 * @description Mongoose schema and model for StockAlert
 */
import mongoose from 'mongoose';

const stockAlertSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

const StockAlert = mongoose.model('StockAlert', stockAlertSchema);

export default StockAlert;
