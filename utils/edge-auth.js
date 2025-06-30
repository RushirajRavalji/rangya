/**
 * Edge-compatible authentication utilities
 * This module provides authentication functions that work in Edge Runtime
 */

import * as jose from 'jose';

/**
 * Verify a JWT token in Edge Runtime
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export const verifyJWT = async (token) => {
  if (!token) return null;
  
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'development_fallback_secret_do_not_use_in_production_12345';
    
    // Convert secret to Uint8Array for jose
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    
    // Verify and decode the token
    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256']
    });
    
    return payload;
  } catch (error) {
    console.error('JWT verification error in Edge Runtime:', error.message);
    return null;
  }
};

export default {
  verifyJWT
}; 