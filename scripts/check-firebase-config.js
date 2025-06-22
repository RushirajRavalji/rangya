/**
 * Script to check Firebase configuration
 * Run with: node scripts/check-firebase-config.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Check for required Firebase environment variables
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

// Check for security environment variables
const securityVars = [
  'CSRF_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

console.log('Checking Firebase configuration...');
console.log('--------------------------------');

let hasErrors = false;

// Check Firebase variables
console.log('\nFirebase Environment Variables:');
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ ${varName} is missing`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

// Check security variables
console.log('\nSecurity Environment Variables:');
securityVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ ${varName} is missing`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

// Check for weak CSRF secret
if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length < 32) {
  console.error('❌ CSRF_SECRET is too short (should be at least 32 characters)');
  hasErrors = true;
}

// Check for weak NEXTAUTH_SECRET
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  console.error('❌ NEXTAUTH_SECRET is too short (should be at least 32 characters)');
  hasErrors = true;
}

console.log('\nFirebase Configuration:');
console.log({
  apiKey: maskString(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: maskString(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'Not set'
});

console.log('\nSummary:');
if (hasErrors) {
  console.error('❌ Configuration has errors that need to be fixed');
  process.exit(1);
} else {
  console.log('✅ All required configuration is present');
  process.exit(0);
}

/**
 * Mask a string for display (show only first and last 4 characters)
 * @param {string} str - String to mask
 * @returns {string} - Masked string
 */
function maskString(str) {
  if (!str) return 'Not set';
  if (str.length <= 8) return '********';
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
} 