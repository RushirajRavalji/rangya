import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiAlertCircle, FiCheck, FiChevronRight, FiLoader, FiMapPin, FiPhone, FiUser, FiMail } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

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
    paymentMethod: 'cashOnDelivery',
    notes: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [stockValidating, setStockValidating] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Validate form
  const validateForm = () => {
    // Required fields for all payment methods
    const requiredFields = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'postalCode'];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        showNotification(`Please fill in all required fields`, 'error');
        return false;
      }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return false;
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[0-9+\- ]{10,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      showNotification('Please enter a valid phone number', 'error');
      return false;
    }
    
    // Postal code validation (basic)
    const postalRegex = /^[0-9]{5,6}$/;
    if (!postalRegex.test(formData.postalCode)) {
      showNotification('Please enter a valid postal code', 'error');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      router.push('/login?redirect=checkout');
      showNotification('Please login to continue with checkout', 'info');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    // Validate stock availability
    setStockValidating(true);
    setStockErrors([]);
    
    try {
      const stockResult = await validateStock();
      
      if (!stockResult.valid) {
        setStockErrors(stockResult.outOfStockItems);
        showNotification('Some items in your cart are out of stock', 'error');
        setStockValidating(false);
        return;
      }
      
      // Process the order
      setLoading(true);
      
      // Prepare order data
      const orderData = {
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          userId: currentUser.uid
        },
        shipping: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          notes: formData.notes
        },
        payment: {
          method: 'cashOnDelivery',
          status: 'pending'
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image
        })),
        subtotal: total,
        total: total,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: currentUser.uid
      };
      
      // Save shipping info to user account if requested
      if (saveAddressToAccount) {
        try {
          setSavingAddress(true);
          
          await fetch('/api/orders/save-address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: currentUser.uid,
              shippingInfo: {
                fullName: formData.fullName,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                postalCode: formData.postalCode
              }
            })
          });
        } catch (error) {
          console.error('Error saving address:', error);
        } finally {
          setSavingAddress(false);
        }
      }
      
      // Process order via API
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }
      
      // Order successfully placed
      showNotification('Order placed successfully!', 'success');
      clearCart();
      
      // Call the callback function with the order ID
      if (onOrderPlaced) {
        onOrderPlaced(data.orderId);
      }
      
      // Redirect to order confirmation page
      router.push(`/order-confirmation?id=${data.orderId}`);
    } catch (error) {
      console.error('Checkout error:', error);
      showNotification(error.message || 'An error occurred during checkout. Please try again.', 'error');
    } finally {
      setLoading(false);
      setStockValidating(false);
    }
  };
  
  // If not authenticated, don't render the form
  if (!currentUser) {
    return null;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Stock Errors */}
      {stockErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Stock Issues
              </h3>
              <div className="mt-2 text-sm text-red-700">
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
      
      {/* Contact Information */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="John Doe"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="you@example.com"
                required
                readOnly={currentUser?.email ? true : false}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiPhone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="+91 9876543210"
                required
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Shipping Information */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Shipping Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="123 Main St, Apt 4B"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Mumbai"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Maharashtra"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="400001"
                required
              />
            </div>
          </div>
          
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Order Notes (Optional)
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Any special instructions for delivery"
              ></textarea>
            </div>
          </div>
          
          <div className="sm:col-span-2">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="saveAddressToAccount"
                  name="saveAddressToAccount"
                  type="checkbox"
                  checked={saveAddressToAccount}
                  onChange={() => setSaveAddressToAccount(!saveAddressToAccount)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="saveAddressToAccount" className="font-medium text-gray-700">
                  Save this address to my account
                </label>
                <p className="text-gray-500">We'll save this address for future orders.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Method */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Payment Method</h2>
        <div className="mt-4">
          <div className="flex items-center">
            <input
              id="cashOnDelivery"
              name="paymentMethod"
              type="radio"
              value="cashOnDelivery"
              checked={true}
              readOnly
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="cashOnDelivery" className="ml-3 block text-sm font-medium text-gray-700">
              Cash on Delivery
            </label>
          </div>
          
          <div className="rounded-md bg-blue-50 p-4 mt-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Pay with cash upon delivery. Our delivery partner will collect the payment when your order arrives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading || stockValidating || savingAddress}
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading || stockValidating || savingAddress ? (
            <>
              <FiLoader className="animate-spin h-5 w-5 mr-2" />
              {stockValidating ? 'Checking Stock...' : loading ? 'Processing Order...' : 'Saving Address...'}
            </>
          ) : (
            <>
              Complete Order <FiChevronRight className="ml-2" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CheckoutForm;

