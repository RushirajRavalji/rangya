/**
 * Collection of utility helper functions
 */

/**
 * Format a number as Indian Rupee currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show the ₹ symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

/**
 * Format a date in a user-friendly format
 * @param {Date|Object} timestamp - Date object or Firebase timestamp
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-IN', { ...defaultOptions, ...options }).format(date);
};

/**
 * Truncate text to a specified length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncating
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate a slug from a string
 * @param {string} text - The text to convert to a slug
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .trim();
};

/**
 * Check if an object is empty
 * @param {Object} obj - The object to check
 * @returns {boolean} True if the object is empty
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Deep clone an object
 * @param {Object} obj - The object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Get a random item from an array
 * @param {Array} array - The array to pick from
 * @returns {*} Random item from the array
 */
export const getRandomItem = (array) => {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} discountedPrice - Discounted price
 * @returns {number} Discount percentage
 */
export const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
  if (!originalPrice || !discountedPrice || originalPrice <= 0) return 0;
  
  const discount = originalPrice - discountedPrice;
  return Math.round((discount / originalPrice) * 100);
};

/**
 * Format a phone number (Indian format)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as per Indian standards
  if (cleaned.length === 10) {
    return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  
  // Return as is if not matching expected format
  return phoneNumber;
};

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\\/g, '&#92;')
    .replace(/`/g, '&#96;');
};

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether the email is valid
 */
export const validateEmail = (email) => {
  if (!email) return false;
  
  // RFC 5322 compliant email regex
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  
  // Basic phone validation - allows international formats
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Capitalize the first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}; 