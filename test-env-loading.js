// Test script to check environment variable loading
const fs = require('fs');
const path = require('path');

console.log('Before loading env variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'Not set');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || 'Not set');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set (Key exists)' : 'Not set');

// Manual implementation of loading env variables
function loadEnvVariables() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.log('No .env.local file found');
      return;
    }

    console.log('.env.local file found, loading variables...');
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      // Ignore comments and empty lines
      if (!line || line.trim().startsWith('#')) continue;

      const idx = line.indexOf('=');
      if (idx === -1) continue;

      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();

      // Remove surrounding quotes if they exist
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')) ) {
        value = value.slice(1, -1);
      }

      // Unescape \n so that multiline private keys work
      value = value.replace(/\\n/g, '\n');

      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`Set ${key} from .env.local`);
      }
    }
  } catch (err) {
    console.error('Failed to load .env.local', err);
  }
}

// Load environment variables
loadEnvVariables();

console.log('\nAfter loading env variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'Not set');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || 'Not set');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set (Key exists)' : 'Not set');