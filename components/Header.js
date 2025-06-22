import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import MobileMenu from './MobileMenu';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { currentUser, userRole, logout } = useAuth();
  const { cartItems, itemCount } = useCart();
  const router = useRouter();

  // Handle scroll event for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/images/logo/logo.png" alt="Rangya" className="h-8 w-auto" />
          <span className="ml-2 text-xl font-bold text-indigo-deep">Rangya</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className={`text-sm font-medium ${router.pathname === '/' ? 'text-indigo-deep' : 'text-gray-700 hover:text-indigo-deep'}`}>
            Home
          </Link>
          <Link href="/products" className={`text-sm font-medium ${router.pathname.startsWith('/products') ? 'text-indigo-deep' : 'text-gray-700 hover:text-indigo-deep'}`}>
            Products
          </Link>
          <Link href="/about" className={`text-sm font-medium ${router.pathname === '/about' ? 'text-indigo-deep' : 'text-gray-700 hover:text-indigo-deep'}`}>
            About
          </Link>
          <Link href="/contact" className={`text-sm font-medium ${router.pathname === '/contact' ? 'text-indigo-deep' : 'text-gray-700 hover:text-indigo-deep'}`}>
            Contact
          </Link>
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {/* Cart */}
          <Link href="/cart" className="relative p-2 text-gray-700 hover:text-indigo-deep">
            <FiShoppingCart className="text-xl" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-deep text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {currentUser ? (
            <div className="relative group">
              <button className="flex items-center space-x-1 p-2 text-gray-700 hover:text-indigo-deep">
                <FiUser className="text-xl" />
                <span className="text-sm font-medium hidden lg:inline-block">
                  {currentUser.displayName || 'Account'}
                </span>
              </button>
              <div className="absolute right-0 w-48 mt-2 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
                <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  My Account
                </Link>
                <Link href="/account/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  My Orders
                </Link>
                {userRole === 'admin' && (
                  <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Admin Dashboard
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FiLogOut className="mr-2" />
                    Logout
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="flex items-center space-x-1 p-2 text-gray-700 hover:text-indigo-deep">
              <FiLogIn className="text-xl" />
              <span className="text-sm font-medium hidden lg:inline-block">Login</span>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-700 hover:text-indigo-deep md:hidden"
          >
            {isOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isOpen} setIsOpen={setIsOpen} currentUser={currentUser} userRole={userRole} handleLogout={handleLogout} />
    </header>
  );
} 