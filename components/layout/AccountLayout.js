import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { FiUser, FiPackage, FiHeart, FiLogOut, FiShield } from 'react-icons/fi';

export default function AccountLayout({ children, title }) {
  const { currentUser, logOut, userRole } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (!currentUser) {
    // Will redirect in useEffect of child components
    return null;
  }

  // Determine active link based on current path
  const isActive = (path) => {
    return router.pathname === path;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>{title || 'My Account'} | Ranga</title>
        <meta name="description" content="Manage your Ranga account" />
      </Head>

      {/* Admin Panel Banner */}
      {userRole === 'admin' && (
        <div className="bg-indigo-deep text-white py-3">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <p className="font-medium">Welcome, Admin! You have full access to manage products and orders.</p>
            <Link href="/admin" className="bg-white text-indigo-deep px-4 py-2 rounded-md flex items-center hover:bg-gray-100 transition-colors">
              <FiShield className="mr-2" />
              Go to Admin Panel
            </Link>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{title || 'My Account'}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-indigo-deep/10 flex items-center justify-center">
                  <FiUser className="text-indigo-deep" size={24} />
                </div>
                <div>
                  <h2 className="font-medium">{currentUser.displayName || 'User'}</h2>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
              </div>

              <nav className="space-y-2">
                <Link 
                  href="/account" 
                  className={`flex items-center space-x-2 p-2 ${isActive('/account') ? 'bg-indigo-deep/10 text-indigo-deep' : 'hover:bg-gray-100 text-gray-700'} rounded-md`}
                >
                  <FiUser size={18} />
                  <span>Account Overview</span>
                </Link>
                <Link 
                  href="/account/orders" 
                  className={`flex items-center space-x-2 p-2 ${isActive('/account/orders') ? 'bg-indigo-deep/10 text-indigo-deep' : 'hover:bg-gray-100 text-gray-700'} rounded-md`}
                >
                  <FiPackage size={18} />
                  <span>My Orders</span>
                </Link>
                <Link 
                  href="/account/wishlist" 
                  className={`flex items-center space-x-2 p-2 ${isActive('/account/wishlist') ? 'bg-indigo-deep/10 text-indigo-deep' : 'hover:bg-gray-100 text-gray-700'} rounded-md`}
                >
                  <FiHeart size={18} />
                  <span>Wishlist</span>
                </Link>
                
                {userRole === 'admin' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Admin Access</p>
                    <Link href="/admin" className="flex items-center space-x-2 p-2 bg-indigo-deep text-white rounded-md hover:bg-indigo-700 transition-colors">
                      <FiShield size={18} />
                      <span>Admin Dashboard</span>
                    </Link>
                  </div>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md text-gray-700 w-full text-left mt-4"
                >
                  <FiLogOut size={18} />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 