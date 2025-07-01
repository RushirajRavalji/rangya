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
  FiUserPlus,
  FiEdit,
  FiBell
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

    // Orders listener - aggregate from all users' orders subcollections
    // First, get all users
    const usersRef = collection(db, 'users');
    const usersUnsubscribe = onSnapshot(
      query(usersRef),
      async (usersSnapshot) => {
        let allOrders = [];
        let totalRevenue = 0;
        
        // For each user, set up a listener for their orders
        const userOrdersUnsubscribers = [];
        
        usersSnapshot.forEach((userDoc) => {
          const userId = userDoc.id;
          const userOrdersRef = collection(db, 'users', userId, 'orders');
          
          const userOrdersUnsubscribe = onSnapshot(
            query(userOrdersRef),
            (orderSnapshot) => {
              // Process orders for this user
              const userOrders = orderSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                userId: userId // Ensure userId is included
              }));
              
              // Update the global orders count and revenue
              allOrders = [...allOrders, ...userOrders];
              
              // Calculate revenue from non-cancelled orders
              const userRevenue = userOrders.reduce((sum, order) => {
                if (order.status !== 'cancelled') {
                  return sum + (order.totalAmount || order.total || 0);
                }
                return sum;
              }, 0);
              
              totalRevenue += userRevenue;
              
              // Update stats with the latest data
              setStats(prev => ({
                ...prev,
                orders: allOrders.length,
                revenue: totalRevenue
              }));
            },
            (error) => {
              console.error(`Error listening to orders for user ${userId}:`, error);
            }
          );
          
          userOrdersUnsubscribers.push(userOrdersUnsubscribe);
        });
        
        // Add the user orders unsubscribers to the main unsubscribers array
        unsubscribers.push(...userOrdersUnsubscribers);
      },
      (error) => {
        console.error('Error listening to users for orders:', error);
      }
    );
    unsubscribers.push(usersUnsubscribe);

    // Recent orders listener - aggregate from all users' orders subcollections
    // This is handled separately from the main orders listener to specifically get the most recent orders
    const fetchRecentOrders = async () => {
      try {
        // Get all users
        const usersSnapshot = await getDocs(query(collection(db, 'users')));
        let allRecentOrders = [];
        
        // For each user, get their orders
        const orderPromises = usersSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;
          const userOrdersRef = collection(db, 'users', userId, 'orders');
          
          // Query the most recent orders for this user
          const userOrdersSnapshot = await getDocs(
            query(userOrdersRef, orderBy('createdAt', 'desc'), limit(10))
          );
          
          // Map the orders and include user information
          return userOrdersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            userId: userId,
            customer: {
              name: userDoc.data().displayName || 'Unknown',
              email: userDoc.data().email || 'No email'
            }
          }));
        });
        
        // Wait for all order queries to complete
        const userOrdersArrays = await Promise.all(orderPromises);
        
        // Flatten the array of arrays into a single array of orders
        allRecentOrders = userOrdersArrays.flat();
        
        // Sort by createdAt (most recent first)
        allRecentOrders.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                       a.createdAt instanceof Date ? a.createdAt.getTime() : 
                       typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
                       
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                       b.createdAt instanceof Date ? b.createdAt.getTime() : 
                       typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
                       
          return bTime - aTime; // descending order (most recent first)
        });
        
        // Take only the 5 most recent orders
        const mostRecentOrders = allRecentOrders.slice(0, 5);
        
        // Update state
        setRecentOrders(mostRecentOrders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recent orders:', error);
        setLoading(false);
      }
    };
    
    // Initial fetch of recent orders
    fetchRecentOrders();
    
    // Set up a periodic refresh of recent orders (every 30 seconds)
    const recentOrdersInterval = setInterval(fetchRecentOrders, 30000);
    
    // Clean up the interval on unmount
    const clearRecentOrdersInterval = () => clearInterval(recentOrdersInterval);
    unsubscribers.push(clearRecentOrdersInterval);

    // Users listener
    const usersRefForCount = collection(db, 'users');
    const usersCountUnsubscribe = onSnapshot(
      query(usersRefForCount),
      (snapshot) => {
        setStats(prev => ({ ...prev, users: snapshot.size }));
      },
      (error) => {
        console.error('Error listening to users:', error);
      }
    );
    unsubscribers.push(usersCountUnsubscribe);

    // Clean up listeners on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser, router, userRole]); // End of useEffect dependency array

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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount).replace(/^(\D+)/, '₹');
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
        <title>Admin Dashboard | Rangya</title>
      </Head>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-deep"></div>
          <span className="ml-3">Loading dashboard data...</span>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Products Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Products</h3>
                      <p className="text-3xl font-bold text-gray-800">{stats.products}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <FiPackage className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Orders Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Orders</h3>
                      <p className="text-3xl font-bold text-gray-800">{stats.orders}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <FiShoppingBag className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Users Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Users</h3>
                      <p className="text-3xl font-bold text-gray-800">{stats.users}</p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-full">
                      <FiUsers className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Revenue Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-gray-500 text-sm font-medium mb-1">Revenue</h3>
                      <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.revenue)}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <FiDollarSign className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Add New Product Button (Prominent) */}
          <div className="flex justify-end mb-8 space-x-4">
            <Link href="/admin/test/notifications" className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
              <FiBell className="mr-2" /> Test Notifications
            </Link>
            
            <Link href="/admin/products/new" className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
              <FiPlusCircle className="mr-2" /> Add New Product
            </Link>
          </div>
          
          {/* Product Management Guide Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Product Management Guide</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Add New Products */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex justify-center mb-4">
                  <div className="bg-blue-100 p-4 rounded-full">
                    <FiPlusCircle size={24} className="text-blue-600" />
                  </div>
                </div>
                <h3 className="text-center font-bold text-lg mb-4">Add New Products</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Click "Add New Product" button</li>
                  <li>Fill in product details (name, description, price)</li>
                  <li>Upload product images</li>
                  <li>Add size and stock information</li>
                  <li>Save the product</li>
                </ol>
              </div>
              
              {/* Product Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex justify-center mb-4">
                  <div className="bg-indigo-100 p-4 rounded-full">
                    <FiEdit size={24} className="text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-center font-bold text-lg mb-4">Product Details</h3>
                <p className="mb-3">For best results, include these details for each product:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Clear, descriptive name</li>
                  <li>Detailed product description</li>
                  <li>Accurate pricing information</li>
                  <li>Available sizes and colors</li>
                  <li>Material and care instructions</li>
                </ul>
              </div>
              
              {/* Product Images */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-4 rounded-full">
                    <FiImage size={24} className="text-green-600" />
                  </div>
                </div>
                <h3 className="text-center font-bold text-lg mb-4">Product Images</h3>
                <p className="mb-3">High-quality images increase sales. For each product:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Upload at least one high-resolution image</li>
                  <li>Include multiple angles when possible</li>
                  <li>Show the product in use</li>
                  <li>Ensure proper lighting and clear focus</li>
                  <li>Keep consistent image dimensions</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}