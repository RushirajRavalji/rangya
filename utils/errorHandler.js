/**
 * Standardized error handling utility
 * This provides consistent error handling across the application
 */

/**
 * Error types for consistent error handling
 */
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

/**
 * HTTP status codes mapped to error types
 */
const ERROR_STATUS_CODES = {
  [ERROR_TYPES.VALIDATION]: 400,
  [ERROR_TYPES.AUTHENTICATION]: 401,
  [ERROR_TYPES.AUTHORIZATION]: 403,
  [ERROR_TYPES.NOT_FOUND]: 404,
  [ERROR_TYPES.DATABASE]: 500,
  [ERROR_TYPES.EXTERNAL_SERVICE]: 502,
  [ERROR_TYPES.RATE_LIMIT]: 429,
  [ERROR_TYPES.INTERNAL]: 500
};

/**
 * Create a structured error object
 * @param {string} type - Error type from ERROR_TYPES
 * @param {string} message - Human-readable error message
 * @param {any} details - Additional error details
 * @returns {Error} - Structured error object
 */
export function createError(type, message, details = null) {
  const error = new Error(message);
  error.code = ERROR_TYPES[type] || ERROR_TYPES.INTERNAL;
  error.statusCode = ERROR_STATUS_CODES[error.code] || 500;
  
  if (details) {
    if (details instanceof Error) {
      error.originalError = {
        message: details.message,
        stack: details.stack,
        ...details
      };
    } else {
      error.details = details;
    }
  }
  
  return error;
}

/**
 * Handle API errors and send appropriate response
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @param {boolean} includeDetails - Whether to include error details in response
 */
export function handleApiError(error, res, includeDetails = false) {
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || ERROR_TYPES.INTERNAL;
  
  const response = {
    error: errorCode,
    message: error.message || 'An unexpected error occurred'
  };
  
  // Include details only in development or if explicitly requested
  if ((process.env.NODE_ENV !== 'production' || includeDetails) && error.details) {
    response.details = error.details;
  }
  
  // Log all errors
  logError(error);
  
  res.status(statusCode).json(response);
}

/**
 * Log errors to the console and potentially to an external service
 * @param {Error} error - Error object to log
 * @param {string} context - Additional context about where the error occurred
 */
export function logError(error, context = '') {
  // Basic console logging
  console.error(`[ERROR]${context ? ` [${context}]` : ''}:`, error.message);
  
  if (error.stack) {
    console.error(error.stack);
  }
  
  if (error.details) {
    console.error('Error details:', error.details);
  }
  
  if (error.originalError) {
    console.error('Original error:', error.originalError);
  }
  
  // TODO: In production, send errors to a monitoring service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
  }
}

/**
 * Middleware for handling errors in API routes
 * @param {Function} handler - API route handler
 * @returns {Function} - Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      handleApiError(error, res);
    }
  };
}

/**
 * Combine multiple middleware functions
 * @param {...Function} middlewares - Middleware functions to combine
 * @returns {Function} - Combined middleware function
 */
export function combineMiddleware(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// Export functions
export default {
  ERROR_TYPES,
  createError,
  handleApiError,
  logError,
  withErrorHandling,
  combineMiddleware
}; 