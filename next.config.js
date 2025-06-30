const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable ESLint during builds to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Optimize image quality and formats
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  // Allow loading local files from outside the Next.js directory
  experimental: {
    externalDir: true,
    optimizeCss: true, // Enable CSS optimization
    optimizePackageImports: [
      'react-icons',
      'firebase',
      'lodash',
    ],
  },
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  },
  // Add security headers
  headers: async () => {
    const strictCSP = process.env.ENABLE_STRICT_CSP === 'true';
    
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: strictCSP 
              ? `
                default-src 'self';
                script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://accounts.google.com;
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
              : `
                default-src 'self';
                script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://accounts.google.com;
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.firebasestorage.googleapis.com https://via.placeholder.com https://images.unsplash.com https://plus.unsplash.com https://*.googleusercontent.com;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://*.firebaseapp.com;
                frame-src 'self' https://*.firebaseio.com https://*.googleapis.com https://accounts.google.com;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
                frame-ancestors 'none';
                block-all-mixed-content;
                upgrade-insecure-requests;
              `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ];
  },
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Configure webpack
  webpack: (config, { dev, isServer }) => {
    // Only load what we need from moment
    config.resolve.alias = {
      ...config.resolve.alias,
      'moment': 'moment/min/moment.min.js',
    };
    
    // Return the modified config
    return config;
  },
};

// Only log environment variables during development
if (process.env.NODE_ENV !== 'production') {
  console.log('Firebase environment variables status:');
  console.log(`API Key: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing'}`);
  console.log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing'}`);
}

module.exports = withBundleAnalyzer(nextConfig); 