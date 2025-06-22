# Firebase Setup for Rangya E-Commerce

This guide provides detailed instructions for setting up Firebase services for the Rangya e-commerce platform.

## Prerequisites

- Firebase account
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the prompts to create a new project
3. Give your project a name (e.g., "rangya-ecommerce")
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

## Step 2: Set Up Firebase Authentication

1. In the Firebase Console, navigate to "Authentication" in the left sidebar
2. Click "Get started"
3. Enable the following sign-in methods:
   - Email/Password
   - Google (optional)
4. For Google authentication:
   - Configure the OAuth consent screen in the Google Cloud Console
   - Add your domain to the authorized domains list

## Step 3: Set Up Firestore Database

1. Navigate to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in production mode
4. Choose a database location closest to your target audience
5. Click "Enable"

## Step 4: Set Up Firebase Storage

1. Navigate to "Storage" in the left sidebar
2. Click "Get started"
3. Accept the default security rules (we'll modify them later)
4. Select a storage location closest to your target audience
5. Click "Done"

## Step 5: Register Your Web App

1. Click on the gear icon next to "Project Overview" and select "Project settings"
2. Scroll down to "Your apps" section and click the web icon (</>) 
3. Register your app with a nickname (e.g., "rangya-web")
4. Click "Register app"
5. Copy the Firebase configuration object for use in your environment variables

## Step 6: Set Up Firebase Admin SDK

For server-side operations, you'll need the Firebase Admin SDK:

1. In "Project settings", navigate to the "Service accounts" tab
2. Click "Generate new private key"
3. Save the JSON file securely
4. Add the necessary environment variables to your server environment

## Step 7: Deploy Firestore Security Rules

The repository includes Firestore security rules in the `firestore.rules` file. Deploy them using:

```bash
firebase login
firebase deploy --only firestore:rules
```

## Step 8: Deploy Storage Security Rules

The repository includes Storage security rules in the `storage.rules` file. Deploy them using:

```bash
firebase deploy --only storage
```

## Step 9: Deploy Firebase Functions (Optional)

If you're using Firebase Functions:

1. Navigate to the `functions` directory:
```bash
cd functions
```

2. Install dependencies:
```bash
npm install
```

3. Deploy functions:
```bash
firebase deploy --only functions
```

## Step 10: Set Up Environment Variables

Create a `.env.local` file in the root directory with your Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

For server-side Firebase Admin SDK, add these variables to your server environment:

```
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
```

## Step 11: Verify Setup

Run the verification script to ensure Firebase is properly configured:

```bash
node scripts/check-firebase-config.js
```

## Database Structure

Here's the recommended Firestore database structure:

### Collections

- **users**: User profiles and preferences
  - Fields: uid, email, displayName, role, createdAt, lastLogin, orders, addresses
  
- **products**: Product information
  - Fields: id, name, description, price, salePrice, category, images, stock, sizes, createdAt, updatedAt
  
- **orders**: Order information
  - Fields: id, orderNumber, customer, items, shipping, billing, payment, subtotal, tax, shippingCost, total, status, createdAt, updatedAt
  
- **categories**: Product categories
  - Fields: id, name, slug, description, image, parentId
  
- **userCarts**: User shopping carts
  - Fields: userId, items, discount, promoCode, updatedAt

## Security Rules

The repository includes Firestore and Storage security rules that implement the following permissions:

- Public read access to products and categories
- Authenticated read/write access to user's own data
- Admin access to all collections
- Restricted access to orders based on user ownership
- Secure file upload permissions

## Troubleshooting

### Common Issues

1. **Authentication Issues**:
   - Ensure your Firebase configuration is correct
   - Check that the authorized domains include your development and production URLs
   - Verify that the sign-in methods are enabled

2. **Firestore Access Issues**:
   - Check the security rules in `firestore.rules`
   - Ensure users have appropriate permissions
   - Verify that your queries match the security rules

3. **Storage Issues**:
   - Check the security rules in `storage.rules`
   - Ensure file paths match the expected patterns
   - Verify that users have appropriate permissions

For additional help, consult the [Firebase documentation](https://firebase.google.com/docs) or contact support. 