import { useState } from 'react';
import Link from 'next/link';
import { FiHeart, FiShoppingCart, FiArrowRight } from 'react-icons/fi';
import OptimizedImage from '../common/OptimizedImage';
import { useCart } from '../../contexts/CartContext';
import { useRouter } from 'next/router';
import { useNotification } from '../../contexts/NotificationContext';

export default function ProductCard({ product, view = 'grid' }) {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  // Handle missing product data gracefully
  if (!product) {
    console.error("ProductCard received null or undefined product");
    return null;
  }
  
  // Ensure all required fields exist
  const safeProduct = {
    id: product.id || '',
    name_en: product.name_en || "Unnamed Product",
    slug: product.slug || product.id || "product",
    price: product.price || 0,
    salePrice: product.salePrice,
    category: product.category || "Uncategorized",
    images: Array.isArray(product.images) ? product.images : [],
    stock: product.stock || {},
    description_en: product.description_en || "No description available"
  };
  
  // Check if product is in stock
  const isInStock = () => {
    if (!safeProduct.stock) return false;
    return Object.values(safeProduct.stock).some(qty => qty > 0);
  };
  
  // Calculate discount percentage
  const discountPercentage = safeProduct.salePrice
    ? Math.round((1 - safeProduct.salePrice / safeProduct.price) * 100)
    : 0;
  
  // Quick add to cart
  const handleQuickAdd = (e) => {
    e.preventDefault();
    
    if (!isInStock()) {
      showNotification('This product is out of stock', 'warning');
      return;
    }
    
    // Default to first available size if no sizes are available
    const availableSizes = Object.keys(safeProduct.stock || {}).filter(size => safeProduct.stock[size] > 0);
    const defaultSize = availableSizes.length > 0 ? availableSizes[0] : '32';
    
    // Add to cart with default size and quantity of 1
    const result = addToCart(safeProduct, defaultSize, 1);
    
    if (result.success) {
      showNotification(`${safeProduct.name_en} added to cart`, 'success');
    } else {
      showNotification(result.error || 'Failed to add product to cart', 'error');
    }
  };

  if (view === 'list') {
    return (
      <div className="flex flex-col md:flex-row bg-white overflow-hidden">
        {/* Product Image */}
        <Link href={`/products/${safeProduct.slug}`} className="md:w-1/3 lg:w-1/4">
          <div className="relative aspect-square bg-gray-100">
            <OptimizedImage
              src={safeProduct.images && safeProduct.images.length > 0 ? safeProduct.images[0] : '/images/placeholder.png'}
              alt={safeProduct.name_en}
              width={300}
              height={300}
              className="w-full h-full object-contain"
            />
            {discountPercentage > 0 && (
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {discountPercentage}% OFF
                </span>
              </div>
            )}
          </div>
        </Link>
        
        {/* Product Info */}
        <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
          <div>
            <Link href={`/products/${safeProduct.slug}`}>
              <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-indigo-deep">
                {safeProduct.name_en}
              </h3>
            </Link>
            
            <p className="text-sm text-gray-500 mb-2 capitalize">{safeProduct.category}</p>
            
            <div className="mb-4">
              {safeProduct.salePrice ? (
                <div className="flex items-center">
                  <span className="text-lg font-bold text-red-600 mr-2">₹{safeProduct.salePrice}</span>
                  <span className="text-sm text-gray-500 line-through">₹{safeProduct.price}</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-900">₹{safeProduct.price}</span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {safeProduct.description_en}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div>
              {isInStock() ? (
                <span className="text-sm text-green-600">In Stock</span>
              ) : (
                <span className="text-sm text-red-600">Out of Stock</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleQuickAdd}
                disabled={!isInStock()}
                className={`px-4 py-2 rounded ${
                  isInStock() 
                    ? 'bg-indigo-deep text-white hover:bg-blue-800' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add to Cart
              </button>
              
              <Link 
                href={`/products/${safeProduct.slug}`}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center"
              >
                Details <FiArrowRight className="ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Grid View
  return (
    <div 
      className="group relative bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Badge */}
      {discountPercentage > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            {discountPercentage}% OFF
          </span>
        </div>
      )}
      
      {/* Product Image */}
      <Link href={`/products/${safeProduct.slug}`} className="block aspect-square bg-gray-100 overflow-hidden">
        <div className="relative w-full h-full">
          <OptimizedImage
            src={safeProduct.images && safeProduct.images.length > 0 ? safeProduct.images[0] : '/images/placeholder.png'}
            alt={safeProduct.name_en}
            width={300}
            height={300}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Hover Actions */}
          <div 
            className={`absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center space-x-2 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={handleQuickAdd}
              disabled={!isInStock()}
              className={`p-2 rounded-full ${
                isInStock() 
                  ? 'bg-white text-indigo-deep hover:bg-indigo-deep hover:text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } transition-colors duration-200`}
              title={isInStock() ? "Quick Add to Cart" : "Out of Stock"}
            >
              <FiShoppingCart size={18} />
            </button>
          </div>
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${safeProduct.slug}`} className="block">
          <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1 hover:text-indigo-deep">
            {safeProduct.name_en}
          </h3>
        </Link>
        
        <p className="text-xs text-gray-500 mb-2 capitalize">{safeProduct.category}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {safeProduct.salePrice ? (
              <>
                <span className="text-sm font-bold text-red-600 mr-2">₹{safeProduct.salePrice}</span>
                <span className="text-xs text-gray-500 line-through">₹{safeProduct.price}</span>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-900">₹{safeProduct.price}</span>
            )}
          </div>
          
          <div className="text-xs">
            {isInStock() ? (
              <span className="text-green-600">In Stock</span>
            ) : (
              <span className="text-red-600">Out of Stock</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 