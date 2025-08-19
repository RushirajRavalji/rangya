import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiShoppingBag, FiHeart, FiShare2, FiChevronLeft, FiChevronRight, FiShoppingCart, FiLoader, FiAlertCircle, FiArrowLeft, FiCheck } from 'react-icons/fi';
import SEO from '../../components/common/SEO';
import OptimizedImage from '../../components/common/OptimizedImage';
import { useCart } from '../../contexts/CartContext';
import { db } from '../../utils/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { getProductBySlug, getRelatedProducts, toggleWishlistItem, isInWishlist } from '../../utils/productService';
import ProductCard from '../../components/products/ProductCard';
import { useNotification } from '../../contexts/NotificationContext';
import analytics from '../../utils/analytics';

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  const { showNotification } = useNotification();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  
  // Define the size chart image path
  const sizeChartImage = '/images/size-chart.png';
  
  // Fetch product data
  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      
      try {
        setLoading(true);
        const productData = await getProductBySlug(slug);
        
        if (productData) {
          setProduct(productData);
          
          // Set default selected size to the first available size
          if (productData.stock) {
            const availableSizes = Object.entries(productData.stock)
              .filter(([_, stock]) => stock > 0)
              .map(([size]) => size);
            
            if (availableSizes.length > 0) {
              setSelectedSize(availableSizes[0]);
            }
          }
          
          // Fetch related products
          const related = await getRelatedProducts(productData);
          setRelatedProducts(related);
          
          // Check if product is in user's wishlist
          if (currentUser) {
            const wishlistStatus = await isInWishlist(currentUser.uid, productData.id);
            setInWishlist(wishlistStatus);
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProduct();
  }, [slug, currentUser]);

  // Track product view with analytics
  useEffect(() => {
    if (product && !loading) {
      try {
        analytics.ecommerce.viewProduct(product);
      } catch (error) {
        console.error('Error tracking product view:', error);
      }
    }
  }, [product, loading]);

  // Handle size selection
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= getMaxQuantity()) {
      setQuantity(value);
    }
  };

  // Get maximum available quantity for selected size
  const getMaxQuantity = () => {
    if (!product || !selectedSize || !product.stock) return 0;
    return product.stock[selectedSize] || 0;
  };

  // Check if product is in stock
  const isInStock = () => {
    if (!product || !product.stock) return false;
    return Object.values(product.stock).some(qty => qty > 0);
  };

  // Check if selected size is available
  const isSizeAvailable = (size) => {
    if (!product || !product.stock) return false;
    return (product.stock[size] || 0) > 0;
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedSize) {
      showNotification('Please select a size', 'warning');
      return;
    }
    
    try {
      setAddingToCart(true);
      
      // Add to cart using context
      const result = addToCart(product, selectedSize, quantity);
      
      if (result.authRequired) {
        // Redirect to login page with return URL
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add item to cart');
      }
      
      // The notification is already shown in the addToCart function in CartContext
      // so we don't need to show it again here
      setAddedToCart(true);
      setTimeout(() => {
        setAddedToCart(false);
      }, 3000);
    } catch (err) {
      console.error('Error adding to cart:', err);
      showNotification('Failed to add item to cart', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle wishlist toggle
  const handleToggleWishlist = async () => {
    if (!currentUser) {
      router.push('/login?redirect=' + router.asPath);
      return;
    }
    
    try {
      setTogglingWishlist(true);
      const isAdded = await toggleWishlistItem(currentUser.uid, product.id);
      setInWishlist(isAdded);
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showNotification('Failed to update wishlist', 'error');
    } finally {
      setTogglingWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FiLoader className="animate-spin text-indigo-deep h-8 w-8 mb-4" />
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center">
          <FiAlertCircle className="text-red-500 mr-3" />
          <p>{error || 'Product not found'}</p>
        </div>
        <div className="text-center mt-4">
          <Link href="/products" className="inline-flex items-center text-indigo-deep hover:text-blue-800">
            <FiArrowLeft className="mr-2" /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // Generate breadcrumb data for structured data
  const breadcrumbItems = [
    { name: 'Home', url: 'https://ranga-denim.com/' },
    { name: 'Products', url: 'https://ranga-denim.com/products' },
    { name: 'Products', url: `https://ranga-denim.com/products?category=${encodeURIComponent(product.category)}` },
    { name: product.name_en, url: `https://ranga-denim.com/products/${product.slug}` }
  ];
  
  // Generate product structured data
  const productStructuredData = generateProductStructuredData(product);
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(breadcrumbItems);
  
  // Combine structured data
  const structuredData = [productStructuredData, breadcrumbStructuredData];

  return (
    <>
      <SEO 
        title={`${product.name_en || product.name} | Rangya`}
        description={product.description_en || product.description || `Buy ${product.name_en || product.name} - Premium quality denim clothing from Rangya.`}
        canonical={`/products/${product.slug}`}
        image={product.images && product.images.length > 0 ? product.images[0] : '/images/logo/logo.png'}
        type="product"
        product={{
          name: product.name_en || product.name,
          description: product.description_en || product.description,
          images: product.images,
          id: product.id,
          price: product.price,
          salePrice: product.salePrice,
          inStock: isInStock()
        }}
        keywords={[product.name_en || product.name, product.category, 'denim', 'clothing', 'fashion', 'Rangya']}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-indigo-deep">Home</Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link href="/products" className="text-gray-500 hover:text-indigo-deep">Products</Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link 
                href={`/products?category=${encodeURIComponent(product.category)}`} 
                className="text-gray-500 hover:text-indigo-deep"
              >
                {product.category}
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-indigo-deep font-medium truncate">{product.name_en}</li>
          </ol>
        </nav>
        
        {/* Product Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square">
              {selectedImage === 'size-chart' ? (
                <OptimizedImage
                  src={sizeChartImage}
                  alt="Size Chart"
                  width={600}
                  height={600}
                  className="w-full h-full object-contain"
                />
              ) : product.images && product.images.length > 0 ? (
                <OptimizedImage
                  src={product.images[selectedImage]}
                  alt={product.name_en}
                  width={600}
                  height={600}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No image available
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery with Size Chart */}
            <div className="grid grid-cols-6 gap-2">
              {/* Size Chart Thumbnail */}
              <button
                onClick={() => setSelectedImage('size-chart')}
                className={`bg-gray-100 rounded-md overflow-hidden aspect-square ${
                  selectedImage === 'size-chart' ? 'ring-2 ring-indigo-deep' : ''
                }`}
              >
                <OptimizedImage
                  src={sizeChartImage}
                  alt="Size Chart"
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                />
              </button>
              
              {/* Product Images */}
              {product.images && product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`bg-gray-100 rounded-md overflow-hidden aspect-square ${
                    selectedImage === index ? 'ring-2 ring-indigo-deep' : ''
                  }`}
                >
                  <OptimizedImage
                    src={image}
                    alt={`${product.name_en} - Image ${index + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
          
          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name_en}</h1>
            
            {/* Price */}
            <div className="mb-4">
              {product.salePrice ? (
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-red-600">₹{product.salePrice}</span>
                  <span className="ml-2 text-lg text-gray-500 line-through">₹{product.price}</span>
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
                    {Math.round((1 - product.salePrice / product.price) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
              )}
            </div>
            
            {/* Availability */}
            <div className="mb-6">
              {isInStock() ? (
                <span className="text-green-600 font-medium flex items-center">
                  <FiCheck className="mr-1" /> In Stock
                </span>
              ) : (
                <span className="text-red-600 font-medium">Out of Stock</span>
              )}
            </div>
            
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{product.description_en}</p>
            </div>
            
            {/* Size Chart */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Size Chart</h2>
              <div className="border rounded-md p-2 inline-block">
                <OptimizedImage
                  src={sizeChartImage}
                  alt="Size Chart"
                  width={400}
                  height={300}
                  className="object-contain"
                />
              </div>
            </div>
            
            {/* Size Selection */}
            {product.stock && Object.keys(product.stock).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Select Size</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(product.stock).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      disabled={!isSizeAvailable(size)}
                      className={`px-4 py-2 border rounded-md ${
                        selectedSize === size 
                          ? 'border-indigo-deep bg-indigo-deep text-white' 
                          : isSizeAvailable(size)
                            ? 'border-gray-300 hover:border-indigo-deep'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quantity */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Quantity</h2>
              <div className="flex items-center">
                <button
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={getMaxQuantity()}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-16 text-center border-t border-b border-gray-300 py-1"
                />
                <button
                  onClick={() => quantity < getMaxQuantity() && setQuantity(quantity + 1)}
                  disabled={quantity >= getMaxQuantity()}
                  className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!isInStock() || !selectedSize || addingToCart || getMaxQuantity() < quantity}
                className={`flex-1 px-6 py-3 rounded-md flex items-center justify-center ${
                  isInStock() && selectedSize && !addingToCart && getMaxQuantity() >= quantity
                    ? 'bg-indigo-deep text-white hover:bg-blue-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {addingToCart ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Adding...
                  </>
                ) : addedToCart ? (
                  <>
                    <FiCheck className="mr-2" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <FiShoppingCart className="mr-2" />
                    Add to Cart
                  </>
                )}
              </button>
              
              <button
                onClick={handleToggleWishlist}
                disabled={togglingWishlist}
                className={`px-6 py-3 rounded-md flex items-center justify-center border ${
                  inWishlist
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-deep hover:text-indigo-deep'
                }`}
              >
                {togglingWishlist ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiHeart className={inWishlist ? 'fill-current' : ''} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export async function getStaticPaths() {
  try {
    // Get all products from Firestore
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    // Create paths for each product
    const paths = productsSnapshot.docs.map(doc => ({
      params: { slug: doc.data().slug }
    }));
    
    return {
      paths,
      fallback: true // Generate pages for paths not returned by getStaticPaths
    };
  } catch (error) {
    console.error('Error getting product paths:', error);
    return {
      paths: [],
      fallback: true
    };
  }
}

export async function getStaticProps({ params }) {
  try {
    // Query for the product with the matching slug
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('slug', '==', params.slug));
    const querySnapshot = await getDocs(q);
    
    // If no product found, return 404
    if (querySnapshot.empty) {
      return {
        notFound: true
      };
    }
    
    // Get the first matching product
    const productData = querySnapshot.docs[0].data();
    
    // Add the document ID to the product data and handle timestamp serialization
    const product = {
      id: querySnapshot.docs[0].id,
      ...productData,
      // Convert timestamp objects to ISO strings to make them serializable
      createdAt: productData.createdAt ? productData.createdAt.toDate().toISOString() : null,
      updatedAt: productData.updatedAt ? productData.updatedAt.toDate().toISOString() : null
    };
    
    return {
      props: {
        product
      },
      // Revalidate every hour
      revalidate: 3600
    };
  } catch (error) {
    console.error('Error getting product data:', error);
    return {
      props: {
        error: 'Failed to load product data',
        product: null
      },
      revalidate: 60 // Try again sooner if there was an error
    };
  }
}

// Generate structured data for products
const generateProductStructuredData = (product) => {
  const baseUrl = 'https://ranga-denim.com';
  
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name_en || product.name,
    "image": product.images && product.images.length > 0 ? product.images.map(img => img.startsWith('http') ? img : `${baseUrl}/images/products/${img}`) : [],
    "description": product.description_en || product.description,
    "sku": product.sku || product.id,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": "Rangya"
    },
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/products/${product.slug}`,
      "priceCurrency": "INR",
      "price": product.salePrice || product.price,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      "availability": product.stock && Object.values(product.stock).some(qty => qty > 0) ? 
        "https://schema.org/InStock" : 
        "https://schema.org/OutOfStock"
    }
  };
};

// Generate structured data for breadcrumbs
const generateBreadcrumbStructuredData = (items) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
};