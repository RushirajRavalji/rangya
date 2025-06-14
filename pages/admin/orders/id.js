import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiArrowLeft, FiDownload, FiEdit, FiLoader, FiPackage, FiUser, FiMapPin, FiCreditCard, FiCalendar } from 'react-icons/fi';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getOrderById, updateOrderStatus } from '../../../utils/orderService';
import { getProductById } from '../../../utils/productService';
import OptimizedImage from '../../../components/common/OptimizedImage';
import { useNotification } from '../../../contexts/NotificationContext';
import { useReactToPrint } from 'react-to-print';

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showNotification } = useNotification();
  const printRef = useRef();
  
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const orderData = await getOrderById(id);
        
        if (!orderData) {
          setError('Order not found');
          return;
        }
        
        setOrder(orderData);
        
        // Fetch product details for each order item
        const productPromises = orderData.items.map(async (item) => {
          try {
            const product = await getProductById(item.id);
            return { [item.id]: product };
          } catch (err) {
            console.error(`Error fetching product ${item.id}:`, err);
            return { [item.id]: null };
          }
        });
        
        const productResults = await Promise.all(productPromises);
        const productsMap = productResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setProducts(productsMap);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrder();
  }, [id]);
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Order-${id}`,
    onAfterPrint: () => showNotification('Order invoice downloaded successfully', 'success')
  });
  
  const handleStatusChange = async (newStatus) => {
    try {
      setStatusLoading(true);
      await updateOrderStatus(id, newStatus);
      setOrder(prev => ({ ...prev, status: newStatus }));
      showNotification(`Order status updated to ${newStatus}`, 'success');
    } catch (err) {
      console.error('Error updating order status:', err);
      showNotification('Failed to update order status', 'error');
    } finally {
      setStatusLoading(false);
    }
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get status badge color
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

  return (
    <AdminLayout title={`Order #${id ? id.slice(0, 8) : ''}`}>
      <div className="mb-6">
        <Link href="/admin/orders" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
          <FiArrowLeft className="mr-2" /> Back to Orders
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FiLoader className="animate-spin h-8 w-8 text-indigo-deep" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      ) : order ? (
        <div>
          {/* Order Header */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{id.slice(0, 8)}</h1>
                <p className="text-gray-500 flex items-center mt-1">
                  <FiCalendar className="mr-1" /> Placed on {formatDate(order.createdAt)}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                >
                  <FiDownload className="mr-2" /> Export PDF
                </button>
                
                {!statusLoading ? (
                  <div className="relative inline-block">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`pl-3 pr-8 py-2 border border-gray-300 rounded-md appearance-none ${getStatusBadgeColor(order.status)}`}
                    >
                      {orderStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <FiEdit size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white">
                    <FiLoader className="animate-spin mr-2" /> Updating...
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center text-gray-500 mb-2">
                  <FiUser className="mr-2" /> Customer
                </div>
                <h3 className="font-medium">{order.customer?.name || 'N/A'}</h3>
                <p className="text-sm text-gray-500">{order.customer?.email || 'N/A'}</p>
                <p className="text-sm text-gray-500">{order.customer?.phone || 'N/A'}</p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center text-gray-500 mb-2">
                  <FiMapPin className="mr-2" /> Shipping Address
                </div>
                <h3 className="font-medium">{order.shippingAddress?.name || order.customer?.name || 'N/A'}</h3>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress?.street}, {order.shippingAddress?.city}
                </p>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress?.state}, {order.shippingAddress?.postalCode}
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center text-gray-500 mb-2">
                  <FiCreditCard className="mr-2" /> Payment
                </div>
                <h3 className="font-medium capitalize">{order.paymentMethod || 'N/A'}</h3>
                <p className="text-sm text-gray-500">Status: {order.paymentStatus || 'N/A'}</p>
                {order.transactionId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {order.transactionId}</p>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center text-gray-500 mb-2">
                  <FiPackage className="mr-2" /> Fulfillment
                </div>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                  {order.status}
                </div>
                {order.trackingNumber && (
                  <p className="text-sm text-gray-500 mt-2">
                    Tracking: {order.trackingNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Order Items */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => {
                    const product = products[item.id];
                    return (
                      <tr key={`${item.id}-${item.size}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {product && product.images && product.images[0] ? (
                                <OptimizedImage
                                  src={product.images[0]}
                                  alt={product.name_en}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 object-cover rounded-md"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                                  <FiPackage className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product ? product.name_en : item.name || 'Product not found'}
                              </div>
                              <div className="text-xs text-gray-500">
                                SKU: {product ? product.sku || 'N/A' : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.size || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{item.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Subtotal:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{order.subtotal?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                  {order.discount > 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Discount:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        -₹{order.discount?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Shipping:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{order.shippingCost?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                  {order.tax > 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Tax:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{order.tax?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-base font-bold text-gray-900 text-right">
                      Total:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-indigo-deep">
                      ₹{order.total?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Order Notes */}
          {order.notes && (
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Order Notes</h2>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
          
          {/* Printable Invoice */}
          <div className="hidden">
            <div ref={printRef} className="p-8 max-w-4xl mx-auto bg-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold">Ranga</h1>
                  <p className="text-gray-600">Style Me Apna Rang</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  <p className="text-gray-600">#{id.slice(0, 8)}</p>
                  <p className="text-gray-600">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-bold text-gray-700 mb-2">Bill To:</h3>
                  <p className="text-gray-600">{order.customer?.name}</p>
                  <p className="text-gray-600">{order.customer?.email}</p>
                  <p className="text-gray-600">{order.customer?.phone}</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-700 mb-2">Ship To:</h3>
                  <p className="text-gray-600">{order.shippingAddress?.name || order.customer?.name}</p>
                  <p className="text-gray-600">{order.shippingAddress?.street}</p>
                  <p className="text-gray-600">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</p>
                </div>
              </div>
              
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 text-left">Size</th>
                    <th className="py-2 text-left">Price</th>
                    <th className="py-2 text-left">Qty</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const product = products[item.id];
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-4">
                          {product ? product.name_en : item.name || 'Product not found'}
                        </td>
                        <td className="py-4">{item.size || 'N/A'}</td>
                        <td className="py-4">₹{item.price}</td>
                        <td className="py-4">{item.quantity}</td>
                        <td className="py-4 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="py-2 text-right font-medium">Subtotal:</td>
                    <td className="py-2 text-right">₹{order.subtotal?.toFixed(2) || '0.00'}</td>
                  </tr>
                  {order.discount > 0 && (
                    <tr>
                      <td colSpan="4" className="py-2 text-right font-medium">Discount:</td>
                      <td className="py-2 text-right">-₹{order.discount?.toFixed(2) || '0.00'}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="4" className="py-2 text-right font-medium">Shipping:</td>
                    <td className="py-2 text-right">₹{order.shippingCost?.toFixed(2) || '0.00'}</td>
                  </tr>
                  {order.tax > 0 && (
                    <tr>
                      <td colSpan="4" className="py-2 text-right font-medium">Tax:</td>
                      <td className="py-2 text-right">₹{order.tax?.toFixed(2) || '0.00'}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan="4" className="py-2 text-right font-bold">Total:</td>
                    <td className="py-2 text-right font-bold">₹{order.total?.toFixed(2) || '0.00'}</td>
                  </tr>
                </tfoot>
              </table>
              
              <div className="border-t-2 border-gray-300 pt-4">
                <h3 className="font-bold text-gray-700 mb-2">Payment Information:</h3>
                <p className="text-gray-600">Method: {order.paymentMethod || 'N/A'}</p>
                <p className="text-gray-600">Status: {order.paymentStatus || 'N/A'}</p>
                {order.transactionId && (
                  <p className="text-gray-600">Transaction ID: {order.transactionId}</p>
                )}
              </div>
              
              <div className="mt-8 text-center text-gray-500 text-sm">
                <p>Thank you for your order!</p>
                <p>For any questions, please contact support@ranga-denim.com</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
} 