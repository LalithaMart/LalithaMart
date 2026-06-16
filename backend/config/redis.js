import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

const redisOptions = {
  host: redisHost,
  port: redisPort,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null, // Don't crash Node on failed commands when Redis is down
  enableOfflineQueue: false, // Drop commands instead of queuing if Redis is offline
};

// Primary Redis client for standard caching/storage (fast fail if offline)
export const redisClient = new Redis(redisOptions);

// Redis client for Socket.IO Subscriptions (allow queueing so adapter doesn't crash)
const pubSubOptions = {
  host: redisHost,
  port: redisPort,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null, 
  enableOfflineQueue: true, 
};

export const pubClient = new Redis(pubSubOptions);
export const subClient = pubClient.duplicate();

redisClient.on('connect', () => {
  console.log(`Redis Connected: ${redisHost}:${redisPort}`);
});

redisClient.on('error', (err) => {
  console.error('Redis Connection Error (Primary):', err.message);
});

pubClient.on('error', (err) => {
  console.error('Redis Connection Error (Pub):', err.message);
});

subClient.on('error', (err) => {
  console.error('Redis Connection Error (Sub):', err.message);
});

export default redisClient;
