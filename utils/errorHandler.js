/**
 * Standardized error handling utility
 * This provides consistent error handling across the application
 */

// Error types with their default messages
const ERROR_TYPES = {
  AUTHENTICATION: {
    code: 'AUTH_ERROR',
    defaultMessage: 'Authentication error. Please log in again.',
    status: 401
  },
  AUTHORIZATION: {
    code: 'FORBIDDEN',
    defaultMessage: 'You do not have permission to perform this action.',
    status: 403
  },
  VALIDATION: {
    code: 'VALIDATION_ERROR',
    defaultMessage: 'Invalid input data.',
    status: 400
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    defaultMessage: 'The requested resource was not found.',
    status: 404
  },
  CONFLICT: {
    code: 'CONFLICT',
    defaultMessage: 'This operation conflicts with the current state.',
    status: 409
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT_EXCEEDED',
    defaultMessage: 'Too many requests. Please try again later.',
    status: 429
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    defaultMessage: 'An unexpected error occurred. Please try again later.',
    status: 500
  }
};

/**
 * Create a standardized error object
 * @param {string} type - Error type from ERROR_TYPES
 * @param {string} message - Custom error message (optional)
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} Standardized error object
 */
const createError = (type, message, details = {}) => {
  if (!ERROR_TYPES[type]) {
    type = 'SERVER_ERROR';
  }
  
  const errorId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    error: true,
    errorId,
    code: ERROR_TYPES[type].code,
    message: message || ERROR_TYPES[type].defaultMessage,
    status: ERROR_TYPES[type].status,
    timestamp: new Date().toISOString(),
    ...details
  };
};

/**
 * Handle API errors and send standardized response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} type - Error type from ERROR_TYPES (optional)
 * @param {string} message - Custom error message (optional)
 */
const handleApiError = (res, error, type = 'SERVER_ERROR', message = null) => {
  console.error('API Error:', error);
  
  // Determine error type from error object if not specified
  if (!type) {
    if (error.name === 'ValidationError') {
      type = 'VALIDATION';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      type = 'AUTHENTICATION';
    } else if (error.code === 'auth/insufficient-permission') {
      type = 'AUTHORIZATION';
    } else if (error.code === 'not-found') {
      type = 'NOT_FOUND';
    }
  }
  
  // Create standardized error response
  const errorResponse = createError(
    type,
    message || error.message,
    {
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    }
  );
  
  // Send response with appropriate status code
  res.status(errorResponse.status).json(errorResponse);
};

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Validation errors from express-validator
 * @returns {Object} Formatted validation errors
 */
const formatValidationErrors = (errors) => {
  const formattedErrors = {};
  
  errors.forEach(error => {
    formattedErrors[error.param] = error.msg;
  });
  
  return formattedErrors;
};

// Export functions
module.exports = {
  ERROR_TYPES,
  createError,
  handleApiError,
  formatValidationErrors
}; 