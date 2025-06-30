import { NextResponse } from 'next/server';
import { verifyJWT } from './utils/edge-auth';

/**
 * Middleware for authentication checking and security headers
 */
export async function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/reset-password',
    '/verify-email',
    '/auth-diagnostic',
    '/api/auth',
    '/api/auth/csrf',
    '/api/check-auth',
    '/api/check-firebase',
    '/_next/',
    '/favicon.ico',
    '/images/',
    '/public/',
    '/products',
    '/',
  ];
  
  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  );
  
  // Get the authentication token from cookies
  const authToken = request.cookies.get('firebase-auth-token')?.value;
  const jwtToken = request.cookies.get('jwt-token')?.value;
  
  // If path is protected and tokens are missing, redirect to login
  if (!isPublicPath && (!authToken || !jwtToken)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  
  // Verify JWT token for protected routes
  if (!isPublicPath && jwtToken) {
    const decodedToken = await verifyJWT(jwtToken);
    
    // If token is invalid or expired, redirect to login
    if (!decodedToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
    }
    
    // Check if email verification is required for sensitive operations
    const sensitiveOperations = [
      '/account/orders',
      '/checkout',
      '/api/orders'
    ];
    
    const requiresVerification = sensitiveOperations.some(path => 
      pathname.startsWith(path)
    );
    
    if (requiresVerification && !decodedToken.emailVerified) {
      const url = new URL('/verify-email', request.url);
      return NextResponse.redirect(url);
    }
  }
  
  // For all responses, add security headers
  const response = NextResponse.next();
  
  // Add security headers
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), fullscreen=(self), display-capture=()',
    'Feature-Policy': 'camera none; microphone none; geolocation none; payment none; usb none; fullscreen self; display-capture none',
    
    // Content Security Policy - Updated to be more secure
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://accounts.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.firebasestorage.googleapis.com https://via.placeholder.com https://images.unsplash.com https://plus.unsplash.com https://*.googleusercontent.com;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://*.firebaseapp.com https://www.google-analytics.com;
      frame-src 'self' https://*.firebaseio.com https://*.googleapis.com https://accounts.google.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `.replace(/\s+/g, ' ').trim()
  };
  
  // Add each security header to the response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Configure which paths this middleware will run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (static image files)
     * - public/ (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|public/).*)',
  ],
}; 