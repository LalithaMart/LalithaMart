/**
 * @module OTPModel
 * @description Mongoose schema and model for OTP
 */
import mongoose from 'mongoose';

const otpSchema = mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically delete document when it expires
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
