import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './redis.js';

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
    socket.on('location-update', (data) => {
      // Broadcast location update to the specific order room or admin
      if (data.orderId) {
        socket.to(`order-${data.orderId}`).emit('partner-location', data);
      }
      socket.to('admin-room').emit('partner-location', data);
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
