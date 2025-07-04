import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiMenu, FiX, FiShoppingCart, FiUser, FiLogIn, FiLogOut, FiShield, FiTag } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, logout, userRole, authError } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Refs for accessibility and keyboard navigation
  const accountButtonRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const firstDropdownItemRef = useRef(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        setCartCount(count);
      } catch (error) {
        console.error('Error parsing cart:', error);
        setCartCount(0);
      }
    };

    // Initial update
    updateCartCount();

    // Listen for storage events (when cart is updated)
    window.addEventListener('storage', updateCartCount);
    // Also listen for custom cart update events
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  // Show auth errors as notifications
  useEffect(() => {
    if (authError) {
      showNotification(authError, 'error');
    }
  }, [authError, showNotification]);
  
  // Handle keyboard navigation for dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showAccountDropdown) return;
      
      switch (e.key) {
        case 'Escape':
          setShowAccountDropdown(false);
          accountButtonRef.current?.focus();
          break;
        case 'Tab':
          // If tabbing out of the dropdown, close it
          if (!e.shiftKey && e.target === accountDropdownRef.current?.lastElementChild) {
            setTimeout(() => setShowAccountDropdown(false), 100);
          } else if (e.shiftKey && e.target === firstDropdownItemRef.current) {
            setTimeout(() => setShowAccountDropdown(false), 100);
          }
          break;
        default:
          break;
      }
    };
    
    if (showAccountDropdown) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the first item in the dropdown
      firstDropdownItemRef.current?.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAccountDropdown]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.push('/');
      showNotification('You have been logged out successfully', 'success');
    } catch (error) {
      console.error('Logout failed', error);
      showNotification('Logout failed. Please try again.', 'error');
    } finally {
      setLoggingOut(false);
      setShowAccountDropdown(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const toggleAccountDropdown = () => {
    setShowAccountDropdown(!showAccountDropdown);
  };

  return (
    <header className={`sticky top-0 z-50 bg-white transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`} role="banner">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center py-2" aria-label="Rangya - Home">
            <img src="/images/logo/logo.png" alt="Rangya" className="h-16 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8" aria-label="Main Navigation">
            <Link 
              href="/" 
              className={`hover:text-indigo-deep ${router.pathname === '/' ? 'text-indigo-deep' : 'text-gray-700'}`}
              aria-current={router.pathname === '/' ? 'page' : undefined}
            >
              Home
            </Link>
            <Link 
              href="/products" 
              className={`hover:text-indigo-deep ${router.pathname.startsWith('/products') ? 'text-indigo-deep' : 'text-gray-700'}`}
              aria-current={router.pathname.startsWith('/products') ? 'page' : undefined}
            >
              Products
            </Link>
            <Link 
              href="/sale" 
              className={`hover:text-indigo-deep flex items-center ${router.pathname === '/sale' ? 'text-indigo-deep' : 'text-gray-700'}`}
              aria-current={router.pathname === '/sale' ? 'page' : undefined}
            >
              <FiTag className="mr-1" aria-hidden="true" />
              <span>Sale</span>
            </Link>
            <Link 
              href="/about" 
              className={`hover:text-indigo-deep ${router.pathname === '/about' ? 'text-indigo-deep' : 'text-gray-700'}`}
              aria-current={router.pathname === '/about' ? 'page' : undefined}
            >
              About Us
            </Link>
            <Link 
              href="/contact" 
              className={`hover:text-indigo-deep ${router.pathname === '/contact' ? 'text-indigo-deep' : 'text-gray-700'}`}
              aria-current={router.pathname === '/contact' ? 'page' : undefined}
            >
              Contact
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon */}
            <Link 
              href="/cart" 
              className="relative text-gray-700 hover:text-indigo-deep"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <FiShoppingCart size={20} aria-hidden="true" />
              {cartCount > 0 && (
                <span 
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Account */}
            {currentUser ? (
              <div className="relative">
                <button 
                  ref={accountButtonRef}
                  className="flex items-center text-gray-700 hover:text-indigo-deep"
                  onClick={toggleAccountDropdown}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAccountDropdown();
                    }
                  }}
                  aria-expanded={showAccountDropdown}
                  aria-haspopup="true"
                  aria-controls="account-dropdown"
                >
                  <FiUser size={20} aria-hidden="true" />
                  <span className="sr-only">Account menu</span>
                </button>
                {showAccountDropdown && (
                  <div 
                    id="account-dropdown"
                    ref={accountDropdownRef}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 account-dropdown"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="account-menu-button"
                  >
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {currentUser.email}
                    </div>
                    
                    {/* Admin Panel Link - Shown at the top for admin users */}
                    {userRole === 'admin' && !router.pathname.startsWith('/admin') && (
                      <div className="px-2 py-2 mb-1">
                        <Link 
                          href="/admin" 
                          className="flex items-center justify-center px-4 py-2 bg-indigo-deep text-white rounded-md hover:bg-indigo-700 transition-colors"
                          role="menuitem"
                          ref={firstDropdownItemRef}
                          tabIndex={0}
                        >
                          <FiShield className="mr-2" aria-hidden="true" />
                          Admin Dashboard
                        </Link>
                      </div>
                    )}
                    
                    <Link 
                      href="/account/orders" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      ref={userRole === 'admin' ? null : firstDropdownItemRef}
                      tabIndex={0}
                    >
                      My Orders
                    </Link>
                    <Link 
                      href="/account/wishlist" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={0}
                    >
                      Wishlist
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      role="menuitem"
                      tabIndex={0}
                    >
                      <FiLogOut className="mr-2" aria-hidden="true" />
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center text-gray-700 hover:text-indigo-deep"
                aria-label="Login to your account"
              >
                <FiLogIn size={20} className="mr-1" aria-hidden="true" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              ref={mobileMenuButtonRef}
              className="md:hidden text-gray-700" 
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <FiX size={24} aria-hidden="true" /> : <FiMenu size={24} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          id="mobile-menu"
          className="md:hidden bg-white shadow-lg"
          role="navigation"
          aria-label="Mobile Navigation"
        >
          <nav className="flex flex-col py-4">
            <Link 
              href="/" 
              className="px-4 py-2 hover:bg-gray-100" 
              onClick={toggleMenu}
              aria-current={router.pathname === '/' ? 'page' : undefined}
            >
              Home
            </Link>
            <Link 
              href="/products" 
              className="px-4 py-2 hover:bg-gray-100" 
              onClick={toggleMenu}
              aria-current={router.pathname.startsWith('/products') ? 'page' : undefined}
            >
              Products
            </Link>
            <Link 
              href="/sale" 
              className="px-4 py-2 hover:bg-gray-100 flex items-center" 
              onClick={toggleMenu}
              aria-current={router.pathname === '/sale' ? 'page' : undefined}
            >
              <FiTag className="mr-2" aria-hidden="true" />
              Sale
            </Link>
            <Link 
              href="/about" 
              className="px-4 py-2 hover:bg-gray-100" 
              onClick={toggleMenu}
              aria-current={router.pathname === '/about' ? 'page' : undefined}
            >
              About Us
            </Link>
            <Link 
              href="/contact" 
              className="px-4 py-2 hover:bg-gray-100" 
              onClick={toggleMenu}
              aria-current={router.pathname === '/contact' ? 'page' : undefined}
            >
              Contact
            </Link>
            {currentUser && userRole === 'admin' && !router.pathname.startsWith('/admin') && (
              <Link 
                href="/admin" 
                className="flex items-center px-4 py-3 bg-indigo-deep/10 text-indigo-deep font-medium" 
                onClick={toggleMenu}
              >
                <FiShield className="mr-2" aria-hidden="true" />
                Admin Panel
              </Link>
            )}
            {currentUser ? (
              <>
                <Link 
                  href="/account/orders" 
                  className="px-4 py-2 hover:bg-gray-100" 
                  onClick={toggleMenu}
                >
                  My Orders
                </Link>
                <Link 
                  href="/account/wishlist" 
                  className="px-4 py-2 hover:bg-gray-100" 
                  onClick={toggleMenu}
                >
                  Wishlist
                </Link>
                <button
                  className="flex items-center w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  disabled={loggingOut}
                >
                  <FiLogOut className="mr-2" aria-hidden="true" />
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center px-4 py-2 text-indigo-deep hover:bg-indigo-deep/10" 
                onClick={toggleMenu}
              >
                <FiLogIn className="mr-2" aria-hidden="true" />
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 