# Firebase Authentication Setup Guide

This guide provides detailed instructions for setting up Firebase Authentication for the Ranga e-commerce application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "ranga-ecommerce")
4. Choose whether to enable Google Analytics (recommended)
5. Accept the terms and click "Create project"
6. Wait for the project to be created, then click "Continue"

## 2. Register Your Web App

1. On the project overview page, click the web icon (</>) to add a web app
2. Enter a nickname for your app (e.g., "Ranga Web App")
3. Check the box for "Also set up Firebase Hosting" if you plan to use it
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this for your application

## 3. Set Up Authentication Methods

### Email/Password Authentication

1. In the Firebase Console, go to "Authentication" > "Sign-in method"
2. Click on "Email/Password" and enable it
3. Enable "Email link (passwordless sign-in)" if you want this feature
4. Click "Save"

### Google Authentication

1. In the Firebase Console, go to "Authentication" > "Sign-in method"
2. Click on "Google" and enable it
3. Enter a project support email
4. Click "Save"

### Configure Authentication Domains

1. In the Firebase Console, go to "Authentication" > "Settings" > "Authorized domains"
2. Add your application domains (e.g., "localhost", "your-app-name.vercel.app")
3. Click "Add domain" for each domain you want to authorize

## 4. Configure Email Templates (Optional)

1. In the Firebase Console, go to "Authentication" > "Templates"
2. Customize the email templates for:
   - Email verification
   - Password reset
   - Email link for sign-in
3. You can customize the sender name, subject, and message content
4. Click "Save" for each template you modify

## 5. Set Up Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

Replace the placeholder values with the actual values from your Firebase project configuration.

## 6. Configure Firebase Security Rules

### Firestore Rules

Go to "Firestore Database" > "Rules" and set up basic security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public product data can be read by anyone
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Orders can only be read/written by the user who created them or admins
    match /orders/{orderId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

### Storage Rules

Go to "Storage" > "Rules" and set up basic security rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to product images
    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*') && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Allow users to upload their profile pictures
    match /users/{userId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 7. Troubleshooting Common Issues

### Google Sign-In Not Working

1. Ensure you've added your domain to the authorized domains list
2. Check that the Google Sign-In method is enabled
3. Verify that your Firebase configuration is correct
4. Make sure popups aren't being blocked by the browser
5. Check the browser console for specific error messages

### Email Verification Links Not Working

1. Ensure your email templates are configured correctly
2. Check that the action URL in the email template is correct
3. Verify that your Firebase configuration is correct
4. Make sure the verification link hasn't expired (they typically expire after a few hours)

### "Firebase is not initialized" Errors

1. Verify that your Firebase configuration is correct
2. Make sure environment variables are properly loaded
3. Check that the Firebase SDK is imported correctly
4. Ensure the Firebase app is initialized before using any Firebase services

### Authentication Persistence Issues

1. Ensure you're using the appropriate persistence method (LOCAL, SESSION, or NONE)
2. Check that cookies and local storage are enabled in the browser
3. Verify that the user isn't being logged out due to security rules or token expiration

## 8. Using the Authentication Diagnostic Tools

### Auth Diagnostic Page

1. Navigate to `/auth-diagnostic` in your application
2. Check the Firebase initialization status
3. Verify the authentication configuration
4. Test the Google provider configuration
5. Check for any error messages or warnings

### API Endpoint

1. Make a GET request to `/api/check-firebase`
2. Review the response for detailed Firebase configuration status
3. Check for any error messages or warnings

## 9. Next Steps

After setting up Firebase Authentication:

1. Create user roles and permissions in your Firestore database
2. Implement protected routes in your application
3. Set up user profile management
4. Configure authentication state persistence
5. Implement email verification and password reset flows

By following this guide, you should have a fully functional authentication system for your Ranga e-commerce application. 