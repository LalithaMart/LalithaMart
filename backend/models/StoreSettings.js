/**
 * @module StoreSettingsModel
 * @description Mongoose schema and model for StoreSettings
 */
import mongoose from 'mongoose';

const storeSettingsSchema = mongoose.Schema(
  {
    storeName: { type: String, default: 'Lalitha Mart' },
    description: { type: String, default: 'Your trusted grocery delivery partner.' },
    gstNumber: { type: String, default: '' },
    openingHours: { type: String, default: '09:00 AM' },
    closingHours: { type: String, default: '09:00 PM' },
    phone: { type: String, default: '+91 9876543210' },
    altPhone: { type: String, default: '' },
    email: { type: String, default: 'support@lalithamart.com' },
    supportEmail: { type: String, default: 'help@lalithamart.com' },
    address: {
      street: { type: String, default: '123 Grocery Street' },
      city: { type: String, default: 'Hyderabad' },
      state: { type: String, default: 'Telangana' },
      postalCode: { type: String, default: '500001' },
      country: { type: String, default: 'India' },
      landmark: { type: String, default: 'Near Main Plaza' },
    },
    location: {
      lat: { type: Number, default: 17.3850 },
      lng: { type: Number, default: 78.4867 },
    },
    socialMedia: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },
    logoUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);

export default StoreSettings;
