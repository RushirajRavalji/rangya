// Checkout Form Component
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiAlertCircle, FiCheck, FiChevronRight, FiLoader, FiMapPin, FiPhone, FiUser, FiMail, FiCreditCard } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { fetchCsrfToken } from '../../utils/csrf';
import { reserveStock, releaseStockReservation } from '../../utils/productService';
import { validateForm as validateFormFields } from '../../utils/validationUtils';
import { placeOrder } from '../../utils/orderUtils';
import { loadRazorpayScript, isRazorpayAvailable, createRazorpayInstance } from '../../utils/razorpayLoader';

const CheckoutForm = ({ onOrderPlaced, onError }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { cartItems, total, clearCart, validateStock } = useCart();
  const { showNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    shippingAddress: {
      fullName: '',
      flatNo: '',
      buildingName: '',
      street: '',
      landmark: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      phone: ''
    },
    billingAddressSameAsShipping: true,
    billingAddress: {},
    paymentMethod: 'cod',
    notes: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [stockValidating, setStockValidating] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formStep, setFormStep] = useState(1); // 1: Customer info, 2: Shipping, 3: Payment
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      router.push('/login?redirect=checkout');
      showNotification('Please login to continue with checkout', 'info');
    }
  }, [currentUser, router, showNotification]);
  
  // Load user data if available
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      
      try {
        // Set email from auth
        setFormData(prev => ({
          ...prev,
          email: currentUser.email || prev.email
        }));
        
        // Try to get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If user has shipping info, use it
          if (userData.shippingInfo) {
            setFormData(prev => ({
              ...prev,
              customerName: userData.shippingInfo.fullName || userData.displayName || currentUser.displayName || prev.customerName,
              phone: userData.shippingInfo.phone || prev.phone,
              shippingAddress: {
                ...prev.shippingAddress,
                fullName: userData.shippingInfo.fullName || userData.shippingInfo.name || prev.shippingAddress.fullName,
                flatNo: userData.shippingInfo.flatNo || prev.shippingAddress.flatNo,
                buildingName: userData.shippingInfo.buildingName || prev.shippingAddress.buildingName,
                street: userData.shippingInfo.address || prev.shippingAddress.street,
                landmark: userData.shippingInfo.landmark || prev.shippingAddress.landmark,
                city: userData.shippingInfo.city || prev.shippingAddress.city,
                state: userData.shippingInfo.state || prev.shippingAddress.state,
                postalCode: userData.shippingInfo.postalCode || prev.shippingAddress.postalCode,
                country: userData.shippingInfo.country || prev.shippingAddress.country,
                phone: userData.shippingInfo.phone || prev.shippingAddress.phone
              },
              billingAddressSameAsShipping: userData.shippingInfo.sameAsShipping || true,
              billingAddress: userData.shippingInfo.sameAsShipping ? userData.shippingInfo : {}
            }));
          } else if (userData.displayName || currentUser.displayName) {
            // Otherwise just use the display name if available
            setFormData(prev => ({
              ...prev,
              customerName: userData.displayName || currentUser.displayName || prev.customerName
            }));
          }
        } else {
          // If no user document exists yet, just use the display name from auth
          if (currentUser.displayName) {
            setFormData(prev => ({
              ...prev,
              customerName: currentUser.displayName || prev.customerName
            }));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Still set the email even if there's an error
        setFormData(prev => ({
          ...prev,
          email: currentUser.email || prev.email
        }));
      }
    };
    
    loadUserData();
  }, [currentUser]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'billingAddressSameAsShipping') {
      setFormData(prev => ({
        ...prev,
        billingAddressSameAsShipping: checked
      }));
      return;
    }
    
    // Handle nested fields (shipping and billing address)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for the field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Handle shipping address change
  const handleShippingAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value
      }
    }));
  };
  
  // Validate form
  const validateForm = () => {
    // Define validation schema based on current step
    let validationSchema = {};
    
    if (formStep === 1) {
      // Customer information validation schema
      validationSchema = {
        customerName: { required: true, label: 'Full Name' },
        email: { required: true, type: 'email', label: 'Email Address' },
        phone: { required: true, type: 'phone', label: 'Phone Number' }
      };
    } else if (formStep === 2) {
      // Shipping address validation schema
      validationSchema = {
        'shippingAddress.street': { required: true, label: 'Street Address' },
        'shippingAddress.city': { required: true, label: 'City' },
        'shippingAddress.state': { required: true, label: 'State' },
        'shippingAddress.postalCode': { required: true, type: 'postalCode', label: 'Postal Code' }
      };
      
      // Add billing address validation if different from shipping
      if (!formData.billingAddressSameAsShipping) {
        validationSchema = {
          ...validationSchema,
          'billingAddress.street': { required: true, label: 'Billing Street Address' },
          'billingAddress.city': { required: true, label: 'Billing City' },
          'billingAddress.state': { required: true, label: 'Billing State' },
          'billingAddress.postalCode': { required: true, type: 'postalCode', label: 'Billing Postal Code' }
        };
      }
    } else if (formStep === 3) {
      // Payment method validation schema
      validationSchema = {
        paymentMethod: { required: true, label: 'Payment Method' }
      };
    }
    
    // Validate using our utility
    const { errors: newErrors, isValid } = validateFormFields(formData, validationSchema);
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Handle form navigation
  const handleNextStep = () => {
    if (validateForm()) {
      setFormStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handlePrevStep = () => {
    setFormStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    if (cartItems.length === 0) {
      showNotification('Your cart is empty', 'error');
      console.log('Cart is empty');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Starting order submission process');
      
      // Validate stock and create reservations
      setStockValidating(true);
      console.log('Validating stock and creating reservations');
      
      // Generate a session ID for this checkout
      const sessionId = currentUser ? currentUser.uid : `anon-${Date.now()}`;
      console.log('Session ID for checkout:', sessionId);
      
      // Reserve stock for each item
      const reservationPromises = cartItems.map(async (item) => {
        const reservation = await reserveStock(item.id, item.size, item.quantity, sessionId);
        
        if (!reservation.success) {
          console.log(`Stock reservation failed for item ${item.name} (${item.size}):`, reservation.message);
          return {
            success: false,
            productId: item.id,
            name: item.name,
            size: item.size,
            message: reservation.message
          };
        }
        
        return {
          success: true,
          productId: item.id,
          reservationId: reservation.reservationId,
          expiresAt: reservation.expiresAt
        };
      });
      
      const reservationResults = await Promise.all(reservationPromises);
      const failedReservations = reservationResults.filter(r => !r.success);
      
      if (failedReservations.length > 0) {
        // Some reservations failed
        setStockErrors(failedReservations.map(r => `${r.name} (${r.size}): ${r.message}`));
        setStockValidating(false);
        setIsSubmitting(false);
        console.log('Stock reservation failed for some items:', failedReservations);
        onError('Stock reservation failed for some items. Please check availability.');
        return;
      }
      
      setStockValidating(false);
      console.log('Stock validation and reservation successful');
      
      // Get CSRF token
      console.log('Fetching CSRF token...');
      let csrfToken = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!csrfToken && retryCount < maxRetries) {
        try {
          csrfToken = await fetchCsrfToken();
          console.log('CSRF token received:', csrfToken ? 'Yes' : 'No');
          
          if (!csrfToken) {
            retryCount++;
            console.log(`CSRF token fetch failed, retrying (${retryCount}/${maxRetries})...`);
            // Wait with increasing backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        } catch (error) {
          console.error('Error fetching CSRF token:', error);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!csrfToken) {
        console.error('Failed to get CSRF token after retries');
        onError('Could not get security token. Please refresh the page and try again.');
        throw new Error('Could not get security token. Please refresh the page and try again.');
      }
      
      // Prepare order data
      const orderData = {
        customer: {
          fullName: formData.customerName,
          email: formData.email,
          phone: formData.phone
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image
        })),
        shipping: {
          address: formData.shippingAddress
        },
        billing: {
          sameAsShipping: formData.billingAddressSameAsShipping,
          address: formData.billingAddressSameAsShipping 
            ? formData.shippingAddress 
            : formData.billingAddress
        },
        payment: {
          method: formData.paymentMethod
        },
        subtotal: total,
        tax: Math.round(total * 0.18 * 100) / 100, // 18% tax
        shippingCost: total > 1000 ? 0 : 100, // Free shipping over ₹1000
        total: total + (total > 1000 ? 0 : 100) + Math.round(total * 0.18 * 100) / 100,
        csrfToken: csrfToken, // Include CSRF token in the request body
        stockReservations: reservationResults.filter(r => r.success).map(r => ({
          productId: r.productId,
          reservationId: r.reservationId
        }))
      };
      
      console.log('Submitting order with data:', orderData);
      
      // Handle different payment methods
       if (formData.paymentMethod === 'card' || formData.paymentMethod === 'upi') {
         // Load Razorpay script if not already loaded
         const razorpayLoadResult = await loadRazorpayScript();
         
         // Check if Razorpay is available in the environment
         if (!razorpayLoadResult.success) {
           showNotification(`Payment gateway could not be loaded: ${razorpayLoadResult.error || 'Unknown error'}. Please try again later or choose Cash on Delivery.`, 'error');
           setIsSubmitting(false);
           return;
         }
         
         // Double-check that Razorpay is available
         if (!isRazorpayAvailable()) {
           showNotification('Payment gateway is not available after loading. Please try again later or choose Cash on Delivery.', 'error');
           setIsSubmitting(false);
           return;
         }
        
        // Prepare order data for placeOrder function
        const placeOrderData = {
          userId: currentUser.uid,
          shippingAddress: formData.shippingAddress,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          paymentMethod: formData.paymentMethod,
          subtotal: total,
          shippingFee: total > 1000 ? 0 : 100, // Free shipping over ₹1000
          tax: Math.round(total * 0.18 * 100) / 100, // 18% tax
          totalAmount: total + (total > 1000 ? 0 : 100) + Math.round(total * 0.18 * 100) / 100
        };
        
        // Place the order using the placeOrder function
        const result = await placeOrder(placeOrderData);
        
        if (!result.success) {
          onError(result.message || 'Failed to create order. Please try again.');
          throw new Error(result.message || 'Failed to create order');
        }
        
        // Initialize payment
        try {
          const paymentInitResponse = await fetch('/api/payments/initialize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
              orderId: result.orderId,
              amount: Math.round(placeOrderData.totalAmount * 100), // Convert to paise
              paymentMethod: formData.paymentMethod,
              currency: 'INR',
              customerName: formData.customerName,
              customerEmail: formData.email,
              customerPhone: formData.phone,
              vpa: '' // For UPI, if provided by user
            })
          });
          
          const paymentInitData = await paymentInitResponse.json();
          
          if (!paymentInitData.success) {
            throw new Error(paymentInitData.message || 'Failed to initialize payment');
          }
          
          // Create Razorpay options
          const options = {
            ...paymentInitData.data,
            handler: async function(response) {
              try {
                // Verify payment
                const verifyResponse = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                  },
                  body: JSON.stringify({
                    orderId: result.orderId,
                    ...response
                  })
                });
                
                const verifyData = await verifyResponse.json();
                
                if (verifyData.success) {
                  // Payment successful
                  clearCart();
                  
                  // Call the onOrderPlaced callback if provided
                  if (onOrderPlaced) {
                    onOrderPlaced(result.orderId, result.orderNumber);
                  }
                  
                  // Redirect to order confirmation page after order placement
                  setIsPageLoading(true);
                  router.push(`/order-confirmation?id=${result.orderId}`);
                } else {
                  throw new Error(verifyData.message || 'Payment verification failed');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                onError('Payment verification failed. Please contact support with your order ID.');
                setIsSubmitting(false);
              }
            },
            modal: {
              ondismiss: function() {
                console.log('Payment modal closed');
                setIsSubmitting(false);
              }
            }
          };
          
          // Create and open Razorpay payment form
          try {
            const razorpayInstance = createRazorpayInstance(options);
            
            if (!razorpayInstance) {
              throw new Error('Failed to create Razorpay instance');
            }
            
            razorpayInstance.open();
          } catch (error) {
            console.error('Error creating Razorpay instance:', error);
            onError('Failed to open payment gateway. Please try again or choose Cash on Delivery.');
            setIsSubmitting(false);
          }
          
          // Release stock reservations as they're handled by the order
          await Promise.all(
            reservationResults
              .filter(r => r.success)
              .map(r => releaseStockReservation(r.productId, r.reservationId))
          );
          
        } catch (error) {
          console.error('Payment initialization error:', error);
          onError('Failed to initialize payment. Please try again or choose Cash on Delivery.');
          setIsSubmitting(false);
        }
      } else if (formData.paymentMethod === 'cod') {
        // For Cash on Delivery
        // Prepare order data for placeOrder function
        const placeOrderData = {
          userId: currentUser.uid,
          shippingAddress: formData.shippingAddress,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          paymentMethod: formData.paymentMethod,
          subtotal: total,
          shippingFee: total > 1000 ? 0 : 100, // Free shipping over ₹1000
          tax: Math.round(total * 0.18 * 100) / 100, // 18% tax
          totalAmount: total + (total > 1000 ? 0 : 100) + Math.round(total * 0.18 * 100) / 100
        };
        
        // Place the order using the placeOrder function
        const result = await placeOrder(placeOrderData);
        
        // Release stock reservations as they're no longer needed (placeOrder handles inventory)
        await Promise.all(
          reservationResults
            .filter(r => r.success)
            .map(r => releaseStockReservation(r.productId, r.reservationId))
        );
        
        if (!result.success) {
          onError(result.message || 'Failed to create order. Please try again.');
          throw new Error(result.message || 'Failed to create order');
        }
        
        // Create a result object similar to the API response
        const orderResult = {
          orderId: result.orderId,
          orderNumber: `RNG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'pending',
          message: 'Order created successfully'
        }
        console.log('Order created successfully:', orderResult);
        
        // Order created successfully
        clearCart();
        
        // Call the onOrderPlaced callback if provided
        if (onOrderPlaced) {
          onOrderPlaced(orderResult.orderId, orderResult.orderNumber);
        }
        
        // Redirect to order confirmation page after order placement
        setIsPageLoading(true);
        router.push(`/order-confirmation?id=${orderResult.orderId}`);
      } else {
        // Invalid payment method
        showNotification('Invalid payment method. Please select a valid payment method.', 'error');
        setIsSubmitting(false);
      }
      
      if (!result.success) {
        onError(result.message || 'Failed to create order. Please try again.');
        throw new Error(result.message || 'Failed to create order');
      }
      
      // Create a result object similar to the API response
      const orderResult = {
        orderId: result.orderId,
        orderNumber: `RNG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'pending',
        message: 'Order created successfully'
      }
      console.log('Order created successfully:', orderResult);
      
      // Order created successfully
      clearCart();
      
      // Call the onOrderPlaced callback if provided
      if (onOrderPlaced) {
        onOrderPlaced(orderResult.orderId, orderResult.orderNumber);
      }
      
      // Redirect to order confirmation page after order placement
      setIsPageLoading(true);
      router.push(`/order-confirmation?id=${orderResult.orderId}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      onError(error.message || 'Failed to process your order. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Show loading screen when redirecting
  if (isPageLoading) {
    return <LoadingSpinner fullScreen text="Processing your order..." />;
  }
  
  // Render form steps
  const renderFormStep = () => {
    switch (formStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FiUser className="mr-2" /> Customer Information
            </h2>
            
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={e => handleShippingAddressChange('fullName', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.customerName ? 'border-red-500' : ''
                }`}
              />
              {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FiMail />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={e => handleShippingAddressChange('email', e.target.value)}
                  className={`block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <FiPhone />
                </span>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={`block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.phone ? 'border-red-500' : ''
                  }`}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength="10"
                  placeholder="10-digit number"
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleNextStep}
                variant="primary"
              >
                Continue to Shipping
              </Button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FiMapPin className="mr-2" /> Shipping Address
            </h2>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.shippingAddress.fullName || ''}
                    onChange={e => handleShippingAddressChange('fullName', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="flatNo" className="block text-sm font-medium text-gray-700 mb-1">Flat/House No. *</label>
                  <input
                    type="text"
                    id="flatNo"
                    name="flatNo"
                    value={formData.shippingAddress.flatNo || ''}
                    onChange={e => handleShippingAddressChange('flatNo', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="buildingName" className="block text-sm font-medium text-gray-700 mb-1">Building/Society Name</label>
                  <input
                    type="text"
                    id="buildingName"
                    name="buildingName"
                    value={formData.shippingAddress.buildingName || ''}
                    onChange={e => handleShippingAddressChange('buildingName', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street/Area *</label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.shippingAddress.street || ''}
                    onChange={e => handleShippingAddressChange('street', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    value={formData.shippingAddress.landmark || ''}
                    onChange={e => handleShippingAddressChange('landmark', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="E.g., Near Post Office"
                  />
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.shippingAddress.city || ''}
                    onChange={e => handleShippingAddressChange('city', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.shippingAddress.state || ''}
                    onChange={e => handleShippingAddressChange('state', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.shippingAddress.postalCode || ''}
                    onChange={e => handleShippingAddressChange('postalCode', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.shippingAddress.country || 'India'}
                    onChange={e => handleShippingAddressChange('country', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.shippingAddress.phone || ''}
                    onChange={e => handleShippingAddressChange('phone', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength="10"
                    placeholder="10-digit number"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.billingAddressSameAsShipping}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      billingAddressSameAsShipping: !prev.billingAddressSameAsShipping
                    }))}
                    className="form-checkbox h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Billing address same as shipping address</span>
                </label>
              </div>
            </div>
            
            {!formData.billingAddressSameAsShipping && (
              <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
                
                <div>
                  <label htmlFor="billingAddress.street" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="billingAddress.street"
                    name="billingAddress.street"
                    value={formData.billingAddress.street}
                    onChange={e => handleShippingAddressChange('street', e.target.value)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                      errors['billingAddress.street'] ? 'border-red-500' : ''
                    }`}
                  />
                  {errors['billingAddress.street'] && <p className="mt-1 text-sm text-red-600">{errors['billingAddress.street']}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billingAddress.city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="billingAddress.city"
                      name="billingAddress.city"
                      value={formData.billingAddress.city}
                      onChange={e => handleShippingAddressChange('city', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.city'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.city'] && <p className="mt-1 text-sm text-red-600">{errors['billingAddress.city']}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="billingAddress.state" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <input
                      type="text"
                      id="billingAddress.state"
                      name="billingAddress.state"
                      value={formData.billingAddress.state}
                      onChange={e => handleShippingAddressChange('state', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.state'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.state'] && <p className="mt-1 text-sm text-red-600">{errors['billingAddress.state']}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billingAddress.postalCode" className="block text-sm font-medium text-gray-700">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="billingAddress.postalCode"
                      name="billingAddress.postalCode"
                      value={formData.billingAddress.postalCode}
                      onChange={e => handleShippingAddressChange('postalCode', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.postalCode'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.postalCode'] && <p className="mt-1 text-sm text-red-600">{errors['billingAddress.postalCode']}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="billingAddress.country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <select
                      id="billingAddress.country"
                      name="billingAddress.country"
                      value={formData.billingAddress.country}
                      onChange={e => handleShippingAddressChange('country', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="India">India</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-4 flex justify-between">
              <Button 
                onClick={handlePrevStep}
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleNextStep}
                variant="primary"
              >
                Continue to Payment
              </Button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FiCreditCard className="mr-2" /> Payment Method
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="cod"
                  name="paymentMethod"
                  type="radio"
                  value="cod"
                  checked={formData.paymentMethod === 'cod'}
                  onChange={e => handleShippingAddressChange('paymentMethod', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="cod" className="ml-3 block text-sm font-medium text-gray-700">
                  Cash on Delivery
                </label>
              </div>
              
              <div className="flex items-center opacity-60">
                <input
                  id="card"
                  name="paymentMethod"
                  type="radio"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={e => handleShippingAddressChange('paymentMethod', e.target.value)}
                  disabled
                  className="h-4 w-4 text-gray-400 focus:ring-gray-300 border-gray-300 cursor-not-allowed"
                />
                <label htmlFor="card" className="ml-3 block text-sm font-medium text-gray-500 cursor-not-allowed">
                  Credit/Debit Card (Coming Soon)
                </label>
              </div>
              
              <div className="flex items-center opacity-60">
                <input
                  id="upi"
                  name="paymentMethod"
                  type="radio"
                  value="upi"
                  checked={formData.paymentMethod === 'upi'}
                  onChange={e => handleShippingAddressChange('paymentMethod', e.target.value)}
                  disabled
                  className="h-4 w-4 text-gray-400 focus:ring-gray-300 border-gray-300 cursor-not-allowed"
                />
                <label htmlFor="upi" className="ml-3 block text-sm font-medium text-gray-500 cursor-not-allowed">
                  UPI (Coming Soon)
                </label>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <FiAlertCircle className="inline-block mr-2" />
                  Currently, only Cash on Delivery is available. Online payment options will be available soon.
                </p>
              </div>
              
              {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
            </div>
            
            <div className="pt-4 flex justify-between">
              <Button 
                onClick={handlePrevStep}
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                variant="primary"
                isLoading={isSubmitting}
              >
                Place Order
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // If not authenticated, don't render the form
  if (!currentUser) {
    return null;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${
            formStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <FiUser />
          </div>
          <div className={`h-1 w-12 ${formStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        </div>
        
        <div className="flex items-center">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${
            formStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <FiMapPin />
          </div>
          <div className={`h-1 w-12 ${formStep >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
        </div>
        
        <div className="flex items-center">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${
            formStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <FiCreditCard />
          </div>
        </div>
      </div>
      
      {/* Form steps */}
      {renderFormStep()}
    </form>
  );
};

export default CheckoutForm;
