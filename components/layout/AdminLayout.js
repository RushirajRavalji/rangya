import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiMenu, 
  FiX, 
  FiHome, 
  FiPackage, 
  FiShoppingBag, 
  FiUsers, 
  FiLogOut,
  FiImage,
  FiBell
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

import AdminNotifications from '../admin/AdminNotifications';
import ProductNotifications from '../admin/ProductNotifications';

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  // Check if section is active
  const isSectionActive = (path) => {
    return router.pathname.startsWith(path);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      showNotification('You have been logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Failed to log out. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 h-16 bg-indigo-950">
            <Link href="/admin" className="text-xl font-bold text-white">
              Rangya Admin
            </Link>
            <button 
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/admin" 
                  className={`flex items-center p-2 rounded-md ${
                    router.pathname === '/admin' 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiHome className="mr-3" />
                  Dashboard
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/products" 
                  className={`flex items-center p-2 rounded-md ${
                    isSectionActive('/admin/products') 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiPackage className="mr-3" />
                  Products
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/orders" 
                  className={`flex items-center p-2 rounded-md ${
                    isSectionActive('/admin/orders') 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiShoppingBag className="mr-3" />
                  Orders
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/users" 
                  className={`flex items-center p-2 rounded-md ${
                    isSectionActive('/admin/users') 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiUsers className="mr-3" />
                  Users
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/carousel" 
                  className={`flex items-center p-2 rounded-md ${
                    isSectionActive('/admin/carousel') 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiImage className="mr-3" />
                  Carousel
                </Link>
              </li>
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-indigo-800 mt-auto">
            <div className="flex flex-col">
              <div className="text-sm text-indigo-200 mb-2">
                Logged in as: {currentUser?.email || 'Admin'}
              </div>
              <div className="flex space-x-2">
                <Link 
                  href="/" 
                  className="flex-1 px-4 py-2 text-sm text-center bg-indigo-800 hover:bg-indigo-700 text-white rounded-md"
                  onClick={() => setSidebarOpen(false)}
                >
                  View Site
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="flex-1 px-4 py-2 text-sm text-center bg-red-600 text-white hover:bg-red-700 rounded-md"
                >
                  <FiLogOut className="inline mr-1" /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm h-16 flex items-center justify-between px-4">
          <div className="flex items-center">
            <button 
              className="lg:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu size={24} />
            </button>
            <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-800">{title || 'Admin Dashboard'}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <AdminNotifications />
            <ProductNotifications />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}