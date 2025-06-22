import Header from './Header';
import Link from 'next/link';
import { FiInstagram, FiFacebook, FiYoutube, FiTwitter, FiMail } from 'react-icons/fi';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">About Rangya</h3>
              <p className="text-gray-600">
                Premium denim clothing for men. Style me apna rang - express your unique style with our quality denim products.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Shop</h3>
              <ul className="space-y-2">
                <li><Link href="/products?category=shirts" className="text-gray-600 hover:text-indigo-deep">Denim Shirts</Link></li>
                <li><Link href="/products?category=tshirts" className="text-gray-600 hover:text-indigo-deep">Denim T-Shirts</Link></li>
                <li><Link href="/products?category=pants" className="text-gray-600 hover:text-indigo-deep">Denim Pants</Link></li>
                <li><Link href="/products" className="text-gray-600 hover:text-indigo-deep">All Products</Link></li>
                <li><Link href="/sale" className="text-gray-600 hover:text-indigo-deep">Sale Items</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Help</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-indigo-deep">About Us</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-indigo-deep">Contact Us</Link></li>
                <li><Link href="/security-policy" className="text-gray-600 hover:text-indigo-deep">Security Policy</Link></li>
                <li><Link href="/products" className="text-gray-600 hover:text-indigo-deep">Products</Link></li>
                <li><Link href="/login" className="text-gray-600 hover:text-indigo-deep">Account</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Connect With Us</h3>
              <div className="flex space-x-4 mb-6">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-deep text-white p-2 rounded-full hover:bg-blue-800 transition-colors">
                  <FiInstagram size={20} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-deep text-white p-2 rounded-full hover:bg-blue-800 transition-colors">
                  <FiFacebook size={20} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-deep text-white p-2 rounded-full hover:bg-blue-800 transition-colors">
                  <FiYoutube size={20} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-indigo-deep text-white p-2 rounded-full hover:bg-blue-800 transition-colors">
                  <FiTwitter size={20} />
                </a>
              </div>
              <p className="text-gray-600 mb-2">Subscribe to our newsletter</p>
              <div className="flex flex-col sm:flex-row">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="px-3 py-2 border border-gray-300 rounded-l-md sm:rounded-r-none rounded-r-md focus:outline-none focus:ring-1 focus:ring-indigo-deep w-full mb-2 sm:mb-0" 
                />
                <button className="bg-indigo-deep text-white px-4 py-2 rounded-r-md sm:rounded-l-none rounded-l-md hover:bg-blue-800 flex items-center justify-center whitespace-nowrap">
                  <FiMail className="mr-2" /> Subscribe
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-600">© {new Date().getFullYear()} Ranga – Style Me Apna Rang. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 