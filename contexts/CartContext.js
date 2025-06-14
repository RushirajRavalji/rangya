import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

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

  // Debug cart state changes
  useEffect(() => {
    console.log("Cart state updated:", cartItems);
  }, [cartItems]);

  // Load cart from localStorage or Firestore on mount or when user changes
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        
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

  // Save cart to Firestore when it changes (if user is logged in)
  useEffect(() => {
    const saveCart = async () => {
      if (!currentUser || loading) return;
      
      try {
        const userCartRef = doc(db, 'userCarts', currentUser.uid);
        await setDoc(userCartRef, {
          items: cartItems,
          discount,
          promoCode,
          updatedAt: serverTimestamp(),
          userId: currentUser.uid
        }, { merge: true });
        
        // Also update localStorage with user-specific key
        const userSpecificKey = `cart_${currentUser.uid}`;
        localStorage.setItem(userSpecificKey, JSON.stringify(cartItems));
        localStorage.setItem(`${userSpecificKey}_discount`, discount);
        localStorage.setItem(`${userSpecificKey}_promoCode`, promoCode);
      } catch (error) {
        console.error('Error saving cart to Firestore:', error);
      }
    };

    saveCart();
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
      }

      console.log("Updated cart:", updatedCart);
      
      // Update state
      setCartItems(updatedCart);
      
      // Update localStorage with the appropriate key
      const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));
      
      // Force a re-render by dispatching a storage event
      window.dispatchEvent(new Event('storage'));
      
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
    
    // Update localStorage with the appropriate key
    const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
    localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    
    // Trigger storage event for other components to listen
    window.dispatchEvent(new Event('storage'));
    
    return updatedCart;
  };

  // Remove item from cart
  const removeItem = (productId, size) => {
    const updatedCart = cartItems.filter(item => 
      !(item.id === productId && item.size === size)
    );
    setCartItems(updatedCart);
    
    // Update localStorage with the appropriate key
    const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
    localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    
    // Trigger storage event for other components to listen
    window.dispatchEvent(new Event('storage'));
    
    return updatedCart;
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setPromoCode('');
    
    // Update localStorage with the appropriate key
    const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
    localStorage.setItem(storageKey, '[]');
    localStorage.setItem(`${storageKey}_discount`, '0');
    localStorage.setItem(`${storageKey}_promoCode`, '');
    
    // Trigger storage event for other components to listen
    window.dispatchEvent(new Event('storage'));
  };

  // Apply promo code
  const applyPromoCode = async (code) => {
    // In a real app, you'd validate this against a database
    // For now, we'll use hardcoded values
    if (code.toLowerCase() === 'welcome10') {
      setDiscount(10);
      setPromoCode(code);
      
      // Update localStorage with the appropriate key
      const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
      localStorage.setItem(`${storageKey}_discount`, '10');
      localStorage.setItem(`${storageKey}_promoCode`, code);
      
      return { success: true, discount: 10 };
    } else if (code.toLowerCase() === 'summer20') {
      setDiscount(20);
      setPromoCode(code);
      
      // Update localStorage with the appropriate key
      const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
      localStorage.setItem(`${storageKey}_discount`, '20');
      localStorage.setItem(`${storageKey}_promoCode`, code);
      
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
      const anonymousDiscount = Number(localStorage.getItem('cartDiscount') || '0');
      const anonymousPromoCode = localStorage.getItem('cartPromoCode') || '';
      
      if (anonymousCart.length === 0) return; // No anonymous cart to merge
      
      // Merge with current user cart
      const mergedCart = [...cartItems];
      
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
      
      // Save to Firestore and user-specific localStorage
      const userCartRef = doc(db, 'userCarts', currentUser.uid);
      await setDoc(userCartRef, {
        items: mergedCart,
        discount: Math.max(discount, anonymousDiscount),
        promoCode: anonymousDiscount > discount ? anonymousPromoCode : promoCode,
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
      }, { merge: true });
      
      // Update user-specific localStorage
      const userSpecificKey = `cart_${currentUser.uid}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(mergedCart));
      localStorage.setItem(`${userSpecificKey}_discount`, Math.max(discount, anonymousDiscount));
      localStorage.setItem(`${userSpecificKey}_promoCode`, anonymousDiscount > discount ? anonymousPromoCode : promoCode);
      
      // Clear anonymous cart
      localStorage.setItem('cart', '[]');
      localStorage.setItem('cartDiscount', '0');
      localStorage.setItem('cartPromoCode', '');
      
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
    itemCount: cartItems.reduce((count, item) => count + item.quantity, 0)
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
} 