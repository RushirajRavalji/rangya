# Deployment Fixes for Firebase Admin SDK on Vercel

This document outlines the changes made to fix deployment issues related to Firebase Admin SDK on Vercel.

## Problem

The application was failing to deploy on Vercel due to Firebase Admin SDK being imported in client-side code. The specific errors were:

1. Node.js built-in modules (`fs`, `net`, `tls`, `http2`, etc.) not being available in the browser environment
2. Node protocol imports (`node:events`, `node:stream`, `node:util`, etc.) not being handled by webpack
3. Firebase Admin SDK being bundled for client-side code

## Solutions Implemented

### 1. Server-Side Only Firebase Admin

- Created a dedicated API route (`/pages/api/admin/users.js`) for Firebase Admin operations
- Updated the client-side code (`/pages/admin/users/index.js`) to use the API route instead of direct Firebase Admin imports
- Modified the Firebase Admin utility (`/utils/firebase-admin.js`) to only run on the server side

### 2. Webpack Configuration

- Updated `next.config.js` to add fallbacks for Node.js modules
- Added polyfills for browser-compatible versions of Node.js modules
- Added webpack externals to exclude Firebase Admin from client bundles
- Added webpack plugins to provide Buffer and process polyfills

### 3. Client-Side Firebase Service

- Created a dedicated client-side Firebase service (`/utils/firebase-client.js`)
- Ensured proper separation between client and server code

### 4. Error Handling

- Created an `ErrorBoundary` component to handle errors gracefully
- Updated the `Layout` component to use the `ErrorBoundary`
- Modified the `HeroSection` component to not depend on Firebase
- Updated the `index.js` page to handle Firebase errors gracefully

### 5. Vercel Configuration

- Updated `vercel.json` to configure headers and rewrites
- Removed the problematic functions pattern that was causing deployment errors

### 6. Node.js Version

- Updated `package.json` to use Node.js 22.x as recommended by Vercel

### 7. Added Polyfills

Added the following polyfills:
- `crypto-browserify`
- `stream-browserify`
- `stream-http`
- `https-browserify`
- `browserify-zlib`
- `buffer`
- `events`
- `path-browserify`
- `process`
- `util`

## Best Practices for Firebase Admin SDK

1. **Keep Firebase Admin SDK server-side only**:
   - Use only in API routes (`/pages/api/*`)
   - Use only in `getServerSideProps`
   - Never import in client-side components

2. **Use Firebase Client SDK for client-side operations**:
   - Import from `firebase/app`, `firebase/firestore`, etc.
   - Keep client-side operations separate from server-side ones

3. **Use API routes as a bridge**:
   - Create API routes that use Firebase Admin SDK
   - Call these API routes from client-side code using `fetch()`

4. **Handle errors gracefully**:
   - Use error boundaries to catch and display errors
   - Provide fallbacks for when Firebase operations fail

## Testing

The application has been successfully built locally with these changes. The build process completes without critical errors, and the application should now deploy successfully on Vercel.

## Future Improvements

1. Fix the remaining import warnings in other files
2. Implement proper error handling for all Firebase operations
3. Add more comprehensive testing for Firebase operations
4. Consider using Firebase Admin SDK with Next.js middleware for authentication 