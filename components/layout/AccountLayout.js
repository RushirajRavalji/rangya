import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { FiUser, FiPackage, FiHeart, FiLogOut, FiShield } from 'react-icons/fi';

export default function AccountLayout({ children, title }) {
  const { currentUser, logout, userRole } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
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

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{title || 'My Account'}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Unified Sidebar with User Info and Navigation */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* User Profile Header */}
              <div className="p-6 bg-indigo-deep/5 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-deep/10 flex items-center justify-center">
                    <FiUser className="text-indigo-deep" size={24} />
                  </div>
                  <div>
                    <h2 className="font-medium text-lg">{currentUser.displayName || 'User'}</h2>
                    <p className="text-sm text-gray-600">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                <Link 
                  href="/account" 
                  className={`flex items-center space-x-2 p-3 ${isActive('/account') ? 'bg-indigo-deep/10 text-indigo-deep font-medium' : 'hover:bg-gray-100 text-gray-700'} rounded-md transition-colors`}
                >
                  <FiUser size={18} />
                  <span>Account Overview</span>
                </Link>
                <Link 
                  href="/account/orders" 
                  className={`flex items-center space-x-2 p-3 ${isActive('/account/orders') ? 'bg-indigo-deep/10 text-indigo-deep font-medium' : 'hover:bg-gray-100 text-gray-700'} rounded-md transition-colors`}
                >
                  <FiPackage size={18} />
                  <span>My Orders</span>
                </Link>
                <Link 
                  href="/account/wishlist" 
                  className={`flex items-center space-x-2 p-3 ${isActive('/account/wishlist') ? 'bg-indigo-deep/10 text-indigo-deep font-medium' : 'hover:bg-gray-100 text-gray-700'} rounded-md transition-colors`}
                >
                  <FiHeart size={18} />
                  <span>Wishlist</span>
                </Link>
                
                {/* Admin Dashboard Link */}
                {userRole === 'admin' && (
                  <Link 
                    href="/admin" 
                    className="flex items-center space-x-2 p-3 mt-2 bg-indigo-deep text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <FiShield size={18} />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-md text-gray-700 w-full text-left mt-2 border-t border-gray-100 pt-3"
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