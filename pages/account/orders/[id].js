import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FiArrowLeft, FiLoader, FiAlertCircle, FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiX, FiClock } from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';
import { getOrderById, cancelOrder, markOrderAsPaid } from '../../../utils/orderService';
import OptimizedImage from '../../../components/common/OptimizedImage';

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState(false);

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login?redirect=/account/orders');
      return;
    }

    // Fetch order details
    async function fetchOrder() {
      if (!id) return;
      
      try {
        setLoading(true);
        const orderData = await getOrderById(id);
        
        if (orderData) {
          // Verify this order belongs to the current user
          if (orderData.userId === currentUser.uid) {
            setOrder(orderData);
          } else {
            setError('You do not have permission to view this order');
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
  }, [id, currentUser, router]);

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

  // Helper function to calculate days remaining before deletion
  const getDaysRemaining = (deletionDate) => {
    if (!deletionDate) return null;
    
    const date = deletionDate.toDate ? deletionDate.toDate() : new Date(deletionDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  // Helper function to render order status timeline
  const renderOrderTimeline = (status) => {
    const steps = [
      { id: 'pending', label: 'Order Placed', icon: FiPackage },
      { id: 'processing', label: 'Processing', icon: FiPackage },
      { id: 'shipped', label: 'Shipped', icon: FiTruck },
      { id: 'delivered', label: 'Delivered', icon: FiCheckCircle }
    ];

    // Find current step index
    const currentStepIndex = steps.findIndex(step => step.id === status);
    
    // Handle cancelled orders
    if (status === 'cancelled') {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <FiXCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="mt-2 text-sm font-medium text-red-700">Order Cancelled</p>
          </div>
        </div>
      );
    }

    return (
      <div className="py-4">
        <div className="relative flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-indigo-deep text-white' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-indigo-deep ring-offset-2' : ''}`}>
                  <step.icon className="h-4 w-4" />
                </div>
                <p className={`mt-2 text-xs font-medium ${
                  isCompleted ? 'text-indigo-deep' : 'text-gray-500'
                }`}>
                  {step.label}
                </p>
              </div>
            );
          })}
          
          {/* Progress bar */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-deep" 
              style={{ 
                width: `${currentStepIndex === 0 ? 0 : (currentStepIndex / (steps.length - 1)) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      await cancelOrder(order.id, cancelReason);
      
      // Update local order state
      setOrder(prev => ({
        ...prev,
        status: 'cancelled',
        cancelReason,
        cancelledAt: new Date()
      }));
      
      setShowCancelModal(false);
      setSuccess('Order cancelled successfully');
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Handle marking order as paid
  const handleMarkAsPaid = async () => {
    try {
      setMarkingAsPaid(true);
      const updatedOrder = await markOrderAsPaid(order.id);
      
      // Update local order state
      setOrder(prev => ({
        ...prev,
        isPaid: true,
        paidAt: new Date(),
        scheduledForDeletion: updatedOrder.scheduledForDeletion
      }));
      
      setSuccess('Order marked as paid successfully');
    } catch (err) {
      console.error('Error marking order as paid:', err);
      setError('Failed to mark order as paid');
    } finally {
      setMarkingAsPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Order Details | Rangya</title>
          <meta name="description" content="View your order details" />
        </Head>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-indigo-deep h-8 w-8 mb-4" />
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Order Details | Rangya</title>
          <meta name="description" content="View your order details" />
        </Head>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center">
          <FiAlertCircle className="text-red-500 mr-3" />
          <p>{error}</p>
        </div>
        <div className="text-center mt-4">
          <Link href="/account/orders" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
            <FiArrowLeft className="mr-2" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Order Details | Rangya</title>
          <meta name="description" content="View your order details" />
        </Head>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 flex items-center">
          <FiAlertCircle className="text-yellow-500 mr-3" />
          <p>Order not found</p>
        </div>
        <div className="text-center mt-4">
          <Link href="/account/orders" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
            <FiArrowLeft className="mr-2" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Order #{order.id.slice(0, 8)} | Rangya</title>
        <meta name="description" content="View details for your order" />
      </Head>
      <div className="mb-6 flex justify-between items-center">
        <Link href="/account/orders" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
          <FiArrowLeft className="mr-2" /> Back to Orders
        </Link>
        
        {success && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            {success}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Order Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h2 className="text-lg font-semibold">Order #{order.id.slice(0, 8)}</h2>
              <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
            </div>
            <div className="mt-2 md:mt-0 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              
              {order.isPaid && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                  <FiCheckCircle className="mr-1" size={12} />
                  Paid
                </span>
              )}
            </div>
          </div>
          
          {/* Show auto-deletion notice if applicable */}
          {order.status === 'delivered' && order.isPaid && order.scheduledForDeletion && (
            <div className="mt-4 bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800 flex items-center">
                <FiClock className="mr-2" />
                This order data will be automatically deleted in {getDaysRemaining(order.scheduledForDeletion)} days
              </p>
            </div>
          )}
        </div>

        {/* Order Timeline */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Order Status</h3>
          {renderOrderTimeline(order.status)}
        </div>

        {/* Order Details */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
              <div className="bg-gray-50 rounded p-3">
                <p className="font-medium">{order.shippingAddress?.fullName || order.customer?.name}</p>
                <p>{order.shippingAddress?.addressLine1 || order.customer?.address}</p>
                {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress?.city || order.customer?.city}, 
                  {order.shippingAddress?.state || order.customer?.state} 
                  {order.shippingAddress?.postalCode || order.customer?.pincode}
                </p>
                <p>{order.shippingAddress?.country || 'India'}</p>
                <p className="mt-1">{order.customer?.phone || order.customer?.email}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Information</h3>
              <div className="bg-gray-50 rounded p-3">
                <p className="font-medium">Payment Method</p>
                <p>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                
                <p className="font-medium mt-2">Payment Status</p>
                <p className={order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={`${item.id}-${item.size}-${index}`}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
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
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.size && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-6">
          <div className="ml-auto w-full md:w-1/2 lg:w-1/3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-sm font-medium">₹{order.subtotal?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Shipping</p>
                <p className="text-sm font-medium">₹{order.shipping?.toFixed(2) || '0.00'}</p>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <p className="text-sm text-gray-600">Discount</p>
                  <p className="text-sm font-medium text-red-600">-₹{order.discount.toFixed(2)}</p>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <p className="text-base font-medium">Total</p>
                <p className="text-base font-bold">₹{order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-3 justify-end">
            {/* Show Mark as Paid button only for delivered orders that aren't paid yet */}
            {order.status === 'delivered' && !order.isPaid && (
              <button
                onClick={handleMarkAsPaid}
                disabled={markingAsPaid}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {markingAsPaid ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="-ml-1 mr-2 h-4 w-4" />
                    Mark as Paid
                  </>
                )}
              </button>
            )}
            
            {/* Show Cancel button only for orders that can be cancelled */}
            {(order.status === 'pending' || order.status === 'processing') && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FiXCircle className="-ml-1 mr-2 h-4 w-4" />
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Cancel Order</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX />
              </button>
            </div>
            
            <p className="mb-4 text-gray-600">
              Please provide a reason for cancelling this order. This action cannot be undone.
            </p>
            
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-deep focus:border-transparent"
              rows="3"
              placeholder="Reason for cancellation"
            ></textarea>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}