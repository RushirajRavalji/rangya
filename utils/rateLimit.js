/**
 * A simple in-memory rate limiter for Next.js API routes
 * Adapted from Next.js examples
 */

import { LRUCache } from 'lru-cache';
import { createError } from './errorHandler';

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

// In-memory storage for rate limiting
const rateLimitStore = new Map();

/**
 * Rate limit configuration presets
 */
const RATE_LIMIT_PRESETS = {
  // Strict limits for authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per window
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // Standard limits for API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per window
    message: 'Too many requests. Please try again later.'
  },
  
  // Limits for checkout/order creation
  CHECKOUT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per window
    message: 'Too many checkout attempts. Please try again in a minute.'
  },
  
  // Limits for user content creation (reviews, etc.)
  CONTENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per window
    message: "You're submitting content too quickly. Please slow down."
  }
};

/**
 * Clean up expired rate limit entries
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupRateLimitStore, 60 * 1000);

/**
 * Get client IP address from request
 * @param {Object} req - Request object
 * @returns {string} - Client IP address
 */
const getClientIp = (req) => {
  // Get IP from various headers that might be set by proxies
  return (req.headers && req.headers['x-forwarded-for']?.split(',')[0].trim()) ||
         (req.headers && req.headers['x-real-ip']) ||
         (req.connection && req.connection.remoteAddress) ||
         '0.0.0.0';
};

/**
 * Create a rate limiter for Next.js API routes
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests per window
 * @param {string} options.message - Error message when rate limited
 * @param {Function} options.keyGenerator - Function to generate key for rate limiting
 * @returns {Function} - Rate limiter function for Next.js
 */
export const createRateLimiter = (options = {}) => {
  // Use preset if specified
  const preset = options.preset ? RATE_LIMIT_PRESETS[options.preset] : null;
  
  // Merge options with preset or defaults
  const config = {
    windowMs: options.windowMs || preset?.windowMs || 60 * 1000, // Default: 1 minute
    maxRequests: options.maxRequests || preset?.maxRequests || 60, // Default: 60 requests per minute
    message: options.message || preset?.message || 'Too many requests. Please try again later.',
    keyGenerator: options.keyGenerator || ((req) => getClientIp(req))
  };
  
  // Return a function that can be used in Next.js API routes
  return async (req, res) => {
    // Generate key for this request
    const key = config.keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry if none exists or if window has expired
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, entry);
    }
    
    // Increment request count
    entry.count += 1;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      // Calculate retry-after time in seconds
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      
      const error = createError('RATE_LIMIT', config.message);
      throw new Error(config.message);
    }
    
    // Rate limit check passed
    return true;
  };
};

/**
 * Helper function to apply rate limiting in Next.js API routes
 * @param {Function} rateLimiter - Rate limiter function
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {Promise<boolean>} - True if allowed, throws error if rate limited
 */
export const applyRateLimit = async (rateLimiter, req, res) => {
  try {
    return await rateLimiter(req, res);
  } catch (error) {
    res.status(429).json({
      error: 'RATE_LIMIT',
      message: error.message
    });
    throw error;
  }
};

/**
 * Pre-configured rate limiters for Next.js API routes
 */
export const apiRateLimit = createRateLimiter({
  preset: 'API'
});

export const authRateLimit = createRateLimiter({
  preset: 'AUTH'
});

export const checkoutRateLimit = createRateLimiter({
  preset: 'CHECKOUT'
});

export const contentRateLimit = createRateLimiter({
  preset: 'CONTENT'
});

export default {
  createRateLimiter,
  applyRateLimit,
  apiRateLimit,
  authRateLimit,
  checkoutRateLimit,
  contentRateLimit
};