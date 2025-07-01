# Rangya - Premium Denim E-commerce Platform

Rangya is a modern e-commerce platform built with Next.js, Firebase, and Tailwind CSS, specializing in premium denim products.

## Features

- **User Authentication**: Secure login, registration, and account management
- **Product Catalog**: Browse products with advanced filtering and search
- **Shopping Cart**: Add, remove, and update items in cart
- **Checkout Process**: Secure payment processing and order confirmation
- **Order Management**: Track orders and view order history
- **Admin Dashboard**: Manage products, orders, and users
- **Product Reviews**: Leave and read reviews with ratings
- **Responsive Design**: Mobile-first approach for all device sizes
- **SEO Optimized**: Structured data and meta tags for better search visibility
- **Email Notifications**: Order confirmations and status updates

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Cloud Functions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication, NextAuth.js
- **Storage**: Firebase Storage
- **Payment Processing**: Razorpay (configurable)
- **Email Service**: Nodemailer with configurable providers
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Firebase account
- (Optional) Razorpay account for payments
- (Optional) SMTP server for emails

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/rangya.git
cd rangya
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Copy the example environment file and update it with your configuration:

```bash
cp env.local.example .env.local
```

Edit `.env.local` with your Firebase credentials and other configuration. See [ENV_VARIABLES.md](ENV_VARIABLES.md) for a complete list of environment variables.

### 4. Set Up Firebase

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password and Google)
3. Create a Firestore database
4. Set up Firebase Storage
5. Generate a new private key for Firebase Admin SDK
6. Update your `.env.local` with Firebase credentials

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

### 5. Initialize the Database

Run the setup script to initialize the database with sample data:

```bash
npm run setup
# or
yarn setup
```

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
rangya/
├── components/       # React components
├── contexts/         # React contexts for state management
├── functions/        # Firebase Cloud Functions
├── pages/            # Next.js pages and API routes
├── public/           # Static assets
├── scripts/          # Utility scripts
├── styles/           # Global styles
├── utils/            # Utility functions
└── ...               # Configuration files
```

## Key Components

- **Authentication**: Managed through `AuthContext.js` and NextAuth.js
- **Cart Management**: Handled by `CartContext.js`
- **Product Services**: API for product data in `productService.js`
- **Order Processing**: Order management in `orderService.js`
- **Admin Dashboard**: Admin-only pages in `pages/admin/`
- **API Routes**: Backend functionality in `pages/api/`

## Deployment

### Vercel Deployment (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

### Firebase Deployment

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase: `firebase init`
4. Deploy: `firebase deploy`

## Security Considerations

- JWT secrets and API keys are stored in environment variables
- CSRF protection is implemented for all state-changing API routes
- Input validation is performed on both client and server
- Rate limiting is applied to sensitive endpoints
- Error handling prevents information leakage

For detailed security setup, see [SECURITY_SETUP.md](SECURITY_SETUP.md).

## Testing

```bash
# Run unit tests
npm run test
# or
yarn test

# Run end-to-end tests
npm run test:e2e
# or
yarn test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@rangya.com or open an issue on GitHub.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Icons](https://react-icons.github.io/react-icons/)

## Notifications

For admin notifications to play a sound when new orders arrive, please add a sound file at:

```
public/notification-sound.mp3
```

You can use any short MP3 file for this purpose. If no sound file is provided, the system will attempt to use browser notifications instead.

### Adding a notification sound

1. Obtain a short MP3 file (1-2 seconds) for notification sounds
2. Rename it to `notification-sound.mp3`
3. Place it in the `public` folder of the project
4. The notification sound will play automatically when new orders arrive
