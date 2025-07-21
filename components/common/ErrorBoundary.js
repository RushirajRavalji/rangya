import { Component } from 'react';

/**
 * Error Boundary component to catch JavaScript errors in child component tree
 * and display a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Update state when an error occurs
   * @param {Error} error - The error that was thrown
   * @returns {Object} - Updated state with error details
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  /**
   * Lifecycle method called after an error is caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Component stack information
   */
  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
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
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-6">
              We're sorry, but there was an error loading this page. Please try refreshing the page or come back later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-deep text-white py-2 px-4 rounded hover:bg-blue-800 transition-colors"
            >
              Refresh Page
            </button>
            <div className="mt-4 text-center">
              <a href="/" className="text-indigo-deep hover:underline">
                Return to Home Page
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 