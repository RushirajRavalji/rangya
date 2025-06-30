/**
 * Simple internationalization utility
 */

// Default language
let currentLanguage = 'en';

// Available languages
const availableLanguages = ['en', 'hi'];

// Translation strings
const translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success!',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      required: 'Required',
      optional: 'Optional',
      yes: 'Yes',
      no: 'No',
      close: 'Close',
      confirm: 'Confirm'
    },
    
    // Navigation
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      account: 'Account',
      orders: 'Orders',
      wishlist: 'Wishlist',
      cart: 'Cart',
      checkout: 'Checkout',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      admin: 'Admin'
    },
    
    // Product related
    product: {
      price: 'Price',
      salePrice: 'Sale Price',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      addToCart: 'Add to Cart',
      addToWishlist: 'Add to Wishlist',
      removeFromWishlist: 'Remove from Wishlist',
      description: 'Description',
      details: 'Details',
      reviews: 'Reviews',
      relatedProducts: 'Related Products',
      size: 'Size',
      color: 'Color',
      quantity: 'Quantity'
    },
    
    // Cart related
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      subtotal: 'Subtotal',
      tax: 'Tax',
      shipping: 'Shipping',
      total: 'Total',
      checkout: 'Proceed to Checkout',
      continueShopping: 'Continue Shopping',
      remove: 'Remove',
      update: 'Update',
      clear: 'Clear Cart',
      itemAdded: 'Item added to cart',
      itemRemoved: 'Item removed from cart'
    },
    
    // Account related
    account: {
      profile: 'Profile',
      orders: 'Orders',
      wishlist: 'Wishlist',
      addresses: 'Addresses',
      settings: 'Settings',
      password: 'Password',
      changePassword: 'Change Password',
      updateProfile: 'Update Profile',
      orderHistory: 'Order History',
      noOrders: 'No orders found',
      emptyWishlist: 'Your wishlist is empty'
    },
    
    // Form fields
    form: {
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      address: 'Address',
      city: 'City',
      state: 'State',
      postalCode: 'Postal Code',
      country: 'Country',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      paymentMethod: 'Payment Method',
      cardNumber: 'Card Number',
      expiryDate: 'Expiry Date',
      cvv: 'CVV',
      nameOnCard: 'Name on Card'
    },
    
    // Validation messages
    validation: {
      required: '{field} is required',
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid 10-digit phone number',
      postalCode: 'Please enter a valid 6-digit postal code',
      password: 'Password must be at least 8 characters',
      passwordMatch: 'Passwords do not match'
    }
  },
  
  // Hindi translations
  hi: {
    // Common
    common: {
      loading: 'लोड हो रहा है...',
      error: 'एक त्रुटि हुई',
      success: 'सफलता!',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      search: 'खोज',
      filter: 'फ़िल्टर',
      sort: 'क्रमबद्ध करें',
      back: 'वापस',
      next: 'अगला',
      submit: 'जमा करें',
      required: 'आवश्यक',
      optional: 'वैकल्पिक',
      yes: 'हां',
      no: 'नहीं',
      close: 'बंद करें',
      confirm: 'पुष्टि करें'
    },
    
    // Navigation
    nav: {
      home: 'होम',
      products: 'उत्पाद',
      categories: 'श्रेणियाँ',
      account: 'खाता',
      orders: 'ऑर्डर',
      wishlist: 'इच्छा-सूची',
      cart: 'कार्ट',
      checkout: 'चेकआउट',
      login: 'लॉगिन',
      register: 'रजिस्टर',
      logout: 'लॉगआउट',
      admin: 'एडमिन'
    },
    
    // Product related
    product: {
      price: 'कीमत',
      salePrice: 'बिक्री मूल्य',
      outOfStock: 'स्टॉक ख़त्म',
      inStock: 'स्टॉक में',
      addToCart: 'कार्ट में जोड़ें',
      addToWishlist: 'इच्छा-सूची में जोड़ें',
      removeFromWishlist: 'इच्छा-सूची से हटाएं',
      description: 'विवरण',
      details: 'विवरण',
      reviews: 'समीक्षाएँ',
      relatedProducts: 'संबंधित उत्पाद',
      size: 'आकार',
      color: 'रंग',
      quantity: 'मात्रा'
    }
    // More translations can be added as needed
  }
};

/**
 * Set the current language
 * @param {string} lang - Language code
 * @returns {boolean} - Whether the language was set successfully
 */
export const setLanguage = (lang) => {
  if (availableLanguages.includes(lang)) {
    currentLanguage = lang;
    
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
    
    return true;
  }
  return false;
};

/**
 * Get the current language
 * @returns {string} - Current language code
 */
export const getLanguage = () => {
  return currentLanguage;
};

/**
 * Initialize language from localStorage or browser settings
 */
export const initLanguage = () => {
  if (typeof window !== 'undefined') {
    // Check localStorage first
    const storedLang = localStorage.getItem('language');
    if (storedLang && availableLanguages.includes(storedLang)) {
      currentLanguage = storedLang;
      return;
    }
    
    // Otherwise try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (availableLanguages.includes(browserLang)) {
      currentLanguage = browserLang;
    }
  }
};

/**
 * Translate a key
 * @param {string} key - Translation key (dot notation)
 * @param {Object} params - Parameters to replace in the translation
 * @returns {string} - Translated string
 */
export const t = (key, params = {}) => {
  // Split the key by dots
  const keys = key.split('.');
  
  // Get the translation object for the current language
  let translation = translations[currentLanguage];
  
  // If the language doesn't exist, fall back to English
  if (!translation) {
    translation = translations.en;
  }
  
  // Navigate through the keys
  for (const k of keys) {
    translation = translation?.[k];
    if (!translation) break;
  }
  
  // If no translation found, fall back to English
  if (!translation && currentLanguage !== 'en') {
    let fallback = translations.en;
    for (const k of keys) {
      fallback = fallback?.[k];
      if (!fallback) break;
    }
    translation = fallback || key;
  }
  
  // If still no translation, return the key
  if (!translation) {
    return key;
  }
  
  // Replace parameters in the translation
  let result = translation;
  Object.entries(params).forEach(([param, value]) => {
    result = result.replace(`{${param}}`, value);
  });
  
  return result;
};

export default {
  setLanguage,
  getLanguage,
  initLanguage,
  t,
  availableLanguages
}; 