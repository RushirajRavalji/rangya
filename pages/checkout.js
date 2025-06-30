import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Layout from '../components/layout/Layout';
import CheckoutForm from '../components/checkout/CheckoutForm';
import Image from 'next/image';
import { FiAlertCircle, FiArrowLeft, FiShoppingBag, FiLoader } from 'react-icons/fi';
import SEO from '../components/common/SEO';

const CheckoutPage = () => {
  const router = useRouter();
  const { cartItems, total, loading: cartLoading, isEmpty } = useCart();
  const { currentUser, loading: authLoading } = useAuth();
  const { showNotification } = useNotification();
  
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);
  
  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!cartLoading && isEmpty) {
      router.push('/cart');
      showNotification('Your cart is empty. Add some items before proceeding to checkout.', 'warning');
    }
  }, [cartLoading, isEmpty, router, showNotification]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login?redirect=checkout');
      showNotification('Please login to continue with checkout', 'info');
    }
  }, [authLoading, currentUser, router, showNotification]);
  
  // Enforce email verification
  useEffect(() => {
    if (!authLoading && currentUser && !currentUser.emailVerified) {
      router.push('/verify-email?redirect=checkout');
      showNotification('Please verify your email address before checkout', 'warning');
    }
  }, [authLoading, currentUser, router, showNotification]);
  
  // Track checkout start with analytics
  useEffect(() => {
    if (!authLoading && currentUser && cartItems.length > 0) {
      try {
        const analytics = require('../utils/analytics').default;
        analytics.ecommerce.beginCheckout(cartItems, total);
      } catch (error) {
        console.error('Error tracking checkout start:', error);
      }
    }
  }, [authLoading, currentUser, cartItems, total]);
  
  // Handle order placement
  const handleOrderPlaced = (newOrderId) => {
    setOrderId(newOrderId);
    setOrderPlaced(true);
  };
  
  // Handle order placement error
  const handleError = (errorMessage) => {
    setError(errorMessage);
  };
  
  // Track successful purchase with analytics
  const trackPurchase = (orderId, orderNumber) => {
    try {
      const analytics = require('../utils/analytics').default;
      
      const orderData = {
        orderNumber,
        total: total + (total > 1000 ? 0 : 100) + Math.round(total * 0.18 * 100) / 100,
        tax: Math.round(total * 0.18 * 100) / 100,
        shippingCost: total > 1000 ? 0 : 100,
        items: cartItems
      };
      
      analytics.ecommerce.purchase(orderData);
    } catch (error) {
      console.error('Error tracking purchase:', error);
    }
  };
  
  // Show loading state
  if (cartLoading || authLoading) {
    return (
      <>
        <SEO 
          title="Checkout | Rangya"
          description="Secure checkout for your Rangya order"
        />
        <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="animate-spin h-12 w-12 mx-auto text-indigo-600" />
            <p className="mt-4 text-lg text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Show empty cart message
  if (isEmpty) {
    return (
      <>
        <SEO 
          title="Empty Cart | Rangya"
          description="Your shopping cart is empty"
        />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <div className="text-center max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <FiShoppingBag className="h-16 w-16 mx-auto text-gray-400" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Your cart is empty</h1>
            <p className="mt-2 text-gray-600">Add some items to your cart before proceeding to checkout.</p>
            <div className="mt-6">
              <Link href="/products" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <FiShoppingBag className="mr-2" /> Browse Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Show login required message
  if (!currentUser) {
    return (
      <>
        <SEO 
          title="Login Required | Rangya"
          description="Please login to continue with checkout"
        />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <div className="text-center max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <FiAlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mt-2 text-gray-600">Please login to your account to continue with checkout.</p>
            <div className="mt-6">
              <Link href="/login?redirect=checkout" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Login to Continue
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <SEO 
        title="Checkout | Rangya"
        description="Complete your order securely at Rangya"
        noindex={true}
      />
      
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/cart" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
              <FiArrowLeft className="mr-2" /> Back to Cart
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <CheckoutForm onOrderPlaced={handleOrderPlaced} onError={handleError} />
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-md sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="py-4 flex space-x-4">
                      <div className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                          <p className="mt-1 text-sm text-gray-500">Size: {item.size}</p>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <p className="text-gray-500">Qty {item.quantity}</p>
                          <p className="text-gray-900">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>₹{total.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <p>Shipping</p>
                    <p>Free</p>
                  </div>
                  
                  <div className="flex justify-between text-base font-medium text-gray-900 mt-4">
                    <p>Total</p>
                    <p>₹{total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiAlertCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        We currently only support Cash on Delivery as a payment method.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;