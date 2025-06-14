import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiFilter, FiX, FiChevronDown, FiLoader, FiGrid, FiList, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { getProducts } from '../../utils/productService';
import ProductCard from '../../components/products/ProductCard';
import SEO from '../../components/common/SEO';

export default function Products() {
  const router = useRouter();
  const { category, sort } = router.query;
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [retryCount, setRetryCount] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    category: category || '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Available categories (would typically come from an API)
  const categories = [
    'All',
    'Jeans',
    'Shirts',
    'T-shirts',
    'Accessories'
  ];
  
  // Sort options
  const sortOptions = [
    { label: 'Newest', value: 'createdAt-desc' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Name: A to Z', value: 'name_en-asc' },
    { label: 'Name: Z to A', value: 'name_en-desc' }
  ];
  
  // Initialize filters from URL params
  useEffect(() => {
    const newFilters = { ...filters };
    
    if (category) {
      newFilters.category = category;
    }
    
    if (sort) {
      const [sortBy, sortOrder] = sort.split('-');
      newFilters.sortBy = sortBy;
      newFilters.sortOrder = sortOrder;
    }
    
    setFilters(newFilters);
  }, [category, sort]);
  
  // Fetch products when filters change or retry is triggered
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Products page: Fetching products with filters (attempt ${retryCount + 1}):`, filters);
        
        const options = {
          category: filters.category !== 'All' ? filters.category : null,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          limit: 24
        };
        
        // Try direct Firebase fetch
        try {
          const result = await getProducts(options);
          
          if (result && result.products) {
            console.log(`Products page: Successfully loaded ${result.products.length} products`);
            setProducts(result.products || []);
            setLastDoc(result.lastDoc);
            setHasMore((result.products || []).length === 24);
          } else {
            console.warn("Products page: No products returned from service");
            setError('Failed to load products. Please try again.');
          }
        } catch (err) {
          console.error('Products page: Error fetching products:', err);
          setError('Failed to load products');
          
          // Try API route as fallback
          try {
            console.log("Products page: Attempting API route fallback...");
            const queryParams = new URLSearchParams();
            if (options.category) queryParams.append('category', options.category);
            if (options.sortBy) queryParams.append('sortBy', options.sortBy);
            if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
            if (options.limit) queryParams.append('limit', options.limit.toString());
            
            const response = await fetch(`/api/getProducts?${queryParams.toString()}`);
            
            if (!response.ok) {
              throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.products && Array.isArray(data.products)) {
              console.log(`Products page: Successfully loaded ${data.products.length} products from API`);
              setProducts(data.products);
              setError(null); // Clear error if API call succeeds
            } else {
              throw new Error('Invalid data format returned from API');
            }
          } catch (apiError) {
            console.error('Products page: API fallback failed:', apiError);
            // Keep the original error if API fallback also fails
          }
        }
      } catch (err) {
        console.error('Products page: Error in fetchProducts:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, [filters, retryCount]);
  
  // Load more products
  const loadMoreProducts = async () => {
    if (!hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      const options = {
        category: filters.category !== 'All' ? filters.category : null,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 24,
        lastDoc
      };
      
      const result = await getProducts(options);
      
      if (result && result.products && result.products.length > 0) {
        setProducts(prev => [...prev, ...result.products]);
        setLastDoc(result.lastDoc);
        setHasMore(result.products.length === 24);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Update URL
    const query = {};
    if (newFilters.category && newFilters.category !== 'All') {
      query.category = newFilters.category;
    }
    
    if (newFilters.sortBy && newFilters.sortOrder) {
      query.sort = `${newFilters.sortBy}-${newFilters.sortOrder}`;
    }
    
    router.push({
      pathname: '/products',
      query
    }, undefined, { shallow: true });
  };
  
  // Handle sort change
  const handleSortChange = (sortValue) => {
    const [sortBy, sortOrder] = sortValue.split('-');
    handleFilterChange('sortBy', sortBy);
    handleFilterChange('sortOrder', sortOrder);
  };

  // Generate page title and description based on category
  const getPageTitle = () => {
    if (filters.category && filters.category !== 'All') {
      return `${filters.category} | Ranga`;
    }
    return 'All Products | Ranga';
  };

  const getPageDescription = () => {
    if (filters.category && filters.category !== 'All') {
      return `Browse our collection of premium ${filters.category.toLowerCase()}`;
    }
    return 'Browse our complete collection of premium denim products';
  };
  
  return (
    <>
      <SEO 
        title={getPageTitle()}
        description={getPageDescription()}
        canonical={`https://ranga-denim.com/products${filters.category && filters.category !== 'All' ? `?category=${filters.category}` : ''}`}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {filters.category && filters.category !== 'All' ? filters.category : 'All Products'}
          </h1>
          {filters.category && filters.category !== 'All' && (
            <p className="text-gray-600 mt-2">
              Browse our collection of premium {filters.category.toLowerCase()}
            </p>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button 
              onClick={handleRetry}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center"
            >
              <FiRefreshCw className="mr-2" /> Retry
            </button>
          </div>
        )}
        
        {/* Filters and Sort */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            >
              <FiFilter size={16} />
              <span>Filter</span>
            </button>
            
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-indigo-deep text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Grid View"
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 ${view === 'list' ? 'bg-indigo-deep text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="List View"
              >
                <FiList size={16} />
              </button>
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="relative inline-block">
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-indigo-deep focus:border-indigo-deep"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <FiChevronDown size={16} />
            </div>
          </div>
        </div>
        
        {/* Filter Panel (Mobile) */}
        {isFilterOpen && (
          <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Filters</h3>
              <button onClick={() => setIsFilterOpen(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Category</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      checked={filters.category === cat}
                      onChange={() => handleFilterChange('category', cat)}
                      className="mr-2 h-4 w-4 text-indigo-deep focus:ring-indigo-deep"
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FiLoader size={30} className="animate-spin text-indigo-deep mb-4" />
              <p>Loading products...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Products Grid/List */}
            {products.length > 0 ? (
              <>
                <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6 mb-8`}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} view={view} />
                  ))}
                </div>
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center py-6">
                    <button
                      onClick={loadMoreProducts}
                      disabled={loadingMore}
                      className={`px-6 py-2 rounded-md ${loadingMore ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-deep text-white hover:bg-blue-800'}`}
                    >
                      {loadingMore ? (
                        <span className="flex items-center">
                          <FiLoader className="animate-spin mr-2" />
                          Loading...
                        </span>
                      ) : (
                        'Load More Products'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-4">No products found in this category.</p>
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-indigo-deep text-white rounded hover:bg-blue-800 flex items-center mx-auto"
                >
                  <FiRefreshCw className="mr-2" /> Refresh Products
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
} 