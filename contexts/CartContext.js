import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNotification } from './NotificationContext';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const { currentUser } = useAuth();
  const isSyncingRef = useRef(false);
  const pendingUpdatesRef = useRef(null);
  const { showNotification } = useNotification();

  // Debug cart state changes
  useEffect(() => {
    console.log("Cart state updated:", cartItems);
  }, [cartItems]);

  // Load cart from localStorage or Firestore on mount or when user changes
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        isSyncingRef.current = true;
        
        // If user is logged in, try to get cart from Firestore first
        if (currentUser) {
          console.log("Loading cart for user:", currentUser.uid);
          const userCartRef = doc(db, 'userCarts', currentUser.uid);
          const cartDoc = await getDoc(userCartRef);
          
          if (cartDoc.exists()) {
            const userData = cartDoc.data();
            setCartItems(userData.items || []);
            setDiscount(userData.discount || 0);
            setPromoCode(userData.promoCode || '');
            
            // Also update localStorage for offline access with user-specific key
            const userSpecificKey = `cart_${currentUser.uid}`;
            localStorage.setItem(userSpecificKey, JSON.stringify(userData.items || []));
            localStorage.setItem(`${userSpecificKey}_discount`, userData.discount || 0);
            localStorage.setItem(`${userSpecificKey}_promoCode`, userData.promoCode || '');
            
            console.log("Loaded cart from Firestore:", userData.items || []);
          } else {
            // If no cart in Firestore, check localStorage for user-specific cart
            loadFromLocalStorage(currentUser.uid);
          }
        } else {
          // If no user is logged in, use anonymous localStorage
          loadFromLocalStorage('anonymous');
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        loadFromLocalStorage(currentUser ? currentUser.uid : 'anonymous');
      } finally {
        setLoading(false);
        isSyncingRef.current = false;
        
        // Process any pending updates that came in during sync
        if (pendingUpdatesRef.current) {
          const { items, discount, promoCode } = pendingUpdatesRef.current;
          setCartItems(items);
          setDiscount(discount);
          setPromoCode(promoCode);
          pendingUpdatesRef.current = null;
          
          // Save these pending updates
          saveCartToFirestore(items, discount, promoCode);
        }
      }
    };

    const loadFromLocalStorage = (userId) => {
      try {
        const keyPrefix = userId === 'anonymous' ? 'cart' : `cart_${userId}`;
        
        const storedCart = JSON.parse(localStorage.getItem(keyPrefix) || '[]');
        const storedDiscount = Number(localStorage.getItem(`${keyPrefix}_discount`) || '0');
        const storedPromoCode = localStorage.getItem(`${keyPrefix}_promoCode`) || '';
        
        console.log(`Loaded cart from localStorage for ${userId}:`, storedCart);
        setCartItems(storedCart);
        setDiscount(storedDiscount);
        setPromoCode(storedPromoCode);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCartItems([]);
        setDiscount(0);
        setPromoCode('');
      }
    };

    loadCart();
  }, [currentUser]);

  // Save cart to Firestore and localStorage
  const saveCartToFirestore = async (items, discountValue, promoCodeValue) => {
    if (!currentUser) {
      // For anonymous users, just save to localStorage
      localStorage.setItem('cart', JSON.stringify(items));
      localStorage.setItem('cart_discount', discountValue);
      localStorage.setItem('cart_promoCode', promoCodeValue);
      
      // Dispatch custom event for cart updates within the same tab
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { items, discount: discountValue, promoCode: promoCodeValue } 
      }));
      return;
    }
    
    // If already syncing, store this update to apply after current sync completes
    if (isSyncingRef.current) {
      pendingUpdatesRef.current = { 
        items, 
        discount: discountValue, 
        promoCode: promoCodeValue 
      };
      return;
    }
    
    try {
      isSyncingRef.current = true;
      
      // Save to Firestore
      const userCartRef = doc(db, 'userCarts', currentUser.uid);
      await setDoc(userCartRef, {
        items,
        discount: discountValue,
        promoCode: promoCodeValue,
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
      }, { merge: true });
      
      // Also update localStorage with user-specific key
      const userSpecificKey = `cart_${currentUser.uid}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(items));
      localStorage.setItem(`${userSpecificKey}_discount`, discountValue);
      localStorage.setItem(`${userSpecificKey}_promoCode`, promoCodeValue);
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: userSpecificKey,
        newValue: JSON.stringify(items)
      }));
      
      // Dispatch custom event for cart updates within the same tab
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { items, discount: discountValue, promoCode: promoCodeValue } 
      }));
    } catch (error) {
      console.error('Error saving cart to Firestore:', error);
    } finally {
      isSyncingRef.current = false;
      
      // Process any pending updates that came in during save
      if (pendingUpdatesRef.current) {
        const { items: pendingItems, discount: pendingDiscount, promoCode: pendingPromoCode } = pendingUpdatesRef.current;
        setCartItems(pendingItems);
        setDiscount(pendingDiscount);
        setPromoCode(pendingPromoCode);
        pendingUpdatesRef.current = null;
        
        // Save these pending updates (will trigger a new save cycle)
        setTimeout(() => {
          saveCartToFirestore(pendingItems, pendingDiscount, pendingPromoCode);
        }, 100);
      }
    }
  };
  
  // Save cart when it changes
  useEffect(() => {
    if (loading) return;
    saveCartToFirestore(cartItems, discount, promoCode);
  }, [cartItems, discount, promoCode, currentUser, loading]);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  // Add item to cart
  const addToCart = (product, size, quantity = 1) => {
    try {
      console.log("Adding to cart:", product, size, quantity);
      
      if (!product || !product.id) {
        console.error("Invalid product object:", product);
        return { success: false, authRequired: false, error: "Invalid product" };
      }
      
      const existingItemIndex = cartItems.findIndex(
        item => item.id === product.id && item.size === size
      );

      let updatedCart;

      if (existingItemIndex !== -1) {
        // Update quantity if item exists
        updatedCart = [...cartItems];
        updatedCart[existingItemIndex].quantity += quantity;
      } else {
        // Add new item if it doesn't exist
        const newItem = {
          id: product.id,
          name: product.name_en || product.name || "Unknown Product",
          slug: product.slug || "",
          price: product.salePrice || product.price || 0,
          originalPrice: product.price || 0,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          size,
          quantity
        };
        console.log("Creating new cart item:", newItem);
        updatedCart = [...cartItems, newItem];
        
        // Track add to cart event with analytics
        try {
          const analytics = require('../utils/analytics').default;
          analytics.ecommerce.addToCart(newItem);
        } catch (error) {
          console.error('Error tracking add to cart event:', error);
        }
      }

      console.log("Updated cart:", updatedCart);
      
      // Update state
      setCartItems(updatedCart);
      
      // Trigger cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { items: updatedCart, discount, promoCode } 
      }));
      
      // Ensure we have a valid product name for the notification
      const productName = product.name_en || product.name || "Product";
      showNotification(`Added ${productName} to cart`, 'success');
      
      return { success: true, authRequired: false, cart: updatedCart };
    } catch (error) {
      console.error("Error adding to cart:", error);
      return { success: false, authRequired: false, error: error.message };
    }
  };

  // Update item quantity
  const updateQuantity = (productId, size, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedCart = cartItems.map(item => {
      if (item.id === productId && item.size === size) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    setCartItems(updatedCart);
    
    // Trigger cart update event
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { items: updatedCart, discount, promoCode } 
    }));
    
    showNotification(`Updated quantity of ${productId} in size ${size}`, 'success');
    
    return updatedCart;
  };

  // Remove item from cart
  const removeItem = (productId, size) => {
    try {
      // Find the item to be removed
      const itemToRemove = cartItems.find(item => item.id === productId && item.size === size);
      
      if (!itemToRemove) {
        console.warn("Item not found in cart:", productId, size);
        return;
      }
      
      // Track remove from cart event with analytics
      try {
        const analytics = require('../utils/analytics').default;
        analytics.ecommerce.removeFromCart(itemToRemove);
      } catch (error) {
        console.error('Error tracking remove from cart event:', error);
      }
      
      // Filter out the item
      const updatedCart = cartItems.filter(item => !(item.id === productId && item.size === size));
      
      // Update state
      setCartItems(updatedCart);
      
      // Show notification
      showNotification('Item removed from cart', 'info');
    } catch (error) {
      console.error("Error removing item from cart:", error);
      showNotification('Failed to remove item from cart', 'error');
    }
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setPromoCode('');
    
    // Trigger cart update event
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { items: [], discount: 0, promoCode: '' } 
    }));
    
    showNotification('Cart cleared', 'info');
  };

  // Apply promo code
  const applyPromoCode = async (code) => {
    // In a real app, you'd validate this against a database
    // For now, we'll use hardcoded values
    if (code.toLowerCase() === 'welcome10') {
      setDiscount(10);
      setPromoCode(code);
      return { success: true, discount: 10 };
    } else if (code.toLowerCase() === 'summer20') {
      setDiscount(20);
      setPromoCode(code);
      return { success: true, discount: 20 };
    } else {
      return { success: false, message: 'Invalid promo code' };
    }
  };

  // Merge anonymous cart with user cart when logging in
  const mergeAnonymousCart = async () => {
    if (!currentUser) return;
    
    try {
      // Get anonymous cart from localStorage
      const anonymousCart = JSON.parse(localStorage.getItem('cart') || '[]');
      const anonymousDiscount = Number(localStorage.getItem('cart_discount') || '0');
      const anonymousPromoCode = localStorage.getItem('cart_promoCode') || '';
      
      if (anonymousCart.length === 0) return; // No anonymous cart to merge
      
      // Get user cart from Firestore
      const userCartRef = doc(db, 'userCarts', currentUser.uid);
      const userCartDoc = await getDoc(userCartRef);
      const userCart = userCartDoc.exists() ? userCartDoc.data().items || [] : [];
      
      // Merge carts, handling duplicates properly
      const mergedCart = [...userCart];
      
      // Add items from anonymous cart, updating quantities if item already exists
      anonymousCart.forEach(anonymousItem => {
        const existingItemIndex = mergedCart.findIndex(
          item => item.id === anonymousItem.id && item.size === anonymousItem.size
        );
        
        if (existingItemIndex !== -1) {
          // Update quantity if item exists
          mergedCart[existingItemIndex].quantity += anonymousItem.quantity;
        } else {
          // Add new item if it doesn't exist
          mergedCart.push(anonymousItem);
        }
      });
      
      // Update state with merged cart
      setCartItems(mergedCart);
      
      // Use the higher discount
      if (anonymousDiscount > discount) {
        setDiscount(anonymousDiscount);
        setPromoCode(anonymousPromoCode);
      }
      
      // Clear anonymous cart
      localStorage.setItem('cart', '[]');
      localStorage.setItem('cart_discount', '0');
      localStorage.setItem('cart_promoCode', '');
      
      console.log("Merged anonymous cart with user cart:", mergedCart);
    } catch (error) {
      console.error("Error merging carts:", error);
    }
  };

  // Merge anonymous cart when user logs in
  useEffect(() => {
    if (currentUser && !loading) {
      mergeAnonymousCart();
    }
  }, [currentUser, loading]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!currentUser) return;
      
      const userSpecificKey = `cart_${currentUser.uid}`;
      
      if (e.key === userSpecificKey && e.newValue) {
        try {
          const newCart = JSON.parse(e.newValue);
          setCartItems(newCart);
        } catch (error) {
          console.error('Error handling storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser]);

  // Add validation method for stock before checkout
  const validateStock = async () => {
    if (!cartItems.length) return { valid: true, outOfStockItems: [] };
    
    try {
      const outOfStock = [];
      
      // Check stock for each item
      for (const item of cartItems) {
        try {
          // Get product directly from Firestore
          const productRef = doc(db, 'products', item.id);
          const productSnapshot = await getDoc(productRef);
          
          if (!productSnapshot.exists()) {
            outOfStock.push({ ...item, reason: 'Product not found' });
            continue;
          }
          
          const product = productSnapshot.data();
          
          // Check both stock and sizes fields to handle different product data formats
          const stockField = product.stock || {};
          const sizesField = product.sizes || {};
          
          // Get stock from either field, prioritizing the stock field
          const availableStock = stockField[item.size] !== undefined ? 
            stockField[item.size] : 
            sizesField[item.size] !== undefined ? 
              sizesField[item.size] : 
              0;
          
          console.log(`Stock check for ${item.name} (${item.size}): Available=${availableStock}, Requested=${item.quantity}`);
          
          if (availableStock < item.quantity) {
            outOfStock.push({ 
              ...item, 
              reason: 'Insufficient stock', 
              available: availableStock
            });
          }
        } catch (error) {
          console.error(`Error validating stock for product ${item.id}:`, error);
          outOfStock.push({ ...item, reason: 'Error checking availability' });
        }
      }
      
      return { 
        valid: outOfStock.length === 0,
        outOfStockItems: outOfStock
      };
    } catch (err) {
      console.error('Error validating stock:', err);
      return { 
        valid: false, 
        outOfStockItems: [],
        error: 'Could not validate stock availability'
      };
    }
  };

  const value = {
    cartItems,
    loading,
    discount,
    promoCode,
    subtotal,
    discountAmount,
    total,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    validateStock,
    itemCount: cartItems.reduce((count, item) => count + item.quantity, 0),
    isEmpty: cartItems.length === 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
} 