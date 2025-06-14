// Script to check Firebase configuration
console.log('Checking Firebase configuration...');

// Check if .env.local file exists
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.local.example');

if (!fs.existsSync(envLocalPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: .env.local file not found!');
  console.log('\x1b[33m%s\x1b[0m', 'You need to create a .env.local file with your Firebase configuration.');
  console.log('Copy the env.local.example file to .env.local and update the values with your Firebase project details.');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('\nExample configuration from env.local.example:');
    const exampleConfig = fs.readFileSync(envExamplePath, 'utf8');
    console.log(exampleConfig);
  }
  
  process.exit(1);
}

// Load environment variables from .env.local
require('dotenv').config({ path: envLocalPath });

// Check Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredFields = [
  'apiKey', 
  'authDomain', 
  'projectId', 
  'storageBucket', 
  'messagingSenderId', 
  'appId'
];

const missingFields = requiredFields.filter(field => 
  !firebaseConfig[field] || 
  firebaseConfig[field].includes('your-') || 
  firebaseConfig[field].includes('replace_with_actual_')
);

if (missingFields.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', `ERROR: Missing or invalid Firebase configuration: ${missingFields.join(', ')}`);
  console.log('\x1b[33m%s\x1b[0m', 'Please update your .env.local file with valid Firebase configuration values.');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Firebase configuration looks valid!');
console.log('Configuration found:');
console.log(`- API Key: ${firebaseConfig.apiKey.substring(0, 5)}...`);
console.log(`- Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`- Project ID: ${firebaseConfig.projectId}`);
console.log(`- Storage Bucket: ${firebaseConfig.storageBucket}`);

console.log('\nIf you are still having issues with Google Sign-In, please check:');
console.log('1. Google Sign-In is enabled in Firebase Authentication console');
console.log('2. Your domain is authorized in the Firebase Authentication settings');
console.log('3. There are no browser console errors when attempting to sign in');
console.log('4. Popup blockers are disabled for your site');

console.log('\n\x1b[32m%s\x1b[0m', 'Configuration check complete!'); 