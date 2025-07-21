import { NextResponse } from 'next/server';

export function middleware(request) {
  // This middleware runs on both client and server
  // We can use it to redirect or modify requests
  
  // Example: Redirect unauthenticated users trying to access admin pages
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // We can't check authentication here directly since middleware runs on the edge
    // For actual auth checks, we need to do it in the page component or getServerSideProps
    
    // But we can redirect based on URL patterns or headers
    // This is just a placeholder for any edge-side logic you might need
  }

  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    // Apply to all admin routes
    '/admin/:path*',
    // Apply to API routes that need protection
    '/api/admin/:path*',
  ],
}; 