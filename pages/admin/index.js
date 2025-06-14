import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../utils/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { 
  FiGrid, 
  FiPackage, 
  FiUsers, 
  FiSettings, 
  FiShoppingBag, 
  FiPlusCircle,
  FiBarChart2,
  FiDollarSign,
  FiTruck,
  FiImage,
  FiTag,
  FiLayers,
  FiArrowUp,
  FiArrowDown,
  FiShoppingCart,
  FiUserPlus
} from 'react-icons/fi';
import AdminLayout from '../../components/layout/AdminLayout';

export default function AdminDashboard() {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not logged in or not admin
    if (!currentUser) {
      router.push('/login?redirect=/admin');
      return;
    }

    if (userRole !== 'admin') {
      router.push('/account');
      return;
    }

    // Set up real-time listeners for dashboard data
    const unsubscribers = [];

    // Products listener
    const productsRef = collection(db, 'products');
    const productsUnsubscribe = onSnapshot(
      query(productsRef),
      (snapshot) => {
        setStats(prev => ({ ...prev, products: snapshot.size }));
      },
      (error) => {
        console.error('Error listening to products:', error);
      }
    );
    unsubscribers.push(productsUnsubscribe);

    // Orders listener
    const ordersRef = collection(db, 'orders');
    const ordersUnsubscribe = onSnapshot(
      query(ordersRef),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate total revenue from non-cancelled orders
        const totalRevenue = orders.reduce((sum, order) => {
          if (order.status !== 'cancelled') {
            return sum + (order.total || 0);
          }
          return sum;
        }, 0);

        setStats(prev => ({ 
          ...prev, 
          orders: orders.length,
          revenue: totalRevenue
        }));
      },
      (error) => {
        console.error('Error listening to orders:', error);
      }
    );
    unsubscribers.push(ordersUnsubscribe);

    // Recent orders listener
    const recentOrdersRef = collection(db, 'orders');
    const recentOrdersUnsubscribe = onSnapshot(
      query(recentOrdersRef, orderBy('createdAt', 'desc'), limit(5)),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentOrders(orders);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to recent orders:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(recentOrdersUnsubscribe);

    // Users listener
    const usersRef = collection(db, 'users');
    const usersUnsubscribe = onSnapshot(
      query(usersRef),
      (snapshot) => {
        setStats(prev => ({ ...prev, users: snapshot.size }));
      },
      (error) => {
        console.error('Error listening to users:', error);
      }
    );
    unsubscribers.push(usersUnsubscribe);

    // Clean up listeners on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser, router, userRole]);

  if (!currentUser || userRole !== 'admin') {
    return null; // Will redirect in useEffect
  }

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

  return (
    <AdminLayout title="Dashboard">
      <Head>
        <title>Admin Dashboard | Ranga</title>
        <meta name="description" content="Admin dashboard for Ranga e-commerce" />
      </Head>

      <div className="container mx-auto">
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
            <Link href="/admin/products/new" className="bg-orange-vibrant hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center">
              <FiPlusCircle className="mr-2" />
              Add New Product
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-deep"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-indigo-deep">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Products</p>
                      <p className="text-2xl font-bold">{stats.products}</p>
                    </div>
                    <div className="p-3 rounded-full bg-indigo-100 text-indigo-deep">
                      <FiShoppingBag size={24} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Orders</p>
                      <p className="text-2xl font-bold">{stats.orders}</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <FiPackage size={24} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Users</p>
                      <p className="text-2xl font-bold">{stats.users}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <FiUsers size={24} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold">₹{stats.revenue.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                      <FiDollarSign size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Management Guide */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Product Management Guide</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="border rounded-lg p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium">Add New Products</h4>
                      <div className="bg-indigo-deep/10 p-3 rounded-full">
                        <FiPlusCircle className="text-indigo-deep" size={24} />
                      </div>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600">
                      <li>Click "Add New Product" button</li>
                      <li>Fill in product details (name, description, price)</li>
                      <li>Select category and add product features</li>
                      <li>Upload product images (up to 5)</li>
                      <li>Set stock levels for each size</li>
                    </ol>
                    <Link href="/admin/products/new" className="mt-4 inline-block text-indigo-deep hover:underline">
                      Add a product now →
                    </Link>
                  </div>

                  <div className="border rounded-lg p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium">Product Details</h4>
                      <div className="bg-indigo-deep/10 p-3 rounded-full">
                        <FiTag className="text-indigo-deep" size={24} />
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">
                      For best results, include these details for each product:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Clear, descriptive product name</li>
                      <li>Detailed product description</li>
                      <li>Accurate pricing information</li>
                      <li>Correct category assignment</li>
                      <li>Product features and specifications</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium">Product Images</h4>
                      <div className="bg-indigo-deep/10 p-3 rounded-full">
                        <FiImage className="text-indigo-deep" size={24} />
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">
                      High-quality images increase sales. For each product:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Upload at least one product image</li>
                      <li>Use clear, well-lit photos</li>
                      <li>Show product from multiple angles</li>
                      <li>Include detail shots if relevant</li>
                      <li>Maintain consistent image dimensions</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentOrders.length > 0 ? (
                          recentOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-deep">
                                #{order.id.slice(0, 8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {order.customer?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{order.total.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                              No recent orders found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 shadow-md mb-8">
                <h2 className="font-semibold text-xl mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href="/admin/products/new" className="flex items-center justify-between px-5 py-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                    <span className="font-medium text-indigo-deep">Add Product</span>
                    <div className="bg-indigo-deep p-2 rounded-full text-white">
                      <FiPlusCircle size={18} />
                    </div>
                  </Link>
                  <Link href="/admin/orders" className="flex items-center justify-between px-5 py-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <span className="font-medium text-green-700">View Orders</span>
                    <div className="bg-green-600 p-2 rounded-full text-white">
                      <FiShoppingCart size={18} />
                    </div>
                  </Link>
                  <Link href="/admin/users" className="flex items-center justify-between px-5 py-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <span className="font-medium text-blue-700">Manage Users</span>
                    <div className="bg-blue-600 p-2 rounded-full text-white">
                      <FiUserPlus size={18} />
                    </div>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}