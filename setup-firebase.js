const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env.local file
const envPath = path.join(__dirname, '.env.local');

// Template for .env.local file
const envTemplate = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
`;

// Function to check if .env.local exists
function checkEnvFile() {
  try {
    return fs.existsSync(envPath);
  } catch (error) {
    return false;
  }
}

// Function to create or update .env.local file
function setupEnvFile(config) {
  let envContent = '';
  
  // If file exists, read it first
  if (checkEnvFile()) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    envContent = envTemplate;
  }
  
  // Update each config value
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^(${key}=).*`, 'gm');
    if (envContent.match(regex)) {
      // Update existing value
      envContent = envContent.replace(regex, `$1${value}`);
    } else {
      // Add new value
      envContent += `\n${key}=${value}`;
    }
  });
  
  // Write to file
  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Firebase configuration saved to ${envPath}`);
}

// Function to prompt for Firebase config
async function promptForConfig() {
  return new Promise((resolve) => {
    console.log('\n📋 Please enter your Firebase configuration:');
    console.log('(You can find this in your Firebase project settings)\n');
    
    const config = {};
    
    rl.question('Firebase API Key: ', (apiKey) => {
      config.NEXT_PUBLIC_FIREBASE_API_KEY = apiKey;
      
      rl.question('Firebase Auth Domain: ', (authDomain) => {
        config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = authDomain;
        
        rl.question('Firebase Project ID: ', (projectId) => {
          config.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
          
          rl.question('Firebase Storage Bucket: ', (storageBucket) => {
            config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = storageBucket;
            
            rl.question('Firebase Messaging Sender ID: ', (messagingSenderId) => {
              config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = messagingSenderId;
              
              rl.question('Firebase App ID: ', (appId) => {
                config.NEXT_PUBLIC_FIREBASE_APP_ID = appId;
                
                rl.question('Firebase Measurement ID (optional): ', (measurementId) => {
                  config.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = measurementId;
                  
                  resolve(config);
                });
              });
            });
          });
        });
      });
    });
  });
}

// Main function
async function main() {
  console.log('\n🔥 Ranga E-commerce Firebase Setup 🔥\n');
  
  // Check if .env.local exists
  const envExists = checkEnvFile();
  
  if (envExists) {
    console.log('An existing .env.local file was found.');
    rl.question('Do you want to overwrite the Firebase configuration? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        const config = await promptForConfig();
        setupEnvFile(config);
        console.log('\n🚀 Firebase setup complete!');
      } else {
        console.log('\n⏭️  Skipping Firebase configuration.');
      }
      rl.close();
    });
  } else {
    console.log('No .env.local file found. Creating a new one...');
    const config = await promptForConfig();
    setupEnvFile(config);
    console.log('\n🚀 Firebase setup complete!');
    rl.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error during setup:', error);
  rl.close();
  process.exit(1);
}); 