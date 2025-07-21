/**
 * Deployment preparation script
 * Checks if all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Check if a directory exists
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Main function
async function main() {
  log('🚀 Preparing for deployment...', colors.cyan);
  log('Checking required files and configurations...', colors.blue);
  
  const rootDir = path.resolve(__dirname, '..');
  let errors = 0;
  let warnings = 0;
  
  // Check for required files
  const requiredFiles = [
    'next.config.js',
    'package.json',
    'vercel.json',
    'middleware.js',
    'firestore.rules',
    'storage.rules'
  ];
  
  log('\n📁 Checking required files:', colors.magenta);
  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    if (fileExists(filePath)) {
      log(`  ✅ ${file} found`, colors.green);
    } else {
      log(`  ❌ ${file} missing`, colors.red);
      errors++;
    }
  }
  
  // Check for required directories
  const requiredDirs = [
    'pages',
    'components',
    'utils',
    'public',
    'styles'
  ];
  
  log('\n📂 Checking required directories:', colors.magenta);
  for (const dir of requiredDirs) {
    const dirPath = path.join(rootDir, dir);
    if (dirExists(dirPath)) {
      log(`  ✅ ${dir}/ found`, colors.green);
    } else {
      log(`  ❌ ${dir}/ missing`, colors.red);
      errors++;
    }
  }
  
  // Check for environment variables file
  log('\n🔒 Checking environment variables:', colors.magenta);
  const envExample = path.join(rootDir, 'env.local.example');
  const envLocal = path.join(rootDir, '.env.local');
  
  if (fileExists(envExample)) {
    log('  ✅ env.local.example found', colors.green);
  } else {
    log('  ❌ env.local.example missing', colors.red);
    errors++;
  }
  
  if (fileExists(envLocal)) {
    log('  ✅ .env.local found', colors.green);
  } else {
    log('  ⚠️ .env.local not found - will need to be created for deployment', colors.yellow);
    warnings++;
  }
  
  // Check Firebase configuration
  log('\n🔥 Checking Firebase configuration:', colors.magenta);
  const serviceAccountKey = path.join(rootDir, 'serviceAccountKey.json');
  
  if (fileExists(serviceAccountKey)) {
    log('  ✅ serviceAccountKey.json found', colors.green);
  } else {
    log('  ⚠️ serviceAccountKey.json not found - ensure Firebase Admin credentials are set in environment variables', colors.yellow);
    warnings++;
  }
  
  // Check for build errors
  log('\n🔍 Running lint check:', colors.magenta);
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    log('  ✅ Lint check passed', colors.green);
  } catch (error) {
    log('  ⚠️ Lint check failed - some issues may need to be fixed before deployment', colors.yellow);
    warnings++;
  }
  
  // Summary
  log('\n📋 Deployment Preparation Summary:', colors.cyan);
  if (errors === 0 && warnings === 0) {
    log('  ✅ All checks passed! Project is ready for deployment.', colors.green);
  } else {
    if (errors > 0) {
      log(`  ❌ Found ${errors} error(s) that must be fixed before deployment.`, colors.red);
    }
    if (warnings > 0) {
      log(`  ⚠️ Found ${warnings} warning(s) that should be addressed.`, colors.yellow);
    }
  }
  
  log('\n📝 Next steps:', colors.blue);
  log('1. Create .env.local file with production values if not already done');
  log('2. Run "npm run build" to verify the build process');
  log('3. Deploy to Vercel using "vercel" or by connecting your Git repository');
  log('4. Follow the instructions in DEPLOYMENT_GUIDE.md for additional steps');
}

// Run the main function
main().catch(error => {
  console.error('Error during deployment preparation:', error);
  process.exit(1);
}); 