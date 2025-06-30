/**
 * Analytics utility for tracking user interactions and events
 * 
 * This module provides a unified interface for analytics tracking,
 * which can be connected to various analytics services (Google Analytics,
 * Firebase Analytics, etc.) based on configuration.
 */

// Import analytics services based on configuration
// For production, you would import actual analytics services
let analyticsEnabled = false;

// Initialize analytics based on environment
if (typeof window !== 'undefined') {
  analyticsEnabled = 
    process.env.NODE_ENV === 'production' || 
    window.location.search.includes('analytics=true');
}

/**
 * Initialize Google Analytics
 */
export const initGA = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Only initialize if GA ID is available
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    
    if (!gaId) {
      console.warn('[Analytics] Google Analytics ID not found');
      return;
    }
    
    // Add Google Analytics script if not already present
    if (!window.gtag) {
      // Create script elements
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', { 
          page_path: window.location.pathname,
          anonymize_ip: true
        });
      `;
      
      // Append scripts to document
      document.head.appendChild(script1);
      document.head.appendChild(script2);
      
      console.log('[Analytics] Google Analytics initialized');
    }
  } catch (error) {
    console.error('[Analytics] Error initializing Google Analytics:', error);
  }
};

/**
 * Track page view
 * @param {string} url - URL of the page being viewed
 * @param {Object} pageProps - Additional page properties
 */
export const pageView = (url, pageProps = {}) => {
  if (!analyticsEnabled) return;
  
  try {
    // Track page view in Google Analytics
    if (window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
        ...pageProps
      });
    }
    
    // Track page view in other analytics services
    console.log(`[Analytics] Page view: ${url}`, pageProps);
  } catch (error) {
    console.error('[Analytics] Error tracking page view:', error);
  }
};

/**
 * Track user event
 * @param {string} eventName - Name of the event
 * @param {Object} eventParams - Event parameters
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (!analyticsEnabled) return;
  
  try {
    // Track event in Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
    
    // Track event in other analytics services
    console.log(`[Analytics] Event: ${eventName}`, eventParams);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

/**
 * Track user identification
 * @param {string} userId - User ID
 * @param {Object} userProps - User properties
 */
export const identifyUser = (userId, userProps = {}) => {
  if (!analyticsEnabled) return;
  
  try {
    // Set user ID in Google Analytics
    if (window.gtag) {
      window.gtag('set', { user_id: userId });
      window.gtag('set', 'user_properties', userProps);
    }
    
    // Identify user in other analytics services
    console.log(`[Analytics] User identified: ${userId}`, userProps);
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
};

/**
 * Track e-commerce event
 * @param {string} eventType - Type of e-commerce event
 * @param {Object} products - Product data
 * @param {Object} eventParams - Additional event parameters
 */
export const trackEcommerce = (eventType, products, eventParams = {}) => {
  if (!analyticsEnabled) return;
  
  try {
    // Track e-commerce event in Google Analytics
    if (window.gtag) {
      switch (eventType) {
        case 'view_item':
          window.gtag('event', 'view_item', {
            items: [products],
            ...eventParams
          });
          break;
        case 'add_to_cart':
          window.gtag('event', 'add_to_cart', {
            items: [products],
            ...eventParams
          });
          break;
        case 'begin_checkout':
          window.gtag('event', 'begin_checkout', {
            items: products,
            ...eventParams
          });
          break;
        case 'purchase':
          window.gtag('event', 'purchase', {
            transaction_id: eventParams.transactionId,
            value: eventParams.value,
            currency: eventParams.currency || 'INR',
            tax: eventParams.tax,
            shipping: eventParams.shipping,
            items: products
          });
          break;
        default:
          window.gtag('event', eventType, {
            items: Array.isArray(products) ? products : [products],
            ...eventParams
          });
      }
    }
    
    // Track e-commerce event in other analytics services
    console.log(`[Analytics] E-commerce event: ${eventType}`, { products, ...eventParams });
  } catch (error) {
    console.error('[Analytics] Error tracking e-commerce event:', error);
  }
};

/**
 * Log error to analytics services
 * @param {Error} error - Error object
 * @param {Object} errorInfo - Additional error information
 */
export const logError = (error, errorInfo = {}) => {
  if (!analyticsEnabled) return;
  
  try {
    // Extract error details
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...errorInfo
    };
    
    // Log error in Google Analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: errorInfo.fatal || false
      });
    }
    
    // Log error in other analytics services
    // For example, if using Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
    
    console.log('[Analytics] Error logged:', errorDetails);
  } catch (loggingError) {
    console.error('[Analytics] Error logging error:', loggingError);
  }
};

/**
 * Set user preferences for analytics
 * @param {Object} preferences - User preferences
 */
export const setUserPreferences = (preferences = {}) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Set consent mode for Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
        ad_storage: preferences.advertising ? 'granted' : 'denied',
        functionality_storage: preferences.functional ? 'granted' : 'denied',
        personalization_storage: preferences.personalization ? 'granted' : 'denied'
      });
    }
    
    // Update analytics enabled state
    analyticsEnabled = 
      (process.env.NODE_ENV === 'production' && preferences.analytics !== false) || 
      window.location.search.includes('analytics=true');
    
    console.log('[Analytics] User preferences updated:', preferences);
  } catch (error) {
    console.error('[Analytics] Error setting user preferences:', error);
  }
};

export default {
  initGA,
  pageView,
  trackEvent,
  identifyUser,
  trackEcommerce,
  logError,
  setUserPreferences
}; 