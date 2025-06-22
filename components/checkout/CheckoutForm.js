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

const CheckoutForm = ({ onOrderPlaced }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { cartItems, total, clearCart, validateStock } = useCart();
  const { showNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'cod',
    notes: '',
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    billingAddressSameAsShipping: true,
    billingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
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
              fullName: userData.shippingInfo.fullName || userData.displayName || currentUser.displayName || prev.fullName,
              phone: userData.shippingInfo.phone || prev.phone,
              address: userData.shippingInfo.address || prev.address,
              city: userData.shippingInfo.city || prev.city,
              state: userData.shippingInfo.state || prev.state,
              postalCode: userData.shippingInfo.postalCode || prev.postalCode
            }));
          } else if (userData.displayName || currentUser.displayName) {
            // Otherwise just use the display name if available
            setFormData(prev => ({
              ...prev,
              fullName: userData.displayName || currentUser.displayName || prev.fullName
            }));
          }
        } else {
          // If no user document exists yet, just use the display name from auth
          if (currentUser.displayName) {
            setFormData(prev => ({
              ...prev,
              fullName: currentUser.displayName || prev.fullName
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
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Validate based on current step
    if (formStep === 1) {
      // Customer information validation
      if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    } else if (formStep === 2) {
      // Shipping address validation
      if (!formData.shippingAddress.street.trim()) newErrors['shippingAddress.street'] = 'Street address is required';
      if (!formData.shippingAddress.city.trim()) newErrors['shippingAddress.city'] = 'City is required';
      if (!formData.shippingAddress.state.trim()) newErrors['shippingAddress.state'] = 'State is required';
      if (!formData.shippingAddress.postalCode.trim()) {
        newErrors['shippingAddress.postalCode'] = 'Postal code is required';
      } else if (!/^\d{6}$/.test(formData.shippingAddress.postalCode.replace(/\D/g, ''))) {
        newErrors['shippingAddress.postalCode'] = 'Please enter a valid 6-digit postal code';
      }
      
      // Validate billing address if different from shipping
      if (!formData.billingAddressSameAsShipping) {
        if (!formData.billingAddress.street.trim()) newErrors['billingAddress.street'] = 'Street address is required';
        if (!formData.billingAddress.city.trim()) newErrors['billingAddress.city'] = 'City is required';
        if (!formData.billingAddress.state.trim()) newErrors['billingAddress.state'] = 'State is required';
        if (!formData.billingAddress.postalCode.trim()) {
          newErrors['billingAddress.postalCode'] = 'Postal code is required';
        } else if (!/^\d{6}$/.test(formData.billingAddress.postalCode.replace(/\D/g, ''))) {
          newErrors['billingAddress.postalCode'] = 'Please enter a valid 6-digit postal code';
        }
      }
    } else if (formStep === 3) {
      // Payment method validation
      if (!formData.paymentMethod) newErrors.paymentMethod = 'Please select a payment method';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      return;
    }
    
    if (cartItems.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // TEMPORARILY DISABLED CSRF TOKEN FETCH
      // Get CSRF token
      // const csrfToken = await fetchCsrfToken();
      
      // if (!csrfToken) {
      //   throw new Error('Could not get security token. Please refresh the page and try again.');
      // }
      
      // Prepare order data
      const orderData = {
        customer: {
          fullName: formData.fullName,
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
        total: total + (total > 1000 ? 0 : 100) + Math.round(total * 0.18 * 100) / 100
        // csrfToken: csrfToken // Include CSRF token in the request body
      };
      
      // Submit order to API
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // 'X-CSRF-Token': csrfToken // Also keep it in the header
        },
        body: JSON.stringify(orderData),
        credentials: 'include' // Important for cookies
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create order');
      }
      
      // Order created successfully
      clearCart();
      
      // Redirect to order confirmation page
      setIsPageLoading(true);
      router.push(`/order-confirmation?orderId=${result.orderId}&orderNumber=${result.orderNumber}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      showNotification(error.message || 'Failed to process your order. Please try again.', 'error');
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
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.fullName ? 'border-red-500' : ''
                }`}
              />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  className={`block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.phone ? 'border-red-500' : ''
                  }`}
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
            
            <div>
              <label htmlFor="shippingAddress.street" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                id="shippingAddress.street"
                name="shippingAddress.street"
                value={formData.shippingAddress.street}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors['shippingAddress.street'] ? 'border-red-500' : ''
                }`}
              />
              {errors['shippingAddress.street'] && (
                <p className="mt-1 text-sm text-red-600">{errors['shippingAddress.street']}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shippingAddress.city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="shippingAddress.city"
                  name="shippingAddress.city"
                  value={formData.shippingAddress.city}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors['shippingAddress.city'] ? 'border-red-500' : ''
                  }`}
                />
                {errors['shippingAddress.city'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['shippingAddress.city']}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="shippingAddress.state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="shippingAddress.state"
                  name="shippingAddress.state"
                  value={formData.shippingAddress.state}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors['shippingAddress.state'] ? 'border-red-500' : ''
                  }`}
                />
                {errors['shippingAddress.state'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['shippingAddress.state']}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shippingAddress.postalCode" className="block text-sm font-medium text-gray-700">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="shippingAddress.postalCode"
                  name="shippingAddress.postalCode"
                  value={formData.shippingAddress.postalCode}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors['shippingAddress.postalCode'] ? 'border-red-500' : ''
                  }`}
                />
                {errors['shippingAddress.postalCode'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['shippingAddress.postalCode']}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="shippingAddress.country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="shippingAddress.country"
                  name="shippingAddress.country"
                  value={formData.shippingAddress.country}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="India">India</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="billingAddressSameAsShipping"
                  name="billingAddressSameAsShipping"
                  checked={formData.billingAddressSameAsShipping}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="billingAddressSameAsShipping" className="ml-2 block text-sm text-gray-700">
                  Billing address same as shipping address
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
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                      errors['billingAddress.street'] ? 'border-red-500' : ''
                    }`}
                  />
                  {errors['billingAddress.street'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['billingAddress.street']}</p>
                  )}
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
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.city'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.city'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['billingAddress.city']}</p>
                    )}
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
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.state'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.state'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['billingAddress.state']}</p>
                    )}
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
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors['billingAddress.postalCode'] ? 'border-red-500' : ''
                      }`}
                    />
                    {errors['billingAddress.postalCode'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['billingAddress.postalCode']}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="billingAddress.country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <select
                      id="billingAddress.country"
                      name="billingAddress.country"
                      value={formData.billingAddress.country}
                      onChange={handleChange}
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
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="cod" className="ml-3 block text-sm font-medium text-gray-700">
                  Cash on Delivery
                </label>
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
                type="submit"
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
