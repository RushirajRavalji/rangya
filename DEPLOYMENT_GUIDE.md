# Rangya Deployment Guide

This guide provides instructions for deploying the Rangya e-commerce platform to production.

## Prerequisites

1. A Vercel account for deployment
2. Firebase project with Firestore, Authentication, and Storage enabled
3. Firebase Admin SDK service account credentials

## Deployment Steps

### 1. Set up Environment Variables

Create a `.env.local` file in the root of the project with the following variables:

```
# Core Environment Variables
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.com
PORT=3000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX...\n-----END PRIVATE KEY-----\n"

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-at-least-32-chars
JWT_SECRET=your-jwt-secret-at-least-32-chars
JWT_EXPIRY=86400
CSRF_SECRET=your-csrf-secret-at-least-32-chars

# Email Service
EMAIL_FROM=noreply@your-domain.com
SUPPORT_EMAIL=support@your-domain.com
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password

# Payment Processing
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
PAYMENT_WEBHOOK_SECRET=your-webhook-secret

# Site Configuration
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_NAME=Rangya

# Content Security Policy
ENABLE_STRICT_CSP=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### 2. Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to your Vercel account
3. Click "New Project" and import your repository
4. Configure the project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Add all environment variables from your `.env.local` file
6. Deploy the project

### 3. Configure Firebase Security Rules

Ensure your Firebase security rules are properly set up for production:

1. Deploy Firestore rules:
   ```
   firebase deploy --only firestore:rules
   ```

2. Deploy Storage rules:
   ```
   firebase deploy --only storage:rules
   ```

### 4. Set up Custom Domain (Optional)

1. In your Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow the instructions to configure DNS settings

### 5. Post-Deployment Verification

After deployment, verify the following:

1. User authentication works correctly
2. Product listings and details load properly
3. Cart functionality works as expected
4. Checkout process completes successfully
5. Admin dashboard is accessible to admin users only

## Troubleshooting

### Common Issues

1. **Firebase Authentication Issues**:
   - Ensure Firebase Auth domain is correctly set in the Firebase console
   - Check that all Firebase environment variables are correctly set

2. **API Routes Not Working**:
   - Verify that Firebase Admin SDK credentials are correctly formatted
   - Check server logs for any errors

3. **Image Loading Issues**:
   - Ensure Firebase Storage bucket is properly configured
   - Verify that the correct storage rules are deployed

4. **Payment Processing Issues**:
   - Confirm Razorpay API keys are correctly set
   - Check webhook configuration in the Razorpay dashboard

## Maintenance

### Regular Tasks

1. **Database Backups**:
   - Set up regular Firestore backups using Firebase console

2. **Monitoring**:
   - Monitor application performance using Vercel Analytics
   - Set up Firebase Performance Monitoring

3. **Updates**:
   - Regularly update dependencies to ensure security and performance

For any additional assistance, refer to the documentation or contact the development team. 