import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../utils/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import AccountLayout from '../../components/layout/AccountLayout';
import { FiShield } from 'react-icons/fi';

export default function Account() {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login?redirect=/account');
      return;
    }

    // Fetch user's orders
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('customer.email', '==', currentUser.email),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toLocaleDateString() || 'N/A'
        }));
        
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, router]);

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <AccountLayout title="Account Overview">
      {/* Admin Panel Access Button */}
      {userRole === 'admin' && (
        <div className="bg-indigo-deep text-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Admin Access</h2>
              <p>You have administrator privileges. Access the admin panel to manage products, orders, and users.</p>
            </div>
            <Link 
              href="/admin" 
              className="bg-white text-indigo-deep px-6 py-3 rounded-md font-medium flex items-center hover:bg-gray-100 transition-colors"
            >
              <FiShield className="mr-2" size={20} />
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Account Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Personal Information</h3>
            <p className="text-gray-600">Name: {currentUser.displayName || 'N/A'}</p>
            <p className="text-gray-600">Email: {currentUser.email}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Default Shipping Address</h3>
            <p className="text-gray-600">No address saved yet</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm text-indigo-deep hover:text-blue-800">
            View all orders
          </Link>
        </div>
        
        {loading ? (
          <p className="text-gray-600">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
            <Link href="/products" className="bg-indigo-deep text-white px-4 py-2 rounded hover:bg-blue-800">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 3).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{order.total?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <Link href={`/account/orders/${order.id}`} className="text-indigo-deep hover:text-blue-800">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}