import { useEffect, useState } from 'react';
import Head from 'next/head';
import HeroSection from '../components/home/HeroSection';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProducts } from '../utils/productService';
import { FiTag, FiArrowRight, FiLoader, FiAlertCircle } from 'react-icons/fi';
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
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Always fetch the latest products from the API
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
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
            setError('No products found. Please try again later.');
          }
        } else {
          console.warn("Invalid data format returned from API");
          setError('Error loading products. Invalid data format.');
        }
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load products. Please try again later.');
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
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SEO 
        title="Ranga – Style Me Apna Rang"
        description="Premium denim clothing for men. Discover our exclusive collection of high-quality jeans, shirts, and accessories designed for style and comfort."
        canonical="https://ranga-denim.com"
        openGraph={{
          title: "Ranga – Style Me Apna Rang | Premium Denim Clothing",
          description: "Premium denim clothing for men. Discover our exclusive collection of high-quality jeans, shirts, and accessories designed for style and comfort.",
          url: "https://ranga-denim.com",
          type: "website",
          images: [
            {
              url: "https://ranga-denim.com/images/og-image.jpg",
              width: 1200,
              height: 630,
              alt: "Ranga – Premium Denim Clothing"
            }
          ]
        }}
        structuredData={structuredData}
      />

      <HeroSection />

      <main className="container mx-auto px-4 py-12">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button 
              onClick={handleRetry}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
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
            <Link href="/sale" className="bg-white text-red-500 px-6 py-3 rounded-full font-semibold flex items-center hover:bg-gray-100 transition-colors">
              Shop Now <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
        
        {/* Featured Categories */}
        <FeaturedCategories />
        
        {/* Featured Products */}
        <section className="py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="mt-2 text-gray-600">Discover our most popular items</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <button 
              className={`px-6 py-2 rounded-full ${activeCategory === 'all' ? 'bg-indigo-deep text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              onClick={() => setActiveCategory('all')}
            >
              All Products
            </button>
            {Object.keys(categoryMapping).map(category => (
              <button 
                key={category}
                className={`px-6 py-2 rounded-full ${activeCategory === category ? 'bg-indigo-deep text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                onClick={() => setActiveCategory(category)}
              >
                {categoryMapping[category]}
              </button>
            ))}
          </div>
          
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.slice(0, 15).map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onAddToCart={(e) => handleAddToCart(e, product)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No products found in this category.</p>
              <button 
                onClick={handleRetry}
                className="mt-4 px-4 py-2 bg-indigo-deep text-white rounded hover:bg-blue-800"
              >
                Refresh Products
              </button>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Link href="/products" className="inline-flex items-center text-indigo-deep hover:text-blue-800 font-medium">
              View All Products <FiArrowRight className="ml-2" />
            </Link>
          </div>
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