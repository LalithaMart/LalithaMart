import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './redis.js';
import User from '../models/User.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    adapter: createAdapter(pubClient, subClient)
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Clients will emit 'join' with their user ID and role
    socket.on('join', ({ userId, role }) => {
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
      }
      if (role === 'admin') {
        socket.join('admin-room');
        console.log(`Socket ${socket.id} joined admin-room`);
      }
    });

    // Location update from delivery partner
    socket.on('location-update', async (data) => {
      // Global broadcast so Admin and Customer can track in real-time.
      // Frontend components filter by partnerId.
      io.emit('partner-location-update', data);
      
      // Save to database so initial loads fetch the correct location
      try {
        if (data.partnerId) {
          await User.findByIdAndUpdate(data.partnerId, {
            liveLocation: { lat: data.lat, lng: data.lng, updatedAt: Date.now() }
          });
        }
      } catch (err) {
        console.error('Failed to update live location in DB via socket:', err);
      }
    });

    // Join specific order room (for customers tracking an order)
    socket.on('track-order', (orderId) => {
      socket.join(`order-${orderId}`);
      console.log(`Socket ${socket.id} joined tracking for order-${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
