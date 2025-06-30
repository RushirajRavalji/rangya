# Environment Variables Documentation

This document provides a comprehensive list of all environment variables used in the Rangya e-commerce application. Use this as a reference when setting up your development, staging, or production environments.

## Core Environment Variables

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Environment mode | Yes | `development` | `production` |
| `NEXT_PUBLIC_SITE_URL` | Base URL of the website | Yes | - | `https://rangya.com` |
| `PORT` | Port for the server | No | `3000` | `8080` |

## Firebase Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes | `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes | `your-app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes | `your-app-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes | `your-app-id.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes | `1:123456789012:web:abcd1234efgh5678` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID (for Analytics) | No | `G-ABCDEF1234` |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin project ID | Yes | `your-app-id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin client email | Yes | `firebase-adminsdk-abc12@your-app-id.iam.gserviceaccount.com` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key | Yes | `-----BEGIN PRIVATE KEY-----\nXXXX...\n-----END PRIVATE KEY-----\n` |

## Authentication

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXTAUTH_URL` | URL for NextAuth.js | Yes | `https://rangya.com` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Yes | `your-secure-nextauth-secret` |
| `JWT_SECRET` | Secret for JWT tokens | Yes | `your-secure-jwt-secret` |
| `JWT_EXPIRY` | JWT token expiry time | No | `86400` (24 hours in seconds) |
| `CSRF_SECRET` | Secret for CSRF tokens | Yes | `your-secure-csrf-secret` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google Auth | `123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google Auth | `ABCDEF-1234567890-GHIJKLMNOP` |

## Email Service

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EMAIL_FROM` | Default sender email address | Yes | `noreply@rangya.com` |
| `SUPPORT_EMAIL` | Support email address | Yes | `support@rangya.com` |
| `EMAIL_SERVICE` | Email service provider (production) | For Production | `sendgrid` |
| `EMAIL_HOST` | SMTP host (development) | For Development | `smtp.mailtrap.io` |
| `EMAIL_PORT` | SMTP port (development) | For Development | `2525` |
| `EMAIL_SECURE` | Whether to use TLS | No | `false` |
| `EMAIL_USER` | SMTP username | Yes | `your-smtp-username` |
| `EMAIL_PASSWORD` | SMTP password | Yes | `your-smtp-password` |

## Payment Processing

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API key ID | For Payments | `rzp_live_abcdefghijklmn` |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | For Payments | `abcdefghijklmnopqrstuvwxyz1234567890` |
| `PAYMENT_WEBHOOK_SECRET` | Secret for payment webhooks | For Payments | `your-webhook-secret` |

## Analytics and Monitoring

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | No | `G-ABCDEF1234` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking | No | `https://abcdef1234567890@o123456.ingest.sentry.io/1234567` |
| `NEXT_PUBLIC_HOTJAR_ID` | Hotjar site ID | No | `1234567` |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity ID | No | `abcdefghij` |

## Media and Storage

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | For Image Uploads | `your-cloud-name` |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Cloudinary API key | For Image Uploads | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | For Image Uploads | `abcdefghijklmnopqrstuvwxyz` |
| `NEXT_PUBLIC_UPLOAD_PRESET` | Cloudinary upload preset | For Image Uploads | `rangya_uploads` |

## API Rate Limiting

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | No | `60000` (1 minute) | `300000` (5 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window | No | `60` | `100` |

## Development Tools

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NEXT_PUBLIC_SHOW_DEVTOOLS` | Whether to show dev tools | No | `false` | `true` |
| `ANALYZE_BUNDLE` | Whether to analyze bundle size | No | `false` | `true` |
| `DEBUG` | Enable debug mode | No | `false` | `true` |

## Setting Up Environment Variables

### Development

Create a `.env.local` file in the root directory of the project with the required environment variables. You can use the `.env.local.example` file as a template.

### Production

Set the environment variables in your hosting platform (Vercel, Netlify, etc.) or in your server's environment.

### Environment Variable Files

- `.env.local`: Local development environment variables (not committed to Git)
- `.env.development`: Development environment variables (can be committed to Git)
- `.env.production`: Production environment variables (can be committed to Git, but should not contain secrets)
- `.env.test`: Test environment variables for running tests

## Security Notes

- Never commit sensitive environment variables like API keys and secrets to your Git repository
- Use different values for development, staging, and production environments
- Rotate secrets periodically for enhanced security
- Ensure that environment variables with the `NEXT_PUBLIC_` prefix only contain non-sensitive information, as these will be exposed to the browser 