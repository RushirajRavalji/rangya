/**
 * A simple in-memory rate limiter for Next.js API routes
 * Adapted from Next.js examples
 */

import { LRUCache } from 'lru-cache';

/**
 * Creates a rate limiter that can be used in API routes
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.interval - Time window in milliseconds
 * @param {number} options.limit - Maximum number of requests allowed in the time window
 * @param {number} options.uniqueTokenPerInterval - Maximum number of unique tokens to track
 * @returns {Object} - Rate limiter instance
 */
export function rateLimit(options) {
  const { interval = 60 * 1000, limit = 10, uniqueTokenPerInterval = 500 } = options;
  
  const tokenCache = new LRUCache({
    max: uniqueTokenPerInterval,
    ttl: interval
  });
  
  return {
    /**
     * Check if the request should be rate limited
     * 
     * @param {Object} res - Next.js response object
     * @param {number} requestLimit - Optional override for the limit
     * @param {string} prefix - Optional prefix for the token (e.g. to separate different API endpoints)
     * @returns {Promise<void>}
     * @throws {Error} - If rate limit is exceeded
     */
    check: async (res, requestLimit = limit, prefix = '') => {
      const token = prefix 
        ? `${prefix}_${getIP(res.req)}`
        : getIP(res.req);
      
      const tokenCount = tokenCache.get(token) || [0];
      
      if (tokenCount[0] >= (requestLimit || limit)) {
        res.setHeader('Retry-After', Math.floor(interval / 1000));
        res.setHeader('X-RateLimit-Limit', requestLimit || limit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Date.now() + interval);
        
        throw new Error('Rate limit exceeded');
      }
      
      tokenCount[0] += 1;
      tokenCache.set(token, tokenCount);
      
      res.setHeader('X-RateLimit-Limit', requestLimit || limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, (requestLimit || limit) - tokenCount[0]));
      res.setHeader('X-RateLimit-Reset', Date.now() + interval);
      
      return;
    },
    
    /**
     * Get current rate limit status for a token
     * 
     * @param {Object} req - Next.js request object
     * @param {string} prefix - Optional prefix for the token
     * @returns {Object} - Rate limit status
     */
    getStatus: (req, prefix = '') => {
      const token = prefix 
        ? `${prefix}_${getIP(req)}`
        : getIP(req);
      
      const tokenCount = tokenCache.get(token) || [0];
      
      return {
        limit: limit,
        current: tokenCount[0],
        remaining: Math.max(0, limit - tokenCount[0]),
        resetTime: Date.now() + interval
      };
    }
  };
}

/**
 * Get the client IP address from a request
 * 
 * @param {Object} req - Next.js request object
 * @returns {string} - IP address
 */
function getIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         '127.0.0.1';
}

export default rateLimit; 