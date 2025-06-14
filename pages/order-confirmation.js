import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiCheckCircle, FiPackage, FiTruck, FiHome, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import { getOrderById } from '../utils/orderService';
import OptimizedImage from '../components/common/OptimizedImage';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function OrderConfirmation() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      
      // Check if user is logged in
      if (!currentUser) {
        setError('Please log in to view your order');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const orderData = await getOrderById(id);
        
        if (orderData) {
          // Verify that this order belongs to the current user or user is admin
          if (orderData.userId === currentUser.uid || currentUser.role === 'admin') {
            setOrder(orderData);
          } else {
            setError('You do not have permission to view this order');
            showNotification('Unauthorized access attempt', 'error');
          }
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrder();
  }, [id, currentUser, showNotification]);
  
  // Add a button to go back to home page
  const goToHomePage = () => {
    router.push('/');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FiLoader className="animate-spin text-indigo-deep h-8 w-8 mb-4" />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <FiAlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="mb-6">{error || 'Order not found'}</p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/account/orders" 
              className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 transition-colors duration-200"
            >
              My Orders
            </Link>
            <Link 
              href="/" 
              className="bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  // Calculate estimated delivery date (7 days from order date)
  const getEstimatedDelivery = () => {
    if (!order.createdAt) return 'To be determined';
    
    try {
      const createdDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const deliveryDate = new Date(createdDate);
      deliveryDate.setDate(deliveryDate.getDate() + 7);
      
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(deliveryDate);
    } catch (err) {
      console.error('Error calculating delivery date:', err);
      return 'To be determined';
    }
  };
  
  // Get progress percentage based on status
  const getProgressPercentage = () => {
    switch (order.status) {
      case 'pending':
        return '0%';
      case 'processing':
        return '33%';
      case 'shipped':
        return '66%';
      case 'delivered':
        return '100%';
      case 'cancelled':
        return '0%';
      default:
        return '0%';
    }
  };
  
  // Get status class based on status
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <>
      <Head>
        <title>Order Confirmation | Ranga</title>
        <meta name="description" content="Your order has been placed successfully" />
        <meta name="robots" content="noindex" /> {/* Don't index order pages */}
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 flex items-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-800">Order Placed Successfully!</h1>
              <p className="text-green-700">
                Thank you for your order. We've received your request and will process it shortly.
              </p>
              <button
                onClick={goToHomePage}
                className="mt-4 bg-indigo-deep text-white px-6 py-2 rounded-md hover:bg-blue-800 transition-colors flex items-center"
              >
                <FiHome className="mr-2" /> Continue Shopping
              </button>
            </div>
          </div>
          
          {/* Order Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="border-b border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                  <h2 className="text-lg font-semibold">Order #{order.id ? order.id.slice(0, 8) : 'Unknown'}</h2>
                  <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="mt-2 md:mt-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Order Timeline */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Order Status</h3>
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full ${order.status ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center`}>
                      <FiCheckCircle className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${order.status ? 'text-indigo-deep' : 'text-gray-500'}`}>Order Placed</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center`}>
                      <FiPackage className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? 'text-indigo-deep' : 'text-gray-500'}`}>Processing</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full ${order.status === 'shipped' || order.status === 'delivered' ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center`}>
                      <FiTruck className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${order.status === 'shipped' || order.status === 'delivered' ? 'text-indigo-deep' : 'text-gray-500'}`}>Shipped</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full ${order.status === 'delivered' ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center`}>
                      <FiHome className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${order.status === 'delivered' ? 'text-indigo-deep' : 'text-gray-500'}`}>Delivered</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
                  <div className="absolute top-0 left-0 h-full bg-indigo-deep" style={{ width: getProgressPercentage() }} />
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm">
                  Estimated Delivery: <span className="font-medium">{getEstimatedDelivery()}</span>
                </p>
              </div>
            </div>
            
            {order && (
            <div className="border-t border-gray-200 py-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Shipping Address</h3>
                    <p className="mt-1 text-sm">{order.customer.name}</p>
                    <p className="text-sm">{order.customer.address}</p>
                    <p className="text-sm">{order.customer.city}, {order.customer.state} {order.customer.pincode}</p>
                    <p className="text-sm">{order.customer.phone}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                    <p className="mt-1 text-sm">
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}
                    </p>
                    
                    <h3 className="text-sm font-medium text-gray-500 mt-4">Order Status</h3>
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              
                <h3 className="text-sm font-medium text-gray-500 mb-4">Order Items</h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={`${item.id}-${item.size}-${index}`} className="flex py-2">
                      <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden mr-4">
                        {item.image ? (
                          <OptimizedImage
                            src={item.image}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">Size: {item.size}</p>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs">₹{item.price} × {item.quantity}</p>
                          <p className="text-sm font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-full md:w-1/2 space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-sm font-medium">₹{order.subtotal.toFixed(2)}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600">Shipping</p>
                        <p className="text-sm font-medium">
                          {order.shipping === 0 ? 'Free' : `₹${order.shipping.toFixed(2)}`}
                        </p>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between">
                          <p className="text-sm text-gray-600">Discount</p>
                          <p className="text-sm font-medium text-red-600">-₹{order.discount.toFixed(2)}</p>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-2">
                        <p className="font-medium">Total</p>
                        <p className="font-bold">₹{order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/account/orders" 
              className="bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200 text-center"
            >
              View All Orders
            </Link>
            <Link 
              href="/products" 
              className="bg-white border border-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-50 transition-colors duration-200 text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 