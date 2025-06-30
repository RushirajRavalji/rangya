import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiPackage, FiChevronRight, FiLoader, FiAlertCircle, FiClock, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import OptimizedImage from '../common/OptimizedImage';

/**
 * Component to display customer orders from the subcollection
 */
export default function CustomerOrders({ status = null }) {
  const router = useRouter();
  const { currentUser, authError } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch customer orders from the subcollection
  useEffect(() => {
    async function fetchCustomerOrders() {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Build the query URL with status filter if provided
        let url = '/api/customer-orders';
        if (status) {
          url += `?status=${status}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        
        setOrders(data.orders);
        setHasMore(data.pagination.hasMore);
        setNextCursor(data.pagination.nextCursor);
      } catch (err) {
        console.error('Error fetching customer orders:', err);
        setError('Failed to load your orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    // Reset state when status changes
    setOrders([]);
    setNextCursor(null);
    setHasMore(false);
    
    fetchCustomerOrders();
  }, [currentUser, status]);

  // Load more orders
  const loadMoreOrders = async () => {
    if (!nextCursor || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // Build the query URL with status filter if provided
      let url = `/api/customer-orders?cursor=${nextCursor}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch more orders');
      }
      
      const data = await response.json();
      
      setOrders([...orders, ...data.orders]);
      setHasMore(data.pagination.hasMore);
      setNextCursor(data.pagination.nextCursor);
    } catch (err) {
      console.error('Error fetching more orders:', err);
      setError('Failed to load more orders. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      case 'processing':
        return <FiRefreshCw className="text-blue-500" />;
      case 'shipped':
        return <FiPackage className="text-purple-500" />;
      case 'delivered':
        return <FiCheckCircle className="text-green-500" />;
      case 'cancelled':
        return <FiAlertCircle className="text-red-500" />;
      default:
        return <FiPackage className="text-gray-500" />;
    }
  };

  // If user is not authenticated
  if (!currentUser && !loading) {
    return (
      <div className="text-center py-8">
        <FiAlertCircle className="mx-auto text-4xl text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please sign in to view your orders.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  // If loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FiLoader className="animate-spin text-4xl text-primary mb-4" />
        <p className="text-gray-600">Loading your orders...</p>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div className="text-center py-8">
        <FiAlertCircle className="mx-auto text-4xl text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // If no orders
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-gray-50">
        <FiPackage className="mx-auto text-4xl text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
        <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
        <Link href="/products" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors inline-block">
          Start Shopping
        </Link>
      </div>
    );
  }

  // Render orders
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Your Orders</h2>
      
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Order placed</p>
              <p className="font-medium">{formatDate(order.createdAt)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-medium">{order.id}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="font-medium">${order.totals?.total?.toFixed(2) || 'N/A'}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1">
                {getStatusIcon(order.status)}
                <span className="capitalize">{order.status?.replace('_', ' ') || 'N/A'}</span>
              </span>
            </div>
            
            <Link 
              href={`/account/orders/${order.id}`}
              className="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <span>View Details</span>
              <FiChevronRight className="ml-1" />
            </Link>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {order.items?.map((item, index) => (
                <div key={index} className="flex space-x-4">
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {item.image ? (
                      <OptimizedImage
                        src={item.image}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <FiPackage className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      {item.size && <span>Size: {item.size} | </span>}
                      <span>Qty: {item.quantity}</span>
                    </p>
                    <p className="text-sm font-medium">${item.price?.toFixed(2) || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={loadMoreOrders}
            disabled={loadingMore}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center">
                <FiLoader className="animate-spin mr-2" />
                Loading...
              </span>
            ) : (
              'Load More Orders'
            )}
          </button>
        </div>
      )}
    </div>
  );
}