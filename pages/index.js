import { useEffect, useState } from 'react';
import Head from 'next/head';
import HeroSection from '../components/home/HeroSection';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProducts } from '../utils/productService';
import { FiTag, FiArrowRight, FiLoader } from 'react-icons/fi';
import { useRouter } from 'next/router';
import ProductCard from '../components/products/ProductCard';
import FeaturedCategories from '../components/home/FeaturedCategories';
import Testimonials from '../components/home/Testimonials';
import Newsletter from '../components/home/Newsletter';
import SEO, { generateOrganizationStructuredData } from '../components/common/SEO';

export default function Home({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [isLoading, setIsLoading] = useState(!initialProducts || initialProducts.length === 0);
  const [activeCategory, setActiveCategory] = useState('all');
  const { addToCart } = useCart();
  const { showNotification } = useNotification();
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Always fetch the latest products from the API
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        
        console.log(`Fetching products from API... (attempt ${retryCount + 1})`);
        
        // Try direct Firebase fetch first instead of API route
        try {
          console.log("Attempting direct Firebase fetch...");
          const result = await getProducts({ limit: 15, sortBy: 'createdAt', sortOrder: 'desc' });
          
          if (result && result.products && result.products.length > 0) {
            console.log(`Successfully loaded ${result.products.length} products from Firebase`);
            setProducts(result.products);
            setIsLoading(false);
            return;
          } else {
            console.warn("No products returned from Firebase direct fetch");
          }
        } catch (fbError) {
          console.error("Firebase direct fetch failed:", fbError);
        }
        
        // If Firebase direct fetch fails, try API route as fallback
        console.log("Attempting API route fetch...");
        const response = await fetch('/api/getProducts');
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.products && Array.isArray(data.products)) {
          console.log(`Successfully loaded ${data.products.length} products from API`);
          if (data.products.length > 0) {
            setProducts(data.products);
          } else {
            console.warn("API returned empty products array");
          }
        } else {
          console.warn("Invalid data format returned from API");
        }
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [retryCount]);

  // Function to handle retry button click
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Map category values to display names
  const categoryMapping = {
    'shirts': 'Denim Shirts',
    'tshirts': 'Denim T-Shirts',
    'pants': 'Denim Pants',
    'jeans': 'Jeans'
  };

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => 
        product.category && 
        product.category.toLowerCase() === activeCategory.toLowerCase()
      );

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    
    // Default to first available size if no sizes are available
    const availableSizes = Object.keys(product.stock || {}).filter(size => product.stock[size] > 0);
    const defaultSize = availableSizes.length > 0 ? availableSizes[0] : '32';
    
    // Create a properly formatted product object
    const cartProduct = {
      id: product.id,
      name_en: product.name_en || product.name || "Unknown Product",
      slug: product.slug || "",
      price: product.salePrice || product.price,
      originalPrice: product.price || 0,
      images: product.images || [],
      image: product.images && product.images.length > 0 ? product.images[0] : null
    };
    
    // Add to cart with default size and quantity of 1
    const result = addToCart(cartProduct, defaultSize, 1);
    
    if (result.success) {
      // Show notification
      showNotification(`${product.name_en || "Product"} added to cart`, 'success');
    } else {
      showNotification(result.error || 'Failed to add product to cart', 'error');
    }
  };

  // Structured data for the homepage
  const structuredData = generateOrganizationStructuredData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <FiLoader className="animate-spin text-indigo-deep h-12 w-12 mb-4" />
          <p className="text-gray-700 font-medium">Loading products...</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md text-center">
            Please wait while we load our collection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SEO 
        title="Rangya – Style Me Apna Rang"
        description="Premium denim clothing for men. Discover our exclusive collection of high-quality jeans, shirts, and accessories designed for style and comfort."
        canonical="https://rangya.com"
        openGraph={{
          title: "Rangya – Style Me Apna Rang | Premium Denim Clothing",
          description: "Premium denim clothing for men. Discover our exclusive collection of high-quality jeans, shirts, and accessories designed for style and comfort.",
          url: "https://rangya.com",
          type: "website",
          images: [
            {
              url: "/images/logo/logo.png",
              width: 1200,
              height: 630,
              alt: "Rangya – Premium Denim Clothing"
            }
          ]
        }}
        structuredData={structuredData}
      />

      <HeroSection />

      <main className="container mx-auto px-4 py-12">
        {/* Sale Banner */}
        <div className="mb-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg overflow-hidden shadow-lg">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <FiTag className="text-white mr-2 h-6 w-6" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">Special Offers</h2>
              </div>
              <p className="text-white mt-2 max-w-xl">
                Discover our exclusive collection with discounts of 50% or more! Limited time offer.
              </p>
            </div>
            <Link 
              href="/products?category=sale" 
              className="inline-flex items-center bg-white px-6 py-3 rounded-full font-medium text-red-600 hover:bg-gray-100 transition duration-200"
            >
              Shop Sale <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
        
        {/* Featured Categories */}
        <FeaturedCategories />
        
        {/* Featured Products */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link 
              href="/products" 
              className="text-indigo-deep hover:text-indigo-deep-dark flex items-center"
            >
              View All <FiArrowRight className="ml-1" />
            </Link>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeCategory === 'all' 
                  ? 'bg-indigo-deep text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {['Shirts', 'T-shirts', 'Jeans'].map((category) => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  activeCategory === category.toLowerCase() 
                    ? 'bg-indigo-deep text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setActiveCategory(category.toLowerCase())}
              >
                {category}
              </button>
            ))}
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(e) => handleAddToCart(e, product)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="bg-gray-50 p-8 rounded-lg inline-block">
                <p className="text-gray-600 mb-4">We're adding new products to this category soon.</p>
                {activeCategory !== 'all' && (
                  <button
                    onClick={() => setActiveCategory('all')}
                    className="text-indigo-deep hover:text-indigo-deep-dark font-medium"
                  >
                    View all products
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        
        {/* Testimonials */}
        <Testimonials />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
    </div>
  );
}

export async function getStaticProps() {
  try {
    // Fetch initial products for SSR - limit to 15 products
    const { products } = await getProducts({ 
      limit: 15,
      sortBy: 'popularity',
      sortOrder: 'desc'
    });
    
    return {
      props: {
        initialProducts: products || []
      },
      // Revalidate every hour
      revalidate: 3600
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        initialProducts: []
      },
      revalidate: 60 // Try again sooner if there was an error
    };
  }
} 