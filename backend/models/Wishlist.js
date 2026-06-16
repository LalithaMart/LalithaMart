/**
 * @module WishlistModel
 * @description Mongoose schema and model for Wishlist
 */
import mongoose from 'mongoose';

const wishlistSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      addedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
