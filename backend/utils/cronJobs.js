import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

// Run every 12 hours
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export const initCronJobs = () => {
  
  setInterval(async () => {
    try {
      console.log('🔄 Running scheduled engagement jobs...');
      
      const now = new Date();
      const io = getIO();

      // 1. Cart Abandonment Notifications
      // Find carts updated more than 24 hours ago, but less than 48 hours ago
      const abandonedThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const abandonedCarts = await Cart.find({
        updatedAt: { $lt: abandonedThreshold, $gte: staleThreshold },
        'items.0': { $exists: true }
      }).populate('user');

      for (const cart of abandonedCarts) {
        if (!cart.user) continue;
        
        // Ensure we haven't already notified them recently
        const recentNotification = await Notification.findOne({
          userId: cart.user._id,
          type: 'Cart',
          createdAt: { $gt: staleThreshold }
        });

        if (!recentNotification) {
          const notification = await Notification.create({
            title: 'Your cart misses you 😔',
            message: 'Complete your order before your items go out of stock!',
            type: 'Cart',
            userId: cart.user._id,
            link: '/cart',
            targetRole: 'specific'
          });
          io.to(cart.user._id.toString()).emit('new-notification', notification);
        }
      }

      // 2. Wishlist Engagement Notifications
      // Find active wishlists with products
      const activeWishlists = await Wishlist.find({
        'products.0': { $exists: true }
      }).populate('user');

      for (const wishlist of activeWishlists) {
        if (!wishlist.user) continue;

        // Ensure we haven't spammed wishlist notifications
        const recentWishlistNotification = await Notification.findOne({
          userId: wishlist.user._id,
          type: 'Wishlist',
          createdAt: { $gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // 7 days
        });

        if (!recentWishlistNotification) {
          const notification = await Notification.create({
            title: 'Wishlist Reminder ❤️',
            message: `Your favorite products are waiting! Grab them before they sell out.`,
            type: 'Wishlist',
            userId: wishlist.user._id,
            link: '/wishlist',
            targetRole: 'specific'
          });
          io.to(wishlist.user._id.toString()).emit('new-notification', notification);
        }
      }

    } catch (error) {
      console.error('Error running cron jobs:', error);
    }
  }, TWELVE_HOURS);
};
