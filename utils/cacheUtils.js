/**
 * Caching utilities for improved performance
 */

// In-memory cache store
const memoryCache = new Map();

/**
 * Set cache item with expiration
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export const setCacheItem = (key, value, ttlSeconds = 300) => {
  const now = Date.now();
  const item = {
    value,
    expiry: now + (ttlSeconds * 1000)
  };
  
  memoryCache.set(key, item);
  return value;
};

/**
 * Get cache item if not expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if expired/not found
 */
export const getCacheItem = (key) => {
  const item = memoryCache.get(key);
  
  // Not in cache
  if (!item) return null;
  
  // Check if expired
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  
  return item.value;
};

/**
 * Delete cache item
 * @param {string} key - Cache key
 */
export const deleteCacheItem = (key) => {
  memoryCache.delete(key);
};

/**
 * Clear all cache
 */
export const clearCache = () => {
  memoryCache.clear();
};

/**
 * Cache API response with fetch wrapper
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @returns {Promise<any>} - Response data
 */
export const cachedFetch = async (url, options = {}, ttlSeconds = 300) => {
  // Don't cache non-GET requests
  if (options.method && options.method !== 'GET') {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
  
  // Generate cache key from URL and options
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;
  
  // Check cache first
  const cachedData = getCacheItem(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  // Fetch fresh data
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  
  // Cache the response
  setCacheItem(cacheKey, data, ttlSeconds);
  
  return data;
};

/**
 * Cache function results
 * @param {Function} fn - Function to cache
 * @param {Array} args - Function arguments
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @returns {Promise<any>} - Function result
 */
export const cachedFunction = async (fn, args = [], ttlSeconds = 300) => {
  // Generate cache key from function name and arguments
  const fnName = fn.name || 'anonymous';
  const cacheKey = `fn:${fnName}:${JSON.stringify(args)}`;
  
  // Check cache first
  const cachedResult = getCacheItem(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Execute function
  const result = await fn(...args);
  
  // Cache the result
  setCacheItem(cacheKey, result, ttlSeconds);
  
  return result;
};

export default {
  setCacheItem,
  getCacheItem,
  deleteCacheItem,
  clearCache,
  cachedFetch,
  cachedFunction
}; 