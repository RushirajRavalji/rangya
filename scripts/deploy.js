/**
 * Deployment script for Rangya
 * This script checks for required environment variables and deploys the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question and get user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Check if environment variables are set
function checkEnvVars() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fileExists(envPath)) {
    log('❌ .env.local file not found. Creating template...', colors.red);
    const envExamplePath = path.join(process.cwd(), 'env.local.example');
    if (fileExists(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('✅ Created .env.local template from env.local.example', colors.green);
      log('⚠️ Please fill in the required environment variables in .env.local', colors.yellow);
      return false;
    } else {
      log('❌ env.local.example file not found. Cannot create template.', colors.red);
      return false;
    }
  }
  
  // Read .env.local file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  const missingVars = [];
  
  // Check for empty environment variables
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'JWT_SECRET'
  ];
  
  for (const line of envLines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    const [key, value] = line.split('=');
    if (requiredVars.includes(key) && (!value || value.trim() === '')) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length > 0) {
    log('❌ The following required environment variables are missing:', colors.red);
    missingVars.forEach(variable => {
      log(`  - ${variable}`, colors.red);
    });
    return false;
  }
  
  log('✅ All required environment variables are set', colors.green);
  return true;
}

// Run build
function runBuild() {
  try {
    log('🔨 Building the application...', colors.blue);
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Build completed successfully', colors.green);
    return true;
  } catch (error) {
    log('❌ Build failed', colors.red);
    return false;
  }
}

// Deploy to Vercel
function deployToVercel() {
  try {
    log('🚀 Deploying to Vercel...', colors.blue);
    execSync('npx vercel --prod', { stdio: 'inherit' });
    log('✅ Deployment completed successfully', colors.green);
    return true;
  } catch (error) {
    log('❌ Deployment failed', colors.red);
    return false;
  }
}

// Main function
async function main() {
  log('🚀 Rangya Deployment Script', colors.cyan);
  log('This script will help you deploy Rangya to production.', colors.blue);
  
  // Check environment variables
  const envVarsOk = checkEnvVars();
  if (!envVarsOk) {
    const answer = await askQuestion('Do you want to continue anyway? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      log('Deployment cancelled.', colors.yellow);
      rl.close();
      return;
    }
  }
  
  // Run build
  const buildOk = runBuild();
  if (!buildOk) {
    const answer = await askQuestion('Build failed. Do you want to continue with deployment anyway? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      log('Deployment cancelled.', colors.yellow);
      rl.close();
      return;
    }
  }
  
  // Deploy to Vercel
  const answer = await askQuestion('Do you want to deploy to Vercel now? (Y/n): ');
  if (answer.toLowerCase() !== 'n') {
    const deployOk = deployToVercel();
    if (deployOk) {
      log('🎉 Rangya has been successfully deployed to Vercel!', colors.green);
    } else {
      log('⚠️ Deployment to Vercel failed. Please check the error messages above.', colors.yellow);
    }
  } else {
    log('Deployment cancelled.', colors.yellow);
  }
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error during deployment:', error);
  rl.close();
  process.exit(1);
}); 