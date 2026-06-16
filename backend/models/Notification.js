/**
 * @module NotificationModel
 * @description Mongoose schema and model for Notification
 */
import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Order', 'Stock', 'Delivery', 'Payment', 'System', 'Wishlist', 'Cart', 'Engagement'],
      default: 'System',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isClicked: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetRole: {
      type: String,
      enum: ['admin', 'delivery', 'customer', 'specific'],
      default: 'admin',
    }
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
