const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the path to the .env.local file
const envPath = path.resolve(__dirname, '../.env.local');

// Check if .env.local already exists
const envExists = fs.existsSync(envPath);

console.log('=======================================');
console.log('Rangya E-commerce Firebase Setup Script');
console.log('=======================================\n');

if (envExists) {
  console.log('An .env.local file already exists. Do you want to overwrite it?');
  rl.question('Overwrite? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      startSetup();
    } else {
      console.log('Setup cancelled. Your existing .env.local file was not modified.');
      rl.close();
    }
  });
} else {
  startSetup();
}

function startSetup() {
  console.log('\nPlease enter your Firebase configuration details:');
  console.log('(You can find these in your Firebase project settings)\n');

  const config = {};

  askForConfig('NEXT_PUBLIC_FIREBASE_API_KEY', 'Firebase API Key: ', (val) => {
    config.apiKey = val;
    askForConfig('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'Firebase Auth Domain: ', (val) => {
      config.authDomain = val;
      askForConfig('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'Firebase Project ID: ', (val) => {
        config.projectId = val;
        askForConfig('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'Firebase Storage Bucket: ', (val) => {
          config.storageBucket = val;
          askForConfig('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'Firebase Messaging Sender ID: ', (val) => {
            config.messagingSenderId = val;
            askForConfig('NEXT_PUBLIC_FIREBASE_APP_ID', 'Firebase App ID: ', (val) => {
              config.appId = val;
              askForConfig('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'Firebase Measurement ID (optional): ', (val) => {
                config.measurementId = val;
                askForConfig('NEXT_PUBLIC_SITE_URL', 'Site URL (default: http://localhost:3000): ', (val) => {
                  config.siteUrl = val || 'http://localhost:3000';
                  writeEnvFile(config);
                });
              });
            });
          });
        });
      });
    });
  });
}

function askForConfig(key, prompt, callback) {
  rl.question(prompt, (answer) => {
    callback(answer.trim());
  });
}

function writeEnvFile(config) {
  const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${config.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${config.authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${config.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${config.storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${config.appId}
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${config.measurementId || ''}

# Other Configuration
NEXT_PUBLIC_SITE_URL=${config.siteUrl}
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Firebase configuration saved to .env.local');
    console.log('\nNext steps:');
    console.log('1. Make sure you have enabled Google Authentication in your Firebase console');
    console.log('2. Set up your authorized domains in Firebase Authentication settings');
    console.log('3. Run "npm run dev" to start your development server');
    rl.close();
  } catch (error) {
    console.error('\n❌ Error writing .env.local file:', error);
    rl.close();
  }
} 