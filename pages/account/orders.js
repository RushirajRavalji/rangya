import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiPackage, FiChevronRight, FiLoader, FiAlertCircle, FiClock, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getUserOrders } from '../../utils/orderService';
import OptimizedImage from '../../components/common/OptimizedImage';
import AccountLayout from '../../components/layout/AccountLayout';

export default function Orders() {
  const router = useRouter();
  const { currentUser, authError } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!currentUser && !authError && !loading) {
      router.push('/login?redirect=/account/orders');
    }
  }, [currentUser, authError, loading, router]);

  const fetchOrders = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(false);
      const userOrders = await getUserOrders(currentUser.uid);
      setOrders(userOrders);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser]);

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Helper function to get status badge color
  const getStatusBadgeColor = (status) => {
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

  // Helper function to get payment status badge
  const getPaymentStatusBadge = (order) => {
    if (order.isPaid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
          <FiCheckCircle className="mr-1" size={12} />
          Paid
        </span>
      );
    }
    return null;
  };

  // Helper function to calculate days remaining before deletion
  const getDaysRemaining = (deletionDate) => {
    if (!deletionDate) return null;
    
    const date = deletionDate.toDate ? deletionDate.toDate() : new Date(deletionDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <AccountLayout title="My Orders">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-indigo-deep h-8 w-8 mb-4" />
            <p>Loading your orders...</p>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout title="My Orders">
      {error && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-500 mb-4">
            <FiAlertCircle size={24} />
          </div>
          <h2 className="text-lg font-medium mb-2">Unable to load orders</h2>
          <p className="text-gray-600 mb-6">We couldn't load your orders at this time.</p>
          <button 
            onClick={fetchOrders}
            className="bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200 flex items-center mx-auto"
          >
            <FiRefreshCw className="mr-2" /> Retry
          </button>
        </div>
      )}

      {!error && orders.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 text-gray-500 mb-4">
            <FiPackage size={24} />
          </div>
          <h2 className="text-lg font-medium mb-2">No Orders Yet</h2>
          <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
          <Link 
            href="/products" 
            className="bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {!error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Order placed</p>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Order #</p>
                  <p className="font-medium">{order.id.slice(0, 8)}</p>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {getPaymentStatusBadge(order)}
                  </div>
                  <p className="font-medium">₹{order.total.toFixed(2)}</p>
                </div>
                
                <div className="space-y-3">
                  {order.items.slice(0, 2).map((item, index) => (
                    <div key={`${item.id}-${item.size}-${index}`} className="flex items-center">
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
                        <p className="text-xs text-gray-500">Size: {item.size} • Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  
                  {order.items.length > 2 && (
                    <p className="text-xs text-gray-500">
                      + {order.items.length - 2} more item(s)
                    </p>
                  )}
                </div>
                
                {order.status === 'delivered' && order.isPaid && order.scheduledForDeletion && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 flex items-center">
                      <FiClock className="mr-1" size={12} />
                      Order data will be deleted in {getDaysRemaining(order.scheduledForDeletion)} days
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm">
                    {order.status === 'delivered' ? 'Delivered on' : 'Expected delivery'}:
                    <span className="font-medium ml-1">
                      {order.deliveryDate ? formatDate(order.deliveryDate) : 'To be determined'}
                    </span>
                  </p>
                </div>
                <Link 
                  href={`/account/orders/${order.id}`}
                  className="text-indigo-deep hover:text-blue-800 flex items-center"
                >
                  View Details <FiChevronRight className="ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
} 