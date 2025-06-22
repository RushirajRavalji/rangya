/**
 * Analytics utility for tracking user behavior
 */

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && !window.GA_INITIALIZED && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    // Add Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
      send_page_view: false // We'll handle page views manually
    });
    
    window.gtag = gtag;
    window.GA_INITIALIZED = true;
  }
};

// Track page views
export const pageview = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url
    });
  }
};

// Track events
export const event = ({ action, category, label, value }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

// Track e-commerce events
export const ecommerce = {
  // Track product view
  viewProduct: (product) => {
    if (typeof window !== 'undefined' && window.gtag && product) {
      window.gtag('event', 'view_item', {
        currency: 'INR',
        value: product.salePrice || product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.salePrice || product.price,
          item_category: product.category,
          item_variant: product.color || 'default'
        }]
      });
    }
  },
  
  // Track add to cart
  addToCart: (item) => {
    if (typeof window !== 'undefined' && window.gtag && item) {
      window.gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: item.price * item.quantity,
        items: [{
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_variant: item.size || 'default'
        }]
      });
    }
  },
  
  // Track remove from cart
  removeFromCart: (item) => {
    if (typeof window !== 'undefined' && window.gtag && item) {
      window.gtag('event', 'remove_from_cart', {
        currency: 'INR',
        value: item.price * item.quantity,
        items: [{
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_variant: item.size || 'default'
        }]
      });
    }
  },
  
  // Track begin checkout
  beginCheckout: (cart, value) => {
    if (typeof window !== 'undefined' && window.gtag && cart && cart.length > 0) {
      window.gtag('event', 'begin_checkout', {
        currency: 'INR',
        value: value,
        items: cart.map(item => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_variant: item.size || 'default'
        }))
      });
    }
  },
  
  // Track purchase
  purchase: (order) => {
    if (typeof window !== 'undefined' && window.gtag && order) {
      window.gtag('event', 'purchase', {
        transaction_id: order.orderNumber,
        value: order.total,
        currency: 'INR',
        tax: order.tax || 0,
        shipping: order.shippingCost || 0,
        items: order.items.map(item => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_variant: item.size || 'default'
        }))
      });
    }
  }
};

export default {
  initGA,
  pageview,
  event,
  ecommerce
}; 