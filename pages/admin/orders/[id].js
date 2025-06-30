import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FiArrowLeft, FiDownload, FiEdit, FiLoader, FiPackage, FiUser, FiMapPin, FiCreditCard, FiCalendar } from 'react-icons/fi';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getOrderById, updateOrderStatus } from '../../../utils/orderService';
import { getProductById } from '../../../utils/productService';
import OptimizedImage from '../../../components/common/OptimizedImage';
import { useNotification } from '../../../contexts/NotificationContext';
import { useReactToPrint } from 'react-to-print';
import { generateOrderPDF } from '../../../utils/pdfGenerator';
import AddressDisplay from '../../../components/common/AddressDisplay';

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const { showNotification } = useNotification();
  const printRef = useRef();
  
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  // Calculate total
  const calculateTotal = () => {
    if (!order?.items) return 0;
    
    const subtotal = getSubtotal();
    const discount = parseFloat(order.discount || 0);
    const shipping = parseFloat(order.shipping || order.shippingCost || order.shippingFee || 0);
    const tax = parseFloat(order.tax || 0);
    
    // Calculate total in same way as checkout process
    return subtotal - discount + shipping + tax;
  };
  
  // Calculate subtotal from items
  const getSubtotal = () => {
    if (!order?.items) return 0;
    
    return order.items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price || item.unitPrice || 0);
      const itemQuantity = parseInt(item.quantity || item.qty || 1);
      
      // Ensure we have valid numbers
      if (isNaN(itemPrice) || isNaN(itemQuantity)) return sum;
      
      return sum + (itemPrice * itemQuantity);
    }, 0);
  };

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch order data
        const orderData = await getOrderById(id);
        
        if (!orderData) {
          setError('Order not found');
          return;
        }
        
        // Ensure consistent customer data
        const enhancedOrder = {
          ...orderData,
          // Make sure we have consistent customer information
          customer: orderData.customer || {
            name: 'N/A',
            email: 'N/A'
          }
        };
        
        // Ensure all items have consistent pricing formats and data
        if (enhancedOrder.items) {
          enhancedOrder.items = enhancedOrder.items.map(item => {
            // Normalize fields for consistency
            return {
              ...item,
              productId: item.productId || item.id,
              price: parseFloat(item.price || item.unitPrice || 0),
              quantity: parseInt(item.quantity || item.qty || 1),
              name: item.name || "Unknown Product",
              imageURL: item.imageURL || item.imageUrl,
              size: item.size || "N/A"
            };
          });
          
          // If subtotal is missing, calculate it from items
          if (!enhancedOrder.subtotal) {
            enhancedOrder.subtotal = enhancedOrder.items.reduce((sum, item) => 
              sum + (item.price * item.quantity), 0);
          }
          
          // If totalAmount is missing but we have a total field, use that
          if (!enhancedOrder.totalAmount && enhancedOrder.total) {
            enhancedOrder.totalAmount = enhancedOrder.total;
          }
        }
        
        setOrder(enhancedOrder);
        
        // Fetch product details for each order item
        const productPromises = enhancedOrder.items.map(async (item) => {
          try {
            // Use consistent product ID reference
            const productId = item.productId || (item.product && item.product.id) || item.id;
            if (!productId) return null;
            
            const product = item.product || await getProductById(productId);
            return { [productId]: product };
          } catch (err) {
            console.error(`Error fetching product ${item.productId || item.id}:`, err);
            return null;
          }
        });
        
        const productResults = await Promise.all(productPromises);
        const productsMap = productResults.reduce((acc, curr) => {
          if (curr) return { ...acc, ...curr };
          return acc;
        }, {});
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
    documentTitle: `Order_${id ? id.slice(0, 8) : 'Invoice'}`,
    onBeforePrint: () => {
      showNotification('Preparing PDF for download...', 'info');
    },
    onAfterPrint: () => {
      showNotification('PDF exported successfully!', 'success');
    },
    onPrintError: (error) => {
      console.error('Print failed:', error);
      showNotification('Failed to export PDF. Please try again.', 'error');
    },
    removeAfterPrint: true
  });
  
  // PDF export function using browser's print functionality
  const handleExportPDF = () => {
    window.print();
  };
  
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
  
  // Format date with proper error handling
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'N/A';
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0).replace(/^(\D+)/, '₹');
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
      <Head>
        <title>Order #{order?.id?.slice(0, 8) || id?.slice(0, 8) || ''} - Admin</title>
        <style type="text/css">{`
          @media print {
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .print-container {
              padding: 20px !important;
              max-width: 100% !important;
            }
            body {
              background-color: white !important;
              color: black !important;
              font-size: 12pt;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            td, th {
              padding: 8px !important;
              border: 1px solid #ddd !important;
            }
          }
        `}</style>
      </Head>
      <div className="mb-6 no-print">
        <Link href="/admin/orders" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
          <FiArrowLeft className="mr-2" /> Back to Orders
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FiLoader className="animate-spin h-8 w-8 text-indigo-deep" />
          <span className="ml-2">Loading order details...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>Error: {error}</p>
        </div>
      ) : !order ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>Order not found</p>
        </div>
      ) : (
        <div>
          {/* Printable Invoice Area */}
          <div ref={printRef} className="print-container">
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
                    onClick={handleExportPDF}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none no-print"
                  >
                    <FiDownload className="mr-2 -ml-1 h-5 w-5" />
                    Export PDF
                  </button>
                  
                  <div className="inline-flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    
                    <div className="ml-2 relative no-print">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={statusLoading}
                        className="border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-indigo-deep focus:border-indigo-deep"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                      
                      <FiEdit className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2 text-gray-700">
                    <FiUser className="mr-2" /> Customer
                  </div>
                  <div>
                    <p className="font-medium">{order.customer?.name || order.shippingAddress?.fullName || 'Guest Customer'}</p>
                    <p className="text-gray-500 text-sm">{order.customer?.email || 'N/A'}</p>
                    <p className="text-gray-500 text-sm">{order.customer?.phone || order.shippingAddress?.phone || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Shipping Address - Use the AddressDisplay component */}
                <AddressDisplay 
                  address={order.shippingAddress}
                  customerName={order.customer?.name}
                  title="Shipping Address"
                />
                
                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2 text-gray-700">
                    <FiCreditCard className="mr-2" /> Payment
                  </div>
                  <div>
                    <p className="font-medium capitalize">{order.paymentMethod || 'Cod'}</p>
                    <p className="text-sm text-gray-500">Status: {order.paymentStatus || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Fulfillment Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2 text-gray-700">
                    <FiMapPin className="mr-2" /> Fulfillment
                  </div>
                  <div>
                    <p className="font-medium capitalize">{order.status || 'Pending'}</p>
                  </div>
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
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => {
                        // Use the correct price and quantity from the order item
                        const itemPrice = parseFloat(item.price || item.unitPrice || 0);
                        const itemQuantity = parseInt(item.quantity || item.qty || 1);
                        const itemTotal = itemPrice * itemQuantity;
                        
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded">
                                  {item.imageUrl || item.imageURL ? (
                                    <OptimizedImage
                                      src={item.imageUrl || item.imageURL}
                                      alt={item.name}
                                      width={40}
                                      height={40}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                                      <FiPackage className="text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.name || 'Product Name'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    SKU: {item.sku || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.size || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(itemPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {itemQuantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(itemTotal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Order Summary */}
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col items-end">
                  <div className="w-full max-w-md space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(order.subtotal || getSubtotal())}</span>
                    </div>
                    {parseFloat(order.discount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Discount:</span>
                        <span className="text-sm font-medium">-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Shipping:</span>
                      <span className="text-sm font-medium">{formatCurrency(order.shipping || order.shippingCost || order.shippingFee || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-base font-medium">Total:</span>
                      <span className="text-base font-bold">{formatCurrency(order.totalAmount || order.total || calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}