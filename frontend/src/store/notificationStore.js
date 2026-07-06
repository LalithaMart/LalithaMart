import { create } from 'zustand';
import api from '../services/api';
import { useUIStore } from './uiStore';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/notifications');
      set({ 
        notifications: data,
        unreadCount: data.filter(n => !n.isRead).length
      });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set(state => {
        const updated = state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAsClicked: async (id) => {
    try {
      await api.put(`/notifications/${id}/click`);
      set(state => {
        const updated = state.notifications.map(n => n._id === id ? { ...n, isRead: true, isClicked: true } : n);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as clicked', error);
    }
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      set(state => {
        const updated = state.notifications.filter(n => n._id !== id);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
      useUIStore.getState().showToast('Notification removed', 'success');
    } catch (error) {
      useUIStore.getState().showToast('Failed to delete notification', 'error');
    }
  },

  clearAllRead: async () => {
    try {
      await api.delete('/notifications/read');
      set(state => {
        const updated = state.notifications.filter(n => !n.isRead);
        return { notifications: updated };
      });
      useUIStore.getState().showToast('Read notifications cleared', 'success');
    } catch (error) {
      useUIStore.getState().showToast('Failed to clear notifications', 'error');
    }
  },

  clearAll: async () => {
    try {
      await api.delete('/notifications/all');
      set({ notifications: [], unreadCount: 0 });
      useUIStore.getState().showToast('All notifications cleared', 'success');
    } catch (error) {
      useUIStore.getState().showToast('Failed to clear notifications', 'error');
    }
  },

  addRealtimeNotification: (notification) => {
    set(state => {
      // Avoid duplicates
      if (state.notifications.some(n => n._id === notification._id)) return state;
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.isRead).length
      };
    });
    
    // Play a sound or show a toast
    useUIStore.getState().showToast(notification.title || notification.message, 'info');
  }
}));
