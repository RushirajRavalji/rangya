import { NextResponse } from 'next/server';

/**
 * Middleware for authentication checking and security headers
 */
export function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/reset-password',
    '/verify-email',
    '/auth-diagnostic',
    '/api/',
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
  
  // If the path is not public and user is not authenticated, redirect to login
  if (!isPublicPath && !authToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
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
    'Referrer-Policy': 'origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Content Security Policy - Updated to allow Firebase authentication
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://*.firebaseapp.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https://firebasestorage.googleapis.com https://via.placeholder.com https://images.unsplash.com https://plus.unsplash.com https://*.googleusercontent.com;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://*.firebaseapp.com;
      frame-src 'self' https://*.firebaseapp.com https://accounts.google.com;
      object-src 'none';
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