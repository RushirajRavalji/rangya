/**
 * A simple in-memory rate limiter for Next.js API routes
 * Adapted from Next.js examples
 */

import { LRUCache } from 'lru-cache';

/**
 * Creates a rate limiter
 * @param {Object} options - Rate limiter options
 * @param {number} options.interval - Time window in milliseconds
 * @param {number} options.limit - Maximum number of requests per interval
 * @param {number} options.uniqueTokenPerInterval - Max number of unique tokens to track
 * @returns {Object} - Rate limiter instance
 */
const rateLimit = (options) => {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    /**
     * Check if the request should be rate limited
     * @param {Object} res - Response object
     * @param {number} limit - Limit for this specific check
     * @param {string} token - Token to identify the requester (e.g., IP address)
     * @returns {Promise<void>}
     */
    check: (res, limit, token) =>
      new Promise((resolve, reject) => {
        // Get client IP for rate limiting
        const clientIp = 
          (res.req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
          res.req.connection.remoteAddress;
        
        // Create a unique token per client
        const tokenKey = token ? `${clientIp}:${token}` : clientIp;
        
        // Get current count for this token
        const tokenCount = tokenCache.get(tokenKey) || 0;
        
        // Check if token count exceeds limit
        if (tokenCount >= (limit || options.limit)) {
          // Set rate limit headers
          res.setHeader('X-RateLimit-Limit', limit || options.limit);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('Retry-After', Math.floor(options.interval / 1000));
          
          // Reject with 429 Too Many Requests
          return reject(new Error('Too many requests. Please try again later.'));
        }
        
        // Increment token count
        tokenCache.set(tokenKey, tokenCount + 1);
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit || options.limit);
        res.setHeader('X-RateLimit-Remaining', (limit || options.limit) - tokenCount - 1);
        
        // Request is allowed
        return resolve();
      }),
  };
};

export default rateLimit; 