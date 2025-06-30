/**
 * Form validation utilities for consistent validation across the application
 */

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Validate postal code (6 digits for India)
 * @param {string} postalCode - Postal code to validate
 * @returns {boolean} - Whether the postal code is valid
 */
export const isValidPostalCode = (postalCode) => {
  const postalCodeRegex = /^\d{6}$/;
  return postalCodeRegex.test(postalCode.replace(/\D/g, ''));
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with strength score and feedback
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, score: 0, feedback: 'Password is required' };
  }
  
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long');
  } else {
    score += 1;
  }
  
  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    feedback.push('Include at least one uppercase letter');
  } else {
    score += 1;
  }
  
  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    feedback.push('Include at least one lowercase letter');
  } else {
    score += 1;
  }
  
  // Number check
  if (!/\d/.test(password)) {
    feedback.push('Include at least one number');
  } else {
    score += 1;
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Include at least one special character');
  } else {
    score += 1;
  }
  
  return {
    valid: score >= 4,
    score,
    feedback: feedback.length > 0 ? feedback : ['Password is strong']
  };
};

/**
 * Validate a form field
 * @param {string} name - Field name
 * @param {string} value - Field value
 * @param {Object} options - Validation options
 * @returns {string|null} - Error message or null if valid
 */
export const validateField = (name, value, options = {}) => {
  // Required field check
  if (options.required && (!value || value.trim() === '')) {
    return `${options.label || name} is required`;
  }
  
  // Skip other validations if empty and not required
  if (!value || value.trim() === '') {
    return null;
  }
  
  // Min length check
  if (options.minLength && value.length < options.minLength) {
    return `${options.label || name} should be at least ${options.minLength} characters`;
  }
  
  // Max length check
  if (options.maxLength && value.length > options.maxLength) {
    return `${options.label || name} should not exceed ${options.maxLength} characters`;
  }
  
  // Email validation
  if (options.type === 'email' && !isValidEmail(value)) {
    return 'Please enter a valid email address';
  }
  
  // Phone validation
  if (options.type === 'phone' && !isValidPhone(value)) {
    return 'Please enter a valid 10-digit phone number';
  }
  
  // Postal code validation
  if (options.type === 'postalCode' && !isValidPostalCode(value)) {
    return 'Please enter a valid 6-digit postal code';
  }
  
  // Password validation
  if (options.type === 'password') {
    const validation = validatePassword(value);
    if (!validation.valid) {
      return validation.feedback[0];
    }
  }
  
  // Match validation (for password confirmation)
  if (options.match && value !== options.match.value) {
    return `${options.label || name} does not match ${options.match.label}`;
  }
  
  // Custom validation function
  if (options.validate && typeof options.validate === 'function') {
    const customError = options.validate(value);
    if (customError) {
      return customError;
    }
  }
  
  // All validations passed
  return null;
};

/**
 * Validate an entire form
 * @param {Object} values - Form values
 * @param {Object} validationSchema - Validation schema
 * @returns {Object} - Validation result with errors and isValid flag
 */
export const validateForm = (values, validationSchema) => {
  const errors = {};
  let isValid = true;
  
  Object.entries(validationSchema).forEach(([fieldName, fieldOptions]) => {
    // Get field value (handle nested fields)
    let fieldValue;
    if (fieldName.includes('.')) {
      const [parent, child] = fieldName.split('.');
      fieldValue = values[parent] && values[parent][child];
    } else {
      fieldValue = values[fieldName];
    }
    
    // Validate the field
    const error = validateField(fieldName, fieldValue, fieldOptions);
    
    // Add error if validation failed
    if (error) {
      errors[fieldName] = error;
      isValid = false;
    }
  });
  
  return { errors, isValid };
};

export default {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  validatePassword,
  validateField,
  validateForm
}; 