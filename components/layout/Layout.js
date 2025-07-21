import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from './Header';
import { CartProvider } from '../../contexts/CartContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { AuthProvider } from '../../contexts/AuthContext';
import ErrorBoundary from '../common/ErrorBoundary';

export default function Layout({ children, title, description }) {
  const [mounted, setMounted] = useState(false);

  // Wait until after client-side hydration to show
  useEffect(() => {
    setMounted(true);
  }, []);

  const pageTitle = title ? `${title} | Rangya` : 'Rangya - Premium Denim Products';
  const pageDescription = description || 'Discover premium quality denim products at Rangya. Shop our collection of jeans, jackets, and accessories.';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
              </Head>

              {mounted && <Header />}
              
              <main className="flex-grow">
                {mounted ? children : (
                  <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-deep"></div>
                  </div>
                )}
              </main>
              
              <footer className="bg-gray-900 text-white py-8">
                <div className="container mx-auto px-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">About Rangya</h3>
                      <p className="text-gray-400">
                        Premium quality denim products crafted with care and attention to detail.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                      <ul className="space-y-2">
                        <li><a href="/products" className="text-gray-400 hover:text-white">Products</a></li>
                        <li><a href="/about" className="text-gray-400 hover:text-white">About Us</a></li>
                        <li><a href="/contact" className="text-gray-400 hover:text-white">Contact</a></li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                      <p className="text-gray-400">
                        Email: info@rangya.com<br />
                        Phone: +91 1234567890
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-800 text-center text-gray-500">
                    <p>&copy; {new Date().getFullYear()} Rangya. All rights reserved.</p>
                  </div>
                </div>
              </footer>
            </div>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
} 