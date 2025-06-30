import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheckCircle, FiLoader, FiAlertCircle, FiShoppingBag, FiMapPin, FiPhone, FiUser, FiMail, FiChevronRight } from 'react-icons/fi';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import SEO from '../components/common/SEO';

const OrderConfirmation = () => {
  const router = useRouter();
  const { id: orderId } = router.query;
  const { currentUser, loading: authLoading } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login?redirect=order-confirmation');
      return;
    }
  }, [authLoading, currentUser, router]);
  
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First try to fetch from the new order structure
        const orderRef = doc(db, 'orders', orderId);
        const orderSnapshot = await getDoc(orderRef);
        
        if (!orderSnapshot.exists()) {
          setError('Order not found. Please check your order ID.');
          setLoading(false);
          return;
        }
        
        const orderData = orderSnapshot.data();
        
        // Check if order belongs to current user
        if (orderData.userId !== currentUser.uid) {
          setError('You do not have permission to view this order.');
          setLoading(false);
          return;
        }
        
        // Check if the order has payment information
        if (!orderData.paymentMethod) {
          orderData.paymentMethod = 'cod'; // Default to COD if not specified
        }
        
        // Check if the order has payment status
        if (!orderData.paymentStatus) {
          orderData.paymentStatus = 'pending'; // Default to pending if not specified
        }
        
        setOrder({ id: orderSnapshot.id, ...orderData });
      } catch (error) {
        console.error('Error fetching order:', error);
        setError('An error occurred while fetching your order. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId, currentUser]);
  
  // Show loading state
  if (loading || authLoading) {
    return (
      <>
        <SEO 
          title="Order Confirmation | Rangya"
          description="Thank you for your order"
          noindex={true}
        />
        <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="animate-spin h-12 w-12 mx-auto text-indigo-600" />
            <p className="mt-4 text-lg text-gray-600">Loading your order details...</p>
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
          description="Please login to view your order"
          noindex={true}
        />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
            <FiAlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mt-2 text-gray-600">Please login to your account to view your order details.</p>
            <div className="mt-6">
              <Link href="/login?redirect=order-confirmation" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Login to Continue
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <>
        <SEO 
          title="Order Error | Rangya"
          description="An error occurred with your order"
          noindex={true}
        />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
            <FiAlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Order Error</h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6">
              <Link href="/account/orders" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Show order confirmation with details
  if (order) {
    return (
      <>
        <SEO 
          title="Order Confirmation | Rangya"
          description="Thank you for your order"
          noindex={true}
        />
        <div className="bg-gray-50 min-h-screen py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Order Confirmation Header */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
                <FiCheckCircle className="h-16 w-16 mx-auto text-green-500" />
                <h1 className="mt-4 text-3xl font-bold text-gray-900">Order Confirmed!</h1>
                <p className="mt-2 text-lg text-gray-600">
                  Thank you for your order. We've received your order and will begin processing it shortly.
                </p>
                {order.orderNumber && (
                  <p className="mt-4 text-sm text-gray-500">
                    Order Number: <span className="font-medium">{order.orderNumber}</span>
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Date: <span className="font-medium">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              </div>
              
              {/* Order Details */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Order Details</h2>
                </div>
                
                {/* Order Items */}
                <div className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="px-6 py-4 flex items-start">
                      <div className="flex-shrink-0 relative w-20 h-20 rounded-md overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-base font-medium text-gray-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">Size: {item.size}</p>
                        <div className="mt-1 flex justify-between text-sm font-medium">
                          <p className="text-gray-500">Qty {item.quantity}</p>
                          <p className="text-gray-900">₹{item.price.toFixed(2)} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Summary */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>₹{order.subtotal.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <p>Shipping</p>
                    <p>Free</p>
                  </div>
                  <div className="flex justify-between text-base font-medium text-gray-900 mt-4">
                    <p>Total</p>
                    <p>₹{order.total.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Payment Info */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <h3 className="text-base font-medium text-gray-900">Payment Information</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Payment Method: <span className="font-medium">
                      {order.payment?.method ? 
                        (order.payment.method === 'cod' ? 'Cash on Delivery' : 
                         order.payment.method === 'card' ? 'Credit/Debit Card' : 
                         order.payment.method === 'upi' ? 'UPI' : 
                         order.payment.method) : 
                        (order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                         order.paymentMethod === 'card' ? 'Credit/Debit Card' : 
                         order.paymentMethod === 'upi' ? 'UPI' : 
                         order.paymentMethod || 'Cash on Delivery')}
                    </span>
                    {order.payment?.gateway && (
                      <span className="ml-1 text-xs text-gray-400">via {order.payment.gateway}</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Payment Status: <span className={`font-medium ${order.payment?.status === 'paid' || order.payment?.status === 'captured' ? 'text-green-600' : 
                      (order.payment?.status === 'failed' || order.payment?.status === 'payment_failed') ? 'text-red-600' : 
                      (order.payment?.status === 'refunded' || order.payment?.status === 'refund_initiated') ? 'text-purple-600' : 'text-yellow-600'}`}>
                      {order.payment?.status === 'paid' || order.payment?.status === 'captured' ? 'Paid' : 
                       order.payment?.status === 'authorized' ? 'Authorized' : 
                       order.payment?.status === 'failed' || order.payment?.status === 'payment_failed' ? 'Failed' : 
                       order.payment?.status === 'refunded' ? 'Refunded' : 
                       order.payment?.status === 'refund_initiated' ? 'Refund in Process' : 
                       order.payment?.status === 'pending' || order.payment?.status === 'payment_pending' ? 'Pending' : 
                       order.paymentStatus === 'paid' ? 'Paid' : 
                       order.paymentStatus === 'pending' ? 'Pending' : 'Pending'}
                    </span>
                  </p>
                  
                  {/* Show payment instructions for pending online payments */}
                  {((order.payment?.method === 'card' || order.payment?.method === 'upi' || 
                     order.paymentMethod === 'card' || order.paymentMethod === 'upi') && 
                    (order.payment?.status === 'pending' || order.payment?.status === 'payment_pending' || 
                     order.paymentStatus === 'pending')) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700">
                        <FiAlertCircle className="inline-block mr-2" />
                        Your payment is being processed. If you closed the payment window, you can try again from your account orders page.
                      </p>
                    </div>
                  )}
                  
                  {/* Show payment failure message */}
                  {(order.payment?.status === 'failed' || order.payment?.status === 'payment_failed' || 
                    order.paymentStatus === 'failed') && (
                    <div className="mt-3 p-3 bg-red-50 rounded-md">
                      <p className="text-sm text-red-700">
                        <FiAlertCircle className="inline-block mr-2" />
                        Your payment failed. Please try again from your account orders page or contact support.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Shipping Details */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <h3 className="text-base font-medium text-gray-900">Shipping Information</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <p className="flex items-start">
                      <FiUser className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                      <span>{order.customer?.fullName}</span>
                    </p>
                    <p className="flex items-start">
                      <FiMail className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                      <span>{order.customer?.email}</span>
                    </p>
                    <p className="flex items-start">
                      <FiPhone className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                      <span>{order.customer?.phone}</span>
                    </p>
                    <p className="flex items-start">
                      <FiMapPin className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                      <span>
                        {order.shipping?.address}, {order.shipping?.city}, {order.shipping?.state}, {order.shipping?.postalCode}
                      </span>
                    </p>
                  </div>
                </div>
                
                {/* Order Status */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <h3 className="text-base font-medium text-gray-900">Order Status</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Status: <span className="font-medium text-blue-600 capitalize">{order.status}</span>
                  </p>
                  {order.estimatedDelivery && (
                    <p className="mt-1 text-sm text-gray-500">
                      Estimated Delivery: <span className="font-medium">{new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0">
                  <Link href="/products" className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <FiShoppingBag className="mr-2" /> Continue Shopping
                  </Link>
                  
                  <Link href="/account/orders" className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    View All Orders <FiChevronRight className="ml-2" />
                  </Link>
                </div>
              </div>
              
              {/* Support Information */}
              <div className="mt-8 text-center text-sm text-gray-500">
                <p>If you have any questions about your order, please contact our support team.</p>
                <p className="mt-1">
                  <Link href="/contact" className="text-indigo-600 hover:text-indigo-500">
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Fallback if no order and no error
  return (
    <>
      <SEO 
        title="Order Confirmation | Rangya"
        description="Thank you for your order"
        noindex={true}
      />
      <div className="container mx-auto px-4 py-12 min-h-screen">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <FiAlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Order Not Found</h1>
          <p className="mt-2 text-gray-600">Please check your order ID or try again later.</p>
          <div className="mt-6">
            <Link href="/account/orders" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              View All Orders
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderConfirmation;