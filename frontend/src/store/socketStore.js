import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useAuthStore } from './authStore';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  
  connect: () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    if (get().socket) {
      get().socket.disconnect();
    }

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      set({ isConnected: true, socket });
      
      // Join appropriate rooms based on user role
      socket.emit('join', { userId: user._id, role: user.role });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Default listeners for global notifications could go here
    // e.g., socket.on('new-order', ...) 
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
