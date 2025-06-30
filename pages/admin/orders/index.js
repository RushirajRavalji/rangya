import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEye, FiLoader, FiSearch, FiChevronLeft, FiChevronRight, FiCalendar, FiFilter } from 'react-icons/fi';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getAllOrders, updateOrderStatus } from '../../../utils/orderService';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const ordersPerPage = 10;
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('=== START: Fetching all orders from admin orders page ===');
        const response = await getAllOrders({
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        console.log('=== RESPONSE RECEIVED ===');
        console.log('Response structure:', JSON.stringify(Object.keys(response)));
        
        // Process orders to ensure uniqueness and consistent customer data
        const allOrders = response.orders || [];
        
        if (!Array.isArray(allOrders)) {
          console.error('Orders is not an array:', allOrders);
          setError('Invalid orders data format. Please contact support.');
          return;
        }
        
        // Create a map of orders by ID to remove duplicates
        const ordersMap = {};
        
        allOrders.forEach(order => {
          // If this order ID already exists in our map, only keep one instance
          // and ensure customer data is consistent
          if (!ordersMap[order.id]) {
            ordersMap[order.id] = {
              ...order,
              // Make sure customer data is consistent
              customer: {
                name: order.customer?.name || 'N/A',
                email: order.customer?.email || 'N/A'
              }
            };
          }
        });
        
        // Convert back to array
        const uniqueOrders = Object.values(ordersMap);
        setOrders(uniqueOrders);
        
        if (uniqueOrders.length === 0) {
          console.log('No orders found in the response');
          setError('No orders found. This could be because there are no orders in the system yet.');
        } else {
          console.log(`=== SUCCESS: Loaded ${uniqueOrders.length} unique orders ===`);
          if (uniqueOrders[0]) {
            console.log('First order sample:', JSON.stringify(uniqueOrders[0]));
            console.log('First order ID:', uniqueOrders[0].id);
            console.log('First order customer:', uniqueOrders[0].customer);
            console.log('First order status:', uniqueOrders[0].status);
            console.log('First order total:', uniqueOrders[0].total || uniqueOrders[0].totalAmount);
          }
        }
        
        setTotalPages(Math.ceil(uniqueOrders.length / ordersPerPage));
      } catch (err) {
        console.error('=== ERROR: Failed to fetch orders ===', err);
        let errorMessage = 'Failed to load orders';
        
        if (err.code === 'DATABASE') {
          errorMessage += ': Database error occurred';
        } else if (err.message) {
          errorMessage += ': ' + err.message;
        } else {
          errorMessage += ': Unknown error';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle status filter
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Filter orders by search term and status
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(searchLower) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(searchLower)) ||
      (order.customer?.email && order.customer.email.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate orders
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      await updateOrderStatus(selectedOrder.id, newStatus);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id ? { ...order, status: newStatus } : order
        )
      );
      
      setSuccess(`Order status updated to ${newStatus}`);
      setShowStatusModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status');
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0).replace(/^(\D+)/, '₹');
  };

  return (
    <AdminLayout title="Orders Management">
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-deep focus:border-indigo-deep"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Status Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-deep focus:border-indigo-deep appearance-none"
            >
              <option value="">All Statuses</option>
              {orderStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        {success && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md flex items-center">
            {success}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <FiLoader className="animate-spin h-5 w-5 text-indigo-deep" />
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-deep">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer?.name || order.shippingAddress?.fullName || 'Guest Customer'}
                        </div>
                        {order.customer?.email && (
                          <div className="text-xs text-gray-500">
                            {order.customer.email}
                          </div>
                        )}
                        {order.customer?.phone && (
                          <div className="text-xs text-gray-500">
                            {order.customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 text-gray-400" />
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status || 'pending');
                          setShowStatusModal(true);
                        }}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status || 'pending')} hover:bg-opacity-80`}
                      >
                        {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.totalAmount || order.total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="text-indigo-deep hover:text-blue-800 inline-flex items-center"
                      >
                        <FiEye className="mr-1" /> View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * ordersPerPage) + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * ordersPerPage, filteredOrders.length)}
            </span>{' '}
            of <span className="font-medium">{filteredOrders.length}</span> orders
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Calculate page numbers to show
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded-md ${
                    currentPage === pageNum
                      ? 'bg-indigo-deep text-white border-indigo-deep'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
      
      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Update Order Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Order ID: <span className="font-medium">#{selectedOrder.id.slice(0, 8)}</span>
              </p>
              
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-deep focus:border-indigo-deep"
              >
                {orderStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                className="px-4 py-2 bg-indigo-deep border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <FiLoader className="inline-block animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}