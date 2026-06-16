import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

export const useWishlistStore = create((set, get) => ({
  wishlistIds: [],
  wishlistItems: [],
  loading: false,

  fetchWishlist: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    
    set({ loading: true });
    try {
      const { data } = await api.get('/wishlist');
      if (data && data.products) {
        set({
          wishlistItems: data.products.map(p => p.product),
          wishlistIds: data.products.map(p => p.product._id),
        });
      }
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
    } finally {
      set({ loading: false });
    }
  },

  toggleWishlist: async (productId) => {
    const { user } = useAuthStore.getState();
    if (!user) return false;

    try {
      // Optimistic update
      const currentIds = get().wishlistIds;
      const isCurrentlyWishlisted = currentIds.includes(productId);
      
      set({ 
        wishlistIds: isCurrentlyWishlisted 
          ? currentIds.filter(id => id !== productId)
          : [...currentIds, productId]
      });

      const { data } = await api.post('/wishlist/toggle', { productId });
      set({ wishlistIds: data });
      
      // Update full items list if removing
      if (isCurrentlyWishlisted) {
        set({ wishlistItems: get().wishlistItems.filter(item => item._id !== productId) });
      } else {
        // Refetch to get populated product data if adding
        get().fetchWishlist();
      }
      return true;
    } catch (error) {
      console.error('Failed to toggle wishlist', error);
      // Revert optimistic update
      get().fetchWishlist();
      return false;
    }
  },

  clearWishlistStore: () => {
    set({ wishlistIds: [], wishlistItems: [] });
  }
}));
