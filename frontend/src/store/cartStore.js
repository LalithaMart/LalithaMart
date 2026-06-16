import { create } from 'zustand';
import api from '../services/api';

export const useCartStore = create((set) => ({
  items: [],
  total: 0,
  loading: false,
  fetchCart: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.totalAmount, loading: false });
    } catch (error) {
      console.error('Failed to fetch cart', error);
      set({ loading: false });
    }
  },
  addToCart: async (productId, quantity = 1) => {
    try {
      await api.post('/cart', { productId, quantity });
      // Refetch cart after adding
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.totalAmount });
      return true;
    } catch (error) {
      console.error('Failed to add to cart', error);
      throw error;
    }
  },
  updateQuantity: async (productId, quantity) => {
    try {
      await api.put(`/cart/${productId}`, { quantity });
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.totalAmount });
    } catch (error) {
      console.error('Failed to update quantity', error);
      throw error;
    }
  },
  removeFromCart: async (productId) => {
    try {
      await api.delete(`/cart/${productId}`);
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.totalAmount });
    } catch (error) {
      console.error('Failed to remove from cart', error);
      throw error;
    }
  },
  clearCart: async () => {
    try {
      await api.delete('/cart');
      const { data } = await api.get('/cart');
      set({ items: data.items, total: data.totalAmount });
    } catch (error) {
      console.error('Failed to clear cart', error);
      throw error;
    }
  }
}));
