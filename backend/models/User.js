import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Address Schema
 * Sub-schema for user saved addresses.
 */
const addressSchema = mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'India' },
  landmark: { type: String },
  isDefault: { type: Boolean, default: false },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }
});

/**
 * User Schema
 * Represents admins, customers, and delivery partners in the system.
 */
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    email: {
      type: String,
    },
    customerId: {
      type: String,
    },
    partnerId: {
      type: String,
    },
    verifiedId: {
      idType: {
        type: String,
        enum: ['Aadhaar', 'PAN'],
      },
      idNumber: {
        type: String,
      }
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'customer', 'delivery'],
      default: 'customer',
    },
    savedAddresses: [addressSchema],
    // For delivery partners
    isAvailable: {
      type: Boolean,
      default: true,
    },
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalDeliveries: { type: Number, default: 0 },
      successfulDeliveries: { type: Number, default: 0 },
      failedDeliveries: { type: Number, default: 0 },
      cancelledDeliveries: { type: Number, default: 0 },
      dailyDeliveries: { type: Number, default: 0 },
      weeklyDeliveries: { type: Number, default: 0 },
      monthlyDeliveries: { type: Number, default: 0 },
      lastDeliveryDate: { type: Date },
      totalEarnings: { type: Number, default: 0 },
      dailyEarnings: { type: Number, default: 0 },
      weeklyEarnings: { type: Number, default: 0 },
      monthlyEarnings: { type: Number, default: 0 },
      cashCollections: { type: Number, default: 0 },
      upiCollections: { type: Number, default: 0 },
      pendingCashToSubmit: { type: Number, default: 0 },
      submittedCash: { type: Number, default: 0 },
    },
    liveLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date }
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    fcmTokens: [{
      type: String,
    }],
    notificationPreferences: {
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isApproved: 1 });

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
