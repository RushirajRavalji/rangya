import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiUser, FiLogOut, FiLogIn, FiShoppingBag, FiHome, FiInfo, FiPhone } from 'react-icons/fi';

export default function MobileMenu({ isOpen, setIsOpen, currentUser, userRole, handleLogout }) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white shadow-lg absolute top-full left-0 w-full py-2 px-4 border-t border-gray-200">
      <nav className="flex flex-col space-y-3">
        <Link 
          href="/" 
          className={`flex items-center py-2 ${router.pathname === '/' ? 'text-indigo-deep' : 'text-gray-700'}`}
          onClick={() => setIsOpen(false)}
        >
          <FiHome className="mr-3" />
          Home
        </Link>
                <Link 
          href="/products" 
          className={`flex items-center py-2 ${router.pathname.startsWith('/products') ? 'text-indigo-deep' : 'text-gray-700'}`}
          onClick={() => setIsOpen(false)}
        >
          <FiShoppingBag className="mr-3" />
          Products
        </Link>
        
        <Link 
          href="/about" 
          className={`flex items-center py-2 ${router.pathname === '/about' ? 'text-indigo-deep' : 'text-gray-700'}`}
          onClick={() => setIsOpen(false)}
        >
          <FiInfo className="mr-3" />
          About
        </Link>
        
        <Link 
          href="/contact" 
          className={`flex items-center py-2 ${router.pathname === '/contact' ? 'text-indigo-deep' : 'text-gray-700'}`}
          onClick={() => setIsOpen(false)}
        >
          <FiPhone className="mr-3" />
          Contact
        </Link>
        
        <div className="border-t border-gray-200 pt-2">
          {currentUser ? (
            <>
              <Link 
                href="/profile" 
                className="flex items-center py-2 text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <FiUser className="mr-3" />
                My Profile
              </Link>
              
              <Link 
                href="/orders" 
                className="flex items-center py-2 text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <FiShoppingBag className="mr-3" />
                My Orders
              </Link>
              
              {userRole === 'admin' && (
                <Link 
                  href="/admin" 
                  className="flex items-center py-2 text-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  <FiUser className="mr-3" />
                  Admin Dashboard
                </Link>
              )}
              
              <button 
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="flex items-center py-2 text-gray-700 w-full text-left"
              >
                <FiLogOut className="mr-3" />
                Logout
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="flex items-center py-2 text-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <FiLogIn className="mr-3" />
              Login / Register
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
} 