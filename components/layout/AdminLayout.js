import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import AdminNotifications from '../admin/AdminNotifications';
import { 
  FiHome, 
  FiPackage, 
  FiUsers, 
  FiShoppingBag, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

export default function AdminLayout({ children, title }) {
  const { currentUser, userRole, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!currentUser) {
      router.push('/login?redirect=/admin');
      return;
    }

    if (userRole !== 'admin') {
      router.push('/account');
    }
  }, [currentUser, userRole, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Determine active link based on current path
  const isActive = (path) => {
    return router.pathname === path;
  };

  // Determine if a section is active based on path prefix
  const isSectionActive = (prefix) => {
    return router.pathname.startsWith(prefix);
  };

  if (!currentUser || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-gray-600 focus:outline-none"
          >
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          <h1 className="ml-4 text-lg font-semibold text-indigo-deep">Ranga Admin</h1>
        </div>
        <div className="flex items-center">
          <AdminNotifications />
          <div className="text-sm text-gray-600 ml-4">
            {currentUser.email}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-indigo-deep text-white transform h-screen overflow-y-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}
      style={{ position: 'sticky', height: '100vh' }}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-indigo-800">
            <div className="flex items-center justify-center">
              <h1 className="text-xl font-bold text-white">Ranga Admin</h1>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/admin" 
                  className={`flex items-center p-2 rounded-md ${
                    isActive('/admin') 
                      ? 'bg-white text-indigo-deep' 
                      : 'text-white hover:bg-indigo-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <FiHome className="mr-3" />
                  Dashboard
                </Link>
              </li>

              {/* Products Section */}
              <li>
                <div className="mb-2">
                  <button
                    onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                    className={`flex items-center justify-between w-full p-2 rounded-md ${
                      isSectionActive('/admin/products') 
                        ? 'bg-indigo-800 text-white' 
                        : 'text-white hover:bg-indigo-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiShoppingBag className="mr-3" />
                      Products
                    </div>
                    {productsDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {productsDropdownOpen && (
                    <ul className="pl-10 mt-1 space-y-1">
                      <li>
                        <Link 
                          href="/admin/products" 
                          className={`block p-2 rounded-md ${
                            isActive('/admin/products') 
                              ? 'bg-white text-indigo-deep' 
                              : 'text-white hover:bg-indigo-800'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          All Products
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/admin/products/new" 
                          className={`block p-2 rounded-md ${
                            isActive('/admin/products/new') 
                              ? 'bg-white text-indigo-deep' 
                              : 'text-white hover:bg-indigo-800'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          Add Product
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              </li>

              {/* Orders Section */}
              <li>
                <div className="mb-2">
                  <button
                    onClick={() => setOrdersDropdownOpen(!ordersDropdownOpen)}
                    className={`flex items-center justify-between w-full p-2 rounded-md ${
                      isSectionActive('/admin/orders') 
                        ? 'bg-indigo-800 text-white' 
                        : 'text-white hover:bg-indigo-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiPackage className="mr-3" />
                      Orders
                    </div>
                    {ordersDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {ordersDropdownOpen && (
                    <ul className="pl-10 mt-1 space-y-1">
                      <li>
                        <Link 
                          href="/admin/orders" 
                          className={`block p-2 rounded-md ${
                            isActive('/admin/orders') 
                              ? 'bg-white text-indigo-deep' 
                              : 'text-white hover:bg-indigo-800'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          All Orders
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              </li>

              {/* Users */}
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
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-indigo-800 mt-auto">
            <div className="flex flex-col">
              <div className="text-sm text-indigo-200 mb-2">
                Logged in as: {currentUser.email}
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
      <div className="flex-1">
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center">
            <AdminNotifications />
            <div className="ml-4 text-sm text-gray-600">
              Logged in as: <span className="font-medium">{currentUser.email}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 pt-16 lg:pt-4">
          {children}
        </div>
      </div>
    </div>
  );
} 