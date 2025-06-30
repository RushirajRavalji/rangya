/**
 * Utility to load the Razorpay SDK dynamically
 */

let razorpayPromise = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;
const LOAD_TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * Loads the Razorpay SDK script dynamically with retry mechanism and timeout
 * @returns {Promise<{success: boolean, error?: string}>} - Resolves with status and error if any
 */
export const loadRazorpayScript = () => {
  if (razorpayPromise) {
    return razorpayPromise;
  }

  loadAttempts = 0;
  razorpayPromise = attemptLoadRazorpay();
  return razorpayPromise;
};

/**
 * Attempts to load the Razorpay script with retry logic
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const attemptLoadRazorpay = () => {
  return new Promise((resolve) => {
    // If Razorpay is already loaded, resolve immediately
    if (window.Razorpay) {
      resolve({ success: true });
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    // Set up timeout for script loading
    const timeoutId = setTimeout(() => {
      handleLoadError(resolve, 'Razorpay script loading timed out');
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timeoutId);
      if (window.Razorpay) {
        resolve({ success: true });
      } else {
        handleLoadError(resolve, 'Razorpay object not available after script load');
      }
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      handleLoadError(resolve, 'Failed to load Razorpay script');
    };

    // Add script to document
    document.body.appendChild(script);
  });
};

/**
 * Handles script loading errors with retry logic
 * @param {Function} resolve - Promise resolve function
 * @param {string} errorMessage - Error message
 */
const handleLoadError = (resolve, errorMessage) => {
  loadAttempts++;
  
  if (loadAttempts < MAX_LOAD_ATTEMPTS) {
    console.warn(`Razorpay load attempt ${loadAttempts} failed: ${errorMessage}. Retrying...`);
    // Wait before retrying (exponential backoff)
    setTimeout(() => {
      const retryPromise = attemptLoadRazorpay();
      retryPromise.then(resolve);
    }, 1000 * Math.pow(2, loadAttempts - 1)); // 1s, 2s, 4s, etc.
  } else {
    console.error(`Failed to load Razorpay after ${MAX_LOAD_ATTEMPTS} attempts: ${errorMessage}`);
    razorpayPromise = null; // Reset for future attempts
    resolve({ success: false, error: errorMessage });
  }
};

/**
 * Checks if Razorpay is available
 * @returns {boolean} - True if Razorpay is loaded
 */
export const isRazorpayAvailable = () => {
  return typeof window !== 'undefined' && !!window.Razorpay;
};

/**
 * Creates a Razorpay instance with error handling
 * @param {Object} options - Razorpay options
 * @returns {Object|null} - Razorpay instance or null if creation fails
 */
export const createRazorpayInstance = (options) => {
  if (!isRazorpayAvailable()) {
    console.error('Razorpay is not available. Please ensure the script is loaded.');
    return null;
  }
  
  try {
    return new window.Razorpay(options);
  } catch (error) {
    console.error('Error creating Razorpay instance:', error);
    return null;
  }
};

/**
 * Loads Razorpay and creates an instance
 * @param {Object} options - Razorpay options
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const loadAndCreateRazorpayInstance = async (options) => {
  try {
    const loadResult = await loadRazorpayScript();
    
    if (!loadResult.success) {
      return { success: false, error: loadResult.error || 'Failed to load Razorpay' };
    }
    
    const instance = createRazorpayInstance(options);
    
    if (!instance) {
      return { success: false, error: 'Failed to create Razorpay instance' };
    }
    
    return { success: true, instance };
  } catch (error) {
    console.error('Error in loadAndCreateRazorpayInstance:', error);
    return { success: false, error: error.message || 'Unknown error initializing Razorpay' };
  }
};