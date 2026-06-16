import Wishlist from '../models/Wishlist.js';

/**
 * @desc    Get user wishlist
 * @route   GET /api/wishlist
 * @access  Private
 */
export const getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products.product');
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }
  res.json(wishlist);
};

/**
 * @desc    Toggle product in wishlist
 * @route   POST /api/wishlist/toggle
 * @access  Private
 */
export const toggleWishlistItem = async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const existingIndex = wishlist.products.findIndex(p => p.product.toString() === productId);

  if (existingIndex >= 0) {
    // Remove if exists
    wishlist.products.splice(existingIndex, 1);
  } else {
    // Add if not exists
    wishlist.products.push({ product: productId });
  }

  await wishlist.save();
  res.json(wishlist.products.map(p => p.product));
};
