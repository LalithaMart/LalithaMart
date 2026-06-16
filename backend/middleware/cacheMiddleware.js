import { redisClient } from '../config/redis.js';

/**
 * Middleware to cache API responses in Redis.
 * Useful for high-traffic read-heavy endpoints like product catalogs.
 */
export const cacheRoute = (durationInSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    
    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedResponse));
      } else {
        res.setHeader('X-Cache', 'MISS');
        // Hijack res.json to cache the response before sending it
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          redisClient.set(key, JSON.stringify(body), 'EX', durationInSeconds);
          originalJson(body);
        };
        next();
      }
    } catch (error) {
      console.error('Redis Cache Error:', error);
      next(); // Silently fallback to Database on Redis error
    }
  };
};

/**
 * Utility to clear specific cache keys (used after POST/PUT/DELETE operations)
 */
export const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(`__express__${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis Cache Clear Error:', error);
  }
};
