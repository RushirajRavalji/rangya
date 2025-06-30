import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Error Boundary component to catch JavaScript errors in child component tree
 * and display a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Update state when an error occurs
   * @param {Error} error - The error that was thrown
   * @returns {Object} - Updated state with error details
   */
  static getDerivedStateFromError(error) {
    // Update state to trigger fallback UI
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error is caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Component stack information
   */
  componentDidCatch(error, errorInfo) {
    // Update state with error details
    this.setState({ errorInfo });
    
    // Log the error to an error reporting service
    this.logError(error, errorInfo);
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error to console and potentially to an error monitoring service
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Component stack information
   */
  logError(error, errorInfo) {
    // Log to console in development
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo?.componentStack);
    
    // In production, you would send this to your error monitoring service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  /**
   * Reset the error state to allow recovery
   */
  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;
    
    // If there's an error, render the fallback UI
    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback({ error, errorInfo, reset: this.handleReset })
          : fallback;
      }
      
      // Default fallback UI
      return (
        <div className="error-boundary p-6 rounded-lg bg-red-50 border border-red-200">
          <div className="flex flex-col items-center text-center">
            <div className="text-red-500 text-5xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but there was an error in this part of the application.
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV !== 'production' && error && (
              <div className="mt-6 text-left w-full">
                <details className="bg-gray-100 p-4 rounded border border-gray-300">
                  <summary className="font-medium cursor-pointer">Error Details</summary>
                  <pre className="mt-2 text-red-600 text-sm overflow-auto p-2">
                    {error.toString()}
                  </pre>
                  {errorInfo && (
                    <pre className="mt-2 text-gray-700 text-xs overflow-auto p-2 max-h-64">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // If no error, render children normally
    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  onReset: PropTypes.func
};

export default ErrorBoundary; 