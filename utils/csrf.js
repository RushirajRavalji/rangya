import Tokens from 'csrf';
import cookie from 'cookie';
import crypto from 'crypto';

// Create a new instance of the CSRF token generator
const tokens = new Tokens();

// CSRF token secret - from environment variable or generate a random one
const SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

// If CSRF secret is not set in environment, warn but continue with generated secret
if (!process.env.CSRF_SECRET) {
  console.warn("CSRF_SECRET environment variable is not set. Using a randomly generated secret for this session.");
  console.warn("For production, set a permanent CSRF_SECRET in your environment variables.");
}

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600 // 1 hour
};

/**
 * Generate a new CSRF token and set it in a cookie
 * @param {object} res - Response object to set the cookie
 * @returns {string} - The generated CSRF token
 */
export function generateToken(res) {
  // Create a new CSRF token
  const csrfToken = tokens.create(SECRET);
  
  // Set the token in a cookie with secure options
  res.setHeader('Set-Cookie', cookie.serialize('csrfToken', csrfToken, COOKIE_OPTIONS));
  
  return csrfToken;
}

/**
 * Verify a CSRF token against the one stored in the cookie
 * @param {object} req - Request object containing the token and cookies
 * @returns {boolean} - Whether the token is valid
 */
export function verifyToken(req) {
  // Get the token from the request body, header, or query parameter
  const token = req.body?.csrfToken || 
                req.headers['x-csrf-token'] || 
                req.query?.csrfToken;
  
  // Get the token from the cookie
  const cookies = cookie.parse(req.headers.cookie || '');
  const cookieToken = cookies.csrfToken;
  
  // If either token is missing, validation fails
  if (!token || !cookieToken) {
    console.error('CSRF validation failed: token or cookieToken is missing', { 
      hasToken: !!token, 
      hasCookieToken: !!cookieToken 
    });
    return false;
  }
  
  // Verify the token against the one in the cookie
  try {
    return tokens.verify(SECRET, cookieToken, token);
  } catch (error) {
    console.error('CSRF token verification error:', error);
    return false;
  }
}

/**
 * Alias for verifyToken - used in some API routes
 * @param {object} req - Request object containing the token and cookies
 * @returns {boolean} - Whether the token is valid
 */
export function validateCSRFToken(req) {
  return verifyToken(req);
}

/**
 * Middleware to verify CSRF token for API routes
 * @param {function} handler - The API route handler
 * @returns {function} - Middleware function that verifies CSRF token
 */
export function csrfProtection(handler) {
  return (req, res) => {
    // Skip CSRF check for GET and HEAD requests (they should be idempotent)
    if (req.method === 'GET' || req.method === 'HEAD') {
      return handler(req, res);
    }
    
    // Verify the CSRF token
    if (!verifyToken(req)) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'The form has expired. Please refresh the page and try again.',
        code: 'INVALID_CSRF_TOKEN'
      });
    }
    
    // Token is valid, proceed with the request
    return handler(req, res);
  };
}

/**
 * Apply CSRF protection to all API routes in a directory
 * @param {Object} handlers - Object with API route handlers
 * @returns {Object} - Object with protected API route handlers
 */
export function protectApiRoutes(handlers) {
  const protectedHandlers = {};
  
  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      protectedHandlers[key] = csrfProtection(handler);
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
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

export default {
  generateToken,
  verifyToken,
  validateCSRFToken,
  csrfProtection,
  protectApiRoutes,
  fetchCsrfToken
}; 