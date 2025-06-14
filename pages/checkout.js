import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiCheck, FiAlertCircle, FiCreditCard, FiChevronRight, FiShoppingBag, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../utils/orderService';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProductById } from '../utils/productService';

export default function Checkout() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { cartItems, subtotal, total, clearCart } = useCart();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true); 
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [stockValidated, setStockValidated] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    // Shipping Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Payment Information
    paymentMethod: 'card',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    upiId: ''
  });
  
  // Redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (!currentUser && !loading) {
        router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
        showNotification('Please log in to proceed with checkout', 'warning');
      }
    };
    
    // Only run this check once when loading is complete
    if (!loading) {
      checkAuth();
    }
  }, [loading]);
  
  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && !loading) {
      router.push('/cart');
      showNotification('Your cart is empty', 'warning');
    }
  }, [cartItems, router, showNotification, loading]);

  // Validate stock availability
  useEffect(() => {
    const validateStock = async () => {
      if (!cartItems.length || stockValidated) return;
      
      try {
        setLoading(true);
        const outOfStock = [];
        
        // Check stock for each item
        for (const item of cartItems) {
          const product = await getProductById(item.id);
          
          if (!product) {
            outOfStock.push({ ...item, reason: 'Product not found' });
            continue;
          }
          
          if (!product.stock || !product.stock[item.size] || product.stock[item.size] < item.quantity) {
            outOfStock.push({ 
              ...item, 
              reason: 'Insufficient stock', 
              available: product.stock ? product.stock[item.size] || 0 : 0 
            });
          }
        }
        
        setOutOfStockItems(outOfStock);
        setStockValidated(true);
        
        if (outOfStock.length > 0) {
          setError(`Some items in your cart are no longer available in the requested quantity.`);
        }
      } catch (err) {
        console.error('Error validating stock:', err);
      } finally {
        setLoading(false);
      }
    };
    
    validateStock();
  }, [cartItems, stockValidated]);
  
  // Load user data if logged in
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        firstName: currentUser.displayName?.split(' ')[0] || '',
        lastName: currentUser.displayName?.split(' ')[1] || '',
        email: currentUser.email || '',
      }));
      setLoading(false);
    }
  }, [currentUser]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Navigate to next step
  const goToNextStep = (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }
    
    // Check for out of stock items
    if (outOfStockItems.length > 0) {
      setError(`Some items in your cart are no longer available in the requested quantity.`);
      return;
    }
    
    // Validate current step
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || 
          !formData.address || !formData.city || !formData.state || !formData.pincode) {
        setError('Please fill in all required fields');
        return;
      }
    }
    
    setStep(step + 1);
    setError(null);
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    setStep(step - 1);
    setError(null);
  };
  
  // Place order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // Check if user is logged in
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }
    
    // Check for out of stock items one more time
    if (outOfStockItems.length > 0) {
      setError(`Some items in your cart are no longer available in the requested quantity.`);
      return;
    }
    
    try {
      setPlacingOrder(true);
      setError(null);
      
      // Create order object
      const orderData = {
        userId: currentUser.uid,
        items: cartItems,
        subtotal,
        shipping: 0,
        total,
        status: 'pending',
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentMethod === 'cod' ? 'pending' : 'paid',
        customer: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone
        },
        shippingAddress: {
          fullName: `${formData.firstName} ${formData.lastName}`,
          addressLine1: formData.address,
          addressLine2: '',
          city: formData.city,
          state: formData.state,
          postalCode: formData.pincode,
          country: 'India'
        }
      };
      
      // Create order in Firestore
      const orderId = await createOrder(orderData);
      
      // Clear cart
      clearCart();
      
      // Show success notification
      showNotification('Order placed successfully!', 'success');
      
      // Redirect to order confirmation
      router.push(`/order-confirmation?id=${orderId}`);
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to place your order. Please try again.');
      showNotification('Failed to place order', 'error');
      setPlacingOrder(false);
    }
  };
  
  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Handle card number input
  const handleCardNumberChange = (e) => {
    const value = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: value }));
  };
  
  // Render checkout steps
  const renderCheckoutStep = () => {
    switch (step) {
      case 1:
        return renderShippingStep();
      case 2:
        return renderPaymentStep();
      case 3:
        return renderReviewStep();
      default:
        return renderShippingStep();
    }
  };
  
  // Shipping information step
  const renderShippingStep = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
        
        <form onSubmit={goToNextStep}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          <div className="flex justify-between">
            <Link href="/cart" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
              <FiArrowLeft className="mr-2" /> Back to Cart
            </Link>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-deep text-white rounded-md hover:bg-blue-800"
            >
              Continue to Payment <FiChevronRight className="inline ml-1" />
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Payment information step
  const renderPaymentStep = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
        
        <div className="mb-6">
          <div className="flex flex-col space-y-4">
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={formData.paymentMethod === 'card'}
                onChange={handleInputChange}
                className="mr-2"
              />
              <FiCreditCard className="mr-2" /> Credit / Debit Card
            </label>
            
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={formData.paymentMethod === 'upi'}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="mr-2">UPI</span>
            </label>
            
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={formData.paymentMethod === 'cod'}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="mr-2">Cash on Delivery</span>
            </label>
          </div>
        </div>
        
        {formData.paymentMethod === 'card' && (
          <div className="mb-6 border p-4 rounded-md">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                maxLength="19"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
              <input
                type="text"
                name="cardName"
                value={formData.cardName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  maxLength="3"
                />
              </div>
            </div>
          </div>
        )}
        
        {formData.paymentMethod === 'upi' && (
          <div className="mb-6 border p-4 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleInputChange}
                placeholder="name@upi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
              />
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            onClick={goToPreviousStep}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <FiArrowLeft className="mr-2" /> Back to Shipping
          </button>
          <button
            onClick={goToNextStep}
            className="px-6 py-2 bg-indigo-deep text-white rounded-md hover:bg-blue-800"
          >
            Review Order <FiChevronRight className="inline ml-1" />
          </button>
        </div>
      </div>
    );
  };
  
  // Order review step
  const renderReviewStep = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Review Your Order</h2>
        
        <div className="mb-6 border rounded-md overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-medium">Shipping Information</h3>
          </div>
          <div className="p-4">
            <p className="font-medium">{formData.firstName} {formData.lastName}</p>
            <p>{formData.address}</p>
            <p>{formData.city}, {formData.state} {formData.pincode}</p>
            <p>{formData.phone}</p>
            <p>{formData.email}</p>
          </div>
        </div>
        
        <div className="mb-6 border rounded-md overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-medium">Payment Method</h3>
          </div>
          <div className="p-4">
            {formData.paymentMethod === 'card' && (
              <p>Credit/Debit Card ending in {formData.cardNumber.slice(-4)}</p>
            )}
            {formData.paymentMethod === 'upi' && (
              <p>UPI: {formData.upiId}</p>
            )}
            {formData.paymentMethod === 'cod' && (
              <p>Cash on Delivery</p>
            )}
          </div>
        </div>
        
        <div className="mb-6 border rounded-md overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-medium">Order Summary</h3>
          </div>
          <div className="p-4">
            <div className="divide-y">
              {cartItems.map(item => (
                <div 
                  key={`${item.id}-${item.size}`} 
                  className="py-3 flex items-center"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mr-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <FiShoppingBag className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600">Size: {item.size}, Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            onClick={goToPreviousStep}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <FiArrowLeft className="mr-2" /> Back to Payment
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={placingOrder}
            className="px-6 py-2 bg-indigo-deep text-white rounded-md hover:bg-blue-800 flex items-center"
          >
            {placingOrder ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                Place Order <FiCheck className="ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        <Head>
          <title>Checkout | Ranga</title>
          <meta name="description" content="Complete your purchase" />
        </Head>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">Checkout</h1>
          
          {!currentUser && !loading && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 flex items-start">
              <FiAlertCircle className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Please log in to proceed with checkout</p>
                <p className="text-sm text-yellow-700 mt-1">
                  You need to be logged in to complete your purchase. 
                  <Link href={`/login?redirect=${encodeURIComponent('/checkout')}`} className="ml-1 font-medium underline">
                    Log in now
                  </Link>
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Steps */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                  <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-deep' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-600'}`}>
                      1
                    </div>
                    <span className="text-xs mt-1">Shipping</span>
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-indigo-deep' : 'bg-gray-200'}`}></div>
                  <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-deep' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-600'}`}>
                      2
                    </div>
                    <span className="text-xs mt-1">Payment</span>
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-indigo-deep' : 'bg-gray-200'}`}></div>
                  <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-deep' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-600'}`}>
                      3
                    </div>
                    <span className="text-xs mt-1">Review</span>
                  </div>
                </div>
                
                {/* Display out of stock items */}
                {outOfStockItems.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                    <h3 className="font-medium text-yellow-800 mb-2">The following items are no longer available:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {outOfStockItems.map((item, index) => (
                        <li key={index} className="text-yellow-700">
                          {item.name} (Size: {item.size}) - {item.reason}
                          {item.reason === 'Insufficient stock' && item.available > 0 && 
                            ` (Only ${item.available} available)`}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-yellow-700">
                      Please return to your cart to update these items before proceeding.
                    </p>
                    <Link href="/cart" className="mt-2 inline-block text-yellow-800 hover:text-yellow-900 font-medium">
                      Return to Cart
                    </Link>
                  </div>
                )}
                
                {/* Loading indicator */}
                {loading ? (
                  <div className="flex justify-center py-8">
                    <FiLoader className="animate-spin text-indigo-deep h-8 w-8" />
                  </div>
                ) : (
                  /* Current Step Content */
                  renderCheckoutStep()
                )}
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="divide-y">
                  {cartItems.map(item => (
                    <div 
                      key={`${item.id}-${item.size}`} 
                      className="py-3 flex items-center"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mr-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiShoppingBag className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-xs">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          Size: {item.size}, Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t mt-4 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 