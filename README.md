# Rangya - Premium Denim E-commerce

A modern e-commerce platform for premium denim clothing.

## Features

- User authentication with Firebase Auth
- Product catalog with filtering and search
- Shopping cart functionality
- Secure checkout process
- Order management
- Admin dashboard
- Responsive design for mobile and desktop

## Security Features

- JWT-based authentication with secure verification
- CSRF protection across all API endpoints
- Email verification for sensitive operations
- Password strength requirements
- Secure HTTP headers and Content Security Policy
- Rate limiting to prevent abuse
- Improved error handling with specific messages

## Performance Optimizations

- Optimized image loading with fallbacks
- Lazy loading of components
- Bundle size optimization
- Server-side rendering for critical pages

## Tech Stack

- Next.js for frontend and API routes
- Firebase (Authentication, Firestore, Storage, Functions)
- Tailwind CSS for styling
- React Context API for state management

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- Firebase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/rangya.git
cd rangya
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.local.example .env.local
```
Edit `.env.local` with your Firebase credentials and other configuration.

4. Start the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Firebase Setup

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions on setting up Firebase.

### Deployment

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for instructions on deploying to Vercel.

## Project Structure

- `components/` - React components
- `contexts/` - React context providers
- `pages/` - Next.js pages and API routes
- `public/` - Static assets
- `styles/` - Global styles
- `utils/` - Utility functions

## Security Best Practices

- Environment variables are used for all sensitive information
- JWT tokens are verified with proper algorithms and expiry
- CSRF protection is implemented for all non-GET API routes
- Input validation is performed on both client and server
- Content Security Policy restricts loading of external resources
- Rate limiting prevents brute force and DoS attacks
- Email verification is required for sensitive operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
