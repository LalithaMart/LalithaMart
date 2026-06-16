import mongoose from 'mongoose';

/**
 * Settlement Schema
 * Tracks cash/UPI settlements between delivery partners and admins.
 */
const settlementSchema = mongoose.Schema(
  {
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['CASH', 'UPI'],
      default: 'CASH',
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    notes: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;
