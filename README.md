# Ranga E-commerce - Men's Denim Store

A full-featured e-commerce website for "Ranga – Style Me Apna Rang" specializing in men's denim products. Built with Next.js, React, and Firebase.

## Features

- Responsive design with mobile-first approach
- Product catalog with filtering and search
- Product detail pages with image gallery
- Shopping cart with localStorage persistence
- User authentication with Google and email verification
- Order processing and history
- Admin dashboard for product and order management
- Secure data handling and input validation

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **State Management**: React Context API
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ranga-ecommerce.git
   cd ranga-ecommerce
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up Firebase:
   - Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Firestore, Authentication (Google and Email/Password), and Storage
   - Get your Firebase configuration
   - Create a `.env.local` file based on the `env.local.example` template
   - Add your Firebase configuration to the `.env.local` file
   - Run the setup script:
     ```bash
     npm run setup
     ```
   - Follow the prompts to set up your Firebase project

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
ranga-ecommerce/
├── components/         # React components
│   ├── cart/          # Cart-related components
│   ├── common/        # Common UI components
│   ├── home/          # Homepage components
│   └── layout/        # Layout components
├── contexts/          # React context providers
├── pages/             # Next.js pages
│   ├── account/       # User account pages
│   ├── admin/         # Admin dashboard pages
│   ├── api/           # API routes
│   └── products/      # Product pages
├── public/            # Static assets
├── scripts/           # Utility scripts
├── server/            # Server-side code
├── styles/            # Global styles
└── utils/             # Utility functions
```

## Authentication

The application supports the following authentication methods:
- Google Sign-In (primary method)
- Email/Password with email verification

User roles:
- Customer: Default role for registered users
- Admin: Special role for managing products and orders

### Authentication Flow

1. **Registration**: Users can register using email/password or Google Sign-In
   - Email registration requires verification via a link sent to the user's email
   - Google Sign-In automatically verifies the email

2. **Login**: Users can log in using their email/password or Google account
   - Email verification check is temporarily disabled to allow all users to log in
   - This can be re-enabled in the `AuthContext.js` file when needed

3. **Password Reset**: Users can reset their password via the "Forgot Password" link
   - A reset link will be sent to the user's email
   - The reset link directs to a dedicated password reset page

4. **Email Verification**: A verification link is sent to users who register with email/password
   - The verification link directs to a dedicated verification page
   - Users can request a new verification email if needed

### Authentication Diagnostic Tools

For troubleshooting authentication issues, the application includes:

1. **Auth Diagnostic Page**: Available at `/auth-diagnostic`
   - Shows Firebase initialization status
   - Displays authentication configuration
   - Shows current user information
   - Tests Google provider configuration
   - Checks browser environment compatibility

2. **API Endpoint**: Available at `/api/check-firebase`
   - Returns detailed Firebase configuration status
   - Useful for server-side debugging

### Common Authentication Issues and Solutions

1. **Google Sign-In Popup Blocked**
   - **Issue**: Browser blocks the popup window for Google authentication
   - **Solution**: Allow popups for the website in browser settings
   - **Prevention**: The app now checks for popup blockers before attempting Google Sign-In

2. **Email Verification Links Not Working**
   - **Issue**: Verification links expire or are invalid
   - **Solution**: Request a new verification email or contact support
   - **Prevention**: Clear error messages now explain verification issues

3. **"Firebase is not initialized" Errors**
   - **Issue**: Firebase services not properly loaded
   - **Solution**: Check network connectivity and ensure Firebase configuration is correct
   - **Prevention**: Improved initialization in `_app.js` with better error handling

4. **Authentication Persistence Issues**
   - **Issue**: Users getting logged out unexpectedly
   - **Solution**: The app now uses `browserLocalPersistence` for better session management
   - **Prevention**: Login state is preserved across page refreshes and browser restarts

5. **Environment Variables Not Loading**
   - **Issue**: Firebase configuration not properly loaded from environment variables
   - **Solution**: Hardcoded Firebase configuration as a temporary workaround
   - **Prevention**: Clear logging of configuration status on startup

## Firebase Configuration

For authentication to work properly, you need to:

1. Enable Google Authentication in your Firebase console
2. Enable Email/Password Authentication in your Firebase console
3. Set up your authorized domains in Firebase Authentication settings
4. Configure email verification templates (optional)
5. Set up proper Firebase security rules for Firestore and Storage

## Security Best Practices

This project implements several security best practices:

1. **Environment Variables**: All sensitive information (API keys, credentials) is stored in environment variables, not in the code.

2. **Input Validation**: All user inputs are validated and sanitized to prevent XSS attacks and injection.

3. **Authentication**: Email verification is required before users can log in with email/password.

4. **Authorization**: Firebase security rules restrict access to data based on user roles and ownership.

5. **Data Validation**: Server-side validation ensures data integrity and prevents unauthorized modifications.

6. **Image Handling**: Images are validated for type and size before upload to prevent malicious file uploads.

7. **CORS Protection**: API routes implement proper CORS policies to prevent cross-origin attacks.

8. **Rate Limiting**: Firebase security rules include rate limiting to prevent abuse.

9. **Secure Redirects**: All redirects are validated to prevent open redirect vulnerabilities.

10. **Content Security Policy**: Implemented to prevent XSS attacks and other code injections.

### Security Recommendations

For production deployment, consider implementing:

1. **HTTPS**: Ensure all traffic is encrypted using HTTPS.

2. **Regular Backups**: Set up regular backups of your Firestore database.

3. **Monitoring**: Implement logging and monitoring to detect suspicious activities.

4. **Update Dependencies**: Regularly update dependencies to patch security vulnerabilities.

5. **Security Audits**: Conduct regular security audits of your application.

6. **Two-Factor Authentication**: Consider adding 2FA for admin accounts.

7. **Data Encryption**: Encrypt sensitive data at rest and in transit.

## Deployment

### Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import your project to Vercel: [https://vercel.com/import](https://vercel.com/import)
3. Add your environment variables in the Vercel dashboard
4. Deploy!

### Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase Hosting:
   ```bash
   firebase init hosting
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

## Troubleshooting

- **Firebase Authentication Issues**: Ensure your Firebase project has the correct authentication methods enabled and domains whitelisted.
- **Image Upload Problems**: Check Storage permissions in Firebase and verify the image formats and sizes.
- **Payment Processing**: For test payments, use the test card numbers provided by your payment processor.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
- [Unsplash](https://unsplash.com/) for sample product images

## Environment Variables Issue

If you're experiencing issues with environment variables not loading properly, a temporary workaround has been implemented in `utils/firebase.js` by hardcoding the Firebase configuration values.

This approach is used only for development purposes. For production, you should:

1. Make sure your `.env.local` file is properly formatted with no extra spaces or quotes
2. Ensure the file is in the root directory of the project
3. Restart the development server completely after making changes to environment variables

**Note:** Never commit hardcoded API keys and secrets to version control. The current implementation is a temporary fix for development purposes only.

## Recent Authentication Fixes

The authentication system has been recently updated with the following improvements:

1. **Enhanced Error Handling**: More descriptive error messages for authentication failures
2. **Improved Google Sign-In**: Better error handling and popup blocker detection
3. **Password Reset Flow**: Added complete password reset functionality
4. **Email Verification**: Dedicated page for handling email verification links
5. **Auth Persistence**: Implemented local persistence for better user experience
6. **Diagnostic Tools**: Added tools for troubleshooting authentication issues
7. **User Profile Updates**: Improved handling of user profile information
8. **Security Enhancements**: Better validation and error handling throughout the auth flow

These improvements should resolve most common authentication issues. If you encounter any problems, please use the diagnostic tools mentioned above to help identify the cause. #   R a n g y a  
 