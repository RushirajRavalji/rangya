# Security Setup Guide

This document provides instructions for properly configuring security-related settings in the Rangya application.

## Critical Environment Variables

Create a `.env.local` file in the root directory with the following security-critical variables:

```bash
# JWT Configuration - CRITICAL FOR SECURITY
# Generate a secure random string with at least 32 characters
JWT_SECRET=your-secure-random-string-here
JWT_EXPIRY=1h

# CSRF Protection - CRITICAL FOR SECURITY
# Generate a secure random string with at least 32 characters
CSRF_SECRET=your-secure-random-string-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
# Generate a secure random string with at least 32 characters
NEXTAUTH_SECRET=your-secure-random-string-here
```

To generate secure random strings for these secrets, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Features

The following security features have been implemented:

1. **CSRF Protection**: All API routes that modify data are protected against Cross-Site Request Forgery attacks.
2. **Email Verification**: Users must verify their email before placing orders.
3. **Secure Headers**: The application uses secure HTTP headers to protect against various attacks:
   - Content-Security-Policy
   - X-XSS-Protection
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security
   - Referrer-Policy
   - Permissions-Policy
   - Feature-Policy

## Security Checklist

Before deploying to production, ensure:

- [ ] All security-critical environment variables are set with strong random values
- [ ] CSRF protection is enabled for all non-GET API routes
- [ ] Email verification is required for sensitive operations
- [ ] JWT secrets are properly configured and not using fallback values
- [ ] Content Security Policy is properly configured for your domain
- [ ] Firebase credentials are properly secured

## Firebase Configuration

For Firebase security, ensure:

1. Set up proper Firestore rules in `firestore.rules`
2. Configure storage rules in `storage.rules`
3. Set up proper Firebase authentication methods

## Additional Security Measures

1. **Rate Limiting**: API routes are protected against brute force attacks
2. **Password Strength**: Password strength requirements are enforced
3. **Secure Cookies**: Authentication cookies are set with secure attributes 