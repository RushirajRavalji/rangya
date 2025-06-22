import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiTrash2, FiShoppingBag, FiArrowRight, FiMinus, FiPlus, FiX, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { isBase64Image } from '../utils/imageUtils';

export default function CartPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { 
    cartItems, 
    updateQuantity, 
    removeItem, 
    applyPromoCode, 
    subtotal, 
    total, 
    discountAmount, 
    loading: cartLoading,
    validateStock 
  } = useCart();
  const { showNotification } = useNotification();
  const [promoCode, setPromoCode] = useState('');
  const [localCartItems, setLocalCartItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [validatingStock, setValidatingStock] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if cart is empty
  const isCartEmpty = !localCartItems || localCartItems.length === 0;

  // Load cart items from context
  useEffect(() => {
    console.log("Cart items from context:", cartItems);
    setLocalCartItems(cartItems || []);
    setLoading(false);
  }, [cartItems]);

  // Redirect to home page if cart is empty
  useEffect(() => {
    if (isCartEmpty && !loading) {
      router.push('/');
    }
  }, [isCartEmpty, loading, router]);

  // Listen for storage events (when cart is updated from another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storageKey = currentUser ? `cart_${currentUser.uid}` : 'cart';
        const storedCart = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setLocalCartItems(storedCart);
      } catch (error) {
        console.error("Error handling storage event:", error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser]);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle quantity updates
  const handleQuantityChange = (productId, size, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(productId, size, newQuantity);
  };

  // Remove item from cart
  const handleRemoveItem = (productId, size) => {
    removeItem(productId, size);
    showNotification('Item removed from cart', 'info');
  };

  // Proceed to checkout
  const handleCheckout = async () => {
    // Validate stock before proceeding
    try {
      setValidatingStock(true);
      setStockErrors([]);
      
      const stockValidation = await validateStock();
      
      if (!stockValidation.valid) {
        setStockErrors(stockValidation.outOfStockItems);
        showNotification('Some items in your cart are out of stock or unavailable', 'error');
        return;
      }
      
      // If logged in, proceed to checkout
      if (currentUser) {
        router.push('/checkout');
      } else {
        // If not logged in, redirect to login with return URL
        router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      }
    } catch (error) {
      console.error('Error validating stock:', error);
      showNotification('Error checking stock availability', 'error');
    } finally {
      setValidatingStock(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      showNotification('Please enter a promo code', 'warning');
      return;
    }
    
    const result = await applyPromoCode(promoCode);
    
    if (result.success) {
      showNotification(`Promo code applied! ${result.discount}% discount`, 'success');
    } else {
      showNotification(result.message || 'Invalid promo code', 'error');
    }
  };

  const finalTotal = total;

  // Empty cart message
  if (isClient && !loading && cartItems.length === 0) {
    return (
      <>
        <Head>
          <title>Shopping Cart | Ranga</title>
          <meta name="description" content="View your shopping cart and proceed to checkout" />
        </Head>
        
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
          
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-gray-100">
              <FiShoppingBag className="text-3xl text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added any products to your cart yet.</p>
            <Link href="/products" className="bg-indigo-deep text-white px-6 py-3 rounded-md hover:bg-blue-800 transition-colors">
              Start Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  // Loading state during initial mount or user authentication
  if (loading || !isClient) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-24 rounded-md mb-4"></div>
          <div className="bg-gray-200 h-24 rounded-md mb-4"></div>
          <div className="bg-gray-200 h-24 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Shopping Cart | Ranga</title>
        <meta name="description" content="View your shopping cart and proceed to checkout" />
      </Head>

      <div className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

        {stockErrors.length > 0 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Availability issues
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {stockErrors.map((item, index) => (
                      <li key={index}>
                        <strong>{item.name}</strong> (Size: {item.size}) - {item.reason}
                        {item.reason === 'Insufficient stock' && item.available > 0 && 
                          ` (Only ${item.available} available)`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
              <div className="divide-y divide-gray-200">
                {localCartItems.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="py-4 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-24 h-24 mb-4 sm:mb-0 bg-gray-100 rounded-md overflow-hidden">
                      {item.image ? (
                        <img 
                          src={isBase64Image(item.image) ? item.image : `/images/products/${item.image}`} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-500 text-sm">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 sm:ml-6 flex flex-col sm:flex-row justify-between">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">Size: {item.size}</p>
                        <p className="text-indigo-deep font-medium mt-1">
                          ₹{item.price.toFixed(2)}
                          {item.originalPrice > item.price && (
                            <span className="text-gray-500 line-through text-sm ml-2">
                              ₹{item.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center mt-4 sm:mt-0">
                        <div className="flex items-center border border-gray-300 rounded-md">
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.size, item.quantity - 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                            disabled={item.quantity <= 1}
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="px-3 py-1 text-center w-10">{item.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.size, item.quantity + 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(item.id, item.size)}
                          className="ml-4 text-red-500 hover:text-red-700"
                          aria-label="Remove item"
                        >
                          <FiX size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-4">
                  <span>Total</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
                
                <div className="mt-6">
                  <label htmlFor="promo" className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Code
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="promo"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-deep focus:border-indigo-deep sm:text-sm"
                      placeholder="Enter code"
                    />
                    <button
                      onClick={handleApplyPromoCode}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-deep hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={validatingStock || localCartItems.length === 0}
                  className="w-full bg-indigo-deep text-white px-6 py-3 rounded-md hover:bg-blue-800 transition-colors flex items-center justify-center"
                >
                  {validatingStock ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking stock...
                    </>
                  ) : (
                    <>Proceed to Checkout</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 