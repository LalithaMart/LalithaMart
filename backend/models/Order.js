import mongoose from 'mongoose';

/**
 * Order Item Sub-schema
 * Represents individual products in an order
 */
const orderItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
});

/**
 * Order Schema
 * Represents customer orders, including delivery tracking and snapshots.
 */
const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [orderItemSchema],
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      landmark: { type: String },
      location: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'Cash', 'UPI', 'Online'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0.0,
    },
    deliveryFeeApplied: {
      type: Number,
      default: 0,
    },
    deliveryFeeSource: {
      type: String,
      enum: ['Global', 'Individual'],
      default: 'Global',
    },
    freeDeliveryApplied: {
      type: Boolean,
      default: false,
    },
    partnerEarningApplied: {
      type: Number,
      default: 0,
    },
    partnerEarningSource: {
      type: String,
      enum: ['Global', 'Individual'],
      default: 'Global',
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Assigned', 'Packed', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deliveryOTP: {
      type: String,
    },
    invoiceId: {
      type: String,
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    orderId: {
      type: String,
      unique: true,
    },
    cancelReason: {
      type: String,
    },
    deliveryCancellationReason: {
      type: String,
    },
    deliveryCancellationImage: {
      type: String,
    },
    cancelledBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    modificationLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, required: true },
        previousSnapshot: { type: mongoose.Schema.Types.Mixed },
        newSnapshot: { type: mongoose.Schema.Types.Mixed },
      }
    ]
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ deliveryPartner: 1, status: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
