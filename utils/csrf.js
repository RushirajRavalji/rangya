import { serialize, parse } from 'cookie';
import crypto from 'crypto';

// Constants
const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_BODY_FIELD = 'csrfToken';
const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

/**
 * Generate a secure CSRF token
 * @returns {string} - Generated CSRF token
 */
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Set CSRF token cookie in response
 * @param {Object} res - Response object
 * @returns {string} - Generated CSRF token
 */
export const setCSRFCookie = (res) => {
  const token = generateCSRFToken();
  
  // Set cookie with secure options
  res.setHeader('Set-Cookie', serialize(CSRF_TOKEN_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY
  }));
  
  return token;
};

/**
 * Get CSRF token from request cookies
 * @param {Object} req - Request object
 * @returns {string|null} - CSRF token or null if not found
 */
export const getCSRFToken = (req) => {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  return cookies[CSRF_TOKEN_COOKIE] || null;
};

/**
 * Validate CSRF token in request
 * @param {Object} req - Request object
 * @returns {string|null} - Error message or null if valid
 */
export const validateCSRFToken = (req) => {
  // Skip validation for non-mutation methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return null;
  }
  
  // Get token from cookie
  const cookieToken = getCSRFToken(req);
  if (!cookieToken) {
    return 'CSRF token cookie missing';
  }
  
  // Get token from request header or body
  const headerToken = req.headers[CSRF_HEADER];
  const bodyToken = req.body?.[CSRF_BODY_FIELD];
  const requestToken = headerToken || bodyToken;
  
  if (!requestToken) {
    return 'CSRF token not provided in request';
  }
  
  // Compare tokens
  if (cookieToken !== requestToken) {
    return 'CSRF token validation failed';
  }
  
  return null;
};

/**
 * CSRF protection middleware for API routes
 * @param {Function} handler - API route handler
 * @returns {Function} - Wrapped handler with CSRF protection
 */
export const withCSRFProtection = (handler) => {
  return async (req, res) => {
    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req, res);
    }
    
    // Validate CSRF token
    const csrfError = validateCSRFToken(req);
    if (csrfError) {
      console.error('CSRF validation failed:', {
        error: csrfError,
        path: req.url,
        method: req.method,
        hasToken: !!req.headers[CSRF_HEADER] || !!req.body?.[CSRF_BODY_FIELD],
        hasCookies: !!req.headers.cookie
      });
      
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'Security validation failed. Please refresh the page and try again.'
      });
    }
    
    // Continue to handler
    return handler(req, res);
  };
};

// ADD THIS LINE - This is what was missing!
export const csrfProtection = withCSRFProtection;

/**
 * Apply CSRF protection to all API routes in a directory
 * @param {Object} handlers - Object with API route handlers
 * @returns {Object} - Object with protected API route handlers
 */
export function protectApiRoutes(handlers) {
  const protectedHandlers = {};
  
  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      protectedHandlers[key] = withCSRFProtection(handler);
    } else {
      protectedHandlers[key] = handler;
    }
  });
  
  return protectedHandlers;
}

/**
 * Generate a CSRF token for client-side use
 * @returns {Promise<string>} - Promise resolving to CSRF token
 */
export async function fetchCsrfToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    console.log('Fetching CSRF token from /api/auth/csrf...');
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('CSRF token fetch failed with status:', response.status);
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.csrfToken) {
      console.error('CSRF token missing in response');
      throw new Error('CSRF token missing in response');
    }
    
    console.log('CSRF token fetched successfully');
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

export default {
  generateCSRFToken,
  setCSRFCookie,
  getCSRFToken,
  validateCSRFToken,
  withCSRFProtection,
  csrfProtection,  // ADD THIS TO DEFAULT EXPORT TOO
  protectApiRoutes,
  fetchCsrfToken
};