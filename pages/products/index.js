import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiFilter, FiX, FiChevronDown, FiLoader, FiGrid, FiList, FiRefreshCw } from 'react-icons/fi';
import { searchProducts } from '../../utils/searchService';
import ProductCard from '../../components/products/ProductCard';
import AdvancedSearch from '../../components/products/AdvancedSearch';
import SEO from '../../components/common/SEO';
import { t } from '../../utils/i18n';

export default function Products() {
  const router = useRouter();
  const { 
    q, 
    category, 
    categories, 
    sort, 
    minPrice, 
    maxPrice, 
    sizes,
    onSale,
    inStock
  } = router.query;
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firstDoc, setFirstDoc] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [retryCount, setRetryCount] = useState(0);
  
  // Sort options
  const sortOptions = [
    { label: t('products.sort.newest'), value: 'createdAt-desc' },
    { label: t('products.sort.priceLowHigh'), value: 'price-asc' },
    { label: t('products.sort.priceHighLow'), value: 'price-desc' },
    { label: t('products.sort.nameAZ'), value: 'name_en-asc' },
    { label: t('products.sort.nameZA'), value: 'name_en-desc' }
  ];
  
  // Fetch products based on search parameters
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        
        // Parse query parameters
        const searchQuery = q || '';
        const categoryList = categories ? categories.split(',') : 
                            category ? [category] : [];
        const sizesList = sizes ? sizes.split(',') : [];
        const minPriceValue = minPrice ? parseInt(minPrice) : 0;
        const maxPriceValue = maxPrice ? parseInt(maxPrice) : Number.MAX_SAFE_INTEGER;
        const onSaleValue = onSale === 'true';
        const inStockValue = inStock !== 'false'; // Default to true
        
        // Parse sort parameters
        const [sortBy, sortOrder] = sort ? sort.split('-') : ['createdAt', 'desc'];
        
        const searchOptions = {
          query: searchQuery,
          categories: categoryList,
          minPrice: minPriceValue,
          maxPrice: maxPriceValue,
          sizes: sizesList,
          sortBy,
          sortOrder,
          limit: 24,
          onSale: onSaleValue,
          inStock: inStockValue
        };
        
        console.log('Searching products with options:', searchOptions);
        
        const result = await searchProducts(searchOptions);
        
        if (result && result.products) {
          setProducts(result.products);
          setFirstDoc(result.pagination.firstVisible);
          setLastDoc(result.pagination.lastVisible);
          setHasMore(result.pagination.hasMore);
        } else {
          setProducts([]);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Error searching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, [q, category, categories, sort, minPrice, maxPrice, sizes, onSale, inStock, retryCount]);
  
  // Load more products
  const loadMoreProducts = async () => {
    if (!hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // Parse query parameters
      const searchQuery = q || '';
      const categoryList = categories ? categories.split(',') : 
                          category ? [category] : [];
      const sizesList = sizes ? sizes.split(',') : [];
      const minPriceValue = minPrice ? parseInt(minPrice) : 0;
      const maxPriceValue = maxPrice ? parseInt(maxPrice) : Number.MAX_SAFE_INTEGER;
      const onSaleValue = onSale === 'true';
      const inStockValue = inStock !== 'false'; // Default to true
      
      // Parse sort parameters
      const [sortBy, sortOrder] = sort ? sort.split('-') : ['createdAt', 'desc'];
      
      const searchOptions = {
        query: searchQuery,
        categories: categoryList,
        minPrice: minPriceValue,
        maxPrice: maxPriceValue,
        sizes: sizesList,
        sortBy,
        sortOrder,
        limit: 24,
        lastDoc,
        onSale: onSaleValue,
        inStock: inStockValue
      };
      
      const result = await searchProducts(searchOptions);
      
      if (result && result.products && result.products.length > 0) {
        setProducts(prev => [...prev, ...result.products]);
        setLastDoc(result.pagination.lastVisible);
        setHasMore(result.pagination.hasMore);
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
  
  // Handle search
  const handleSearch = (searchParams) => {
    router.push({
      pathname: '/products',
      query: searchParams
    });
  };
  
  // Handle sort change
  const handleSortChange = (sortValue) => {
    const currentQuery = { ...router.query };
    currentQuery.sort = sortValue;
    
    router.push({
      pathname: '/products',
      query: currentQuery
    });
  };

  // Generate page title and description based on search parameters
  const getPageTitle = () => {
    if (q) {
      return `${q} - Search Results | Rangya`;
    } else if (categories || category) {
      const categoryName = categories || category;
      return `${categoryName} | Rangya`;
    }
    return 'All Products | Rangya';
  };

  const getPageDescription = () => {
    if (q) {
      return `Search results for "${q}" - Browse our collection of premium denim products`;
    } else if (categories || category) {
      const categoryName = categories || category;
      return `Browse our collection of premium ${categoryName.toLowerCase()}`;
    }
    return 'Browse our complete collection of premium denim products';
  };
  
  return (
    <>
      <SEO 
        title={getPageTitle()}
        description={getPageDescription()}
        canonical={`https://ranga-denim.com/products${q ? `?q=${q}` : ''}`}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {q ? `Search Results for "${q}"` : 
             (categories || category) ? categories || category : 
             t('products.allProducts')}
          </h1>
          
          {/* Search Bar */}
          <div className="mt-6">
            <AdvancedSearch 
              initialQuery={q || ''} 
              onSearch={handleSearch} 
              showFilters={true}
            />
          </div>
        </div>
        
        {/* Filters and Sort */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-indigo-deep text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title={t('products.gridView')}
                aria-label={t('products.gridView')}
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 ${view === 'list' ? 'bg-indigo-deep text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title={t('products.listView')}
                aria-label={t('products.listView')}
              >
                <FiList size={16} />
              </button>
            </div>
            
            {/* Results count */}
            <span className="text-gray-600 hidden md:inline">
              {products.length} {products.length === 1 ? t('products.product') : t('products.products')}
            </span>
          </div>
          
          {/* Sort dropdown */}
          <div className="relative inline-block w-full md:w-auto">
            <select
              value={sort || 'createdAt-desc'}
              onChange={(e) => handleSortChange(e.target.value)}
              className="block w-full md:w-auto appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              aria-label={t('products.sortBy')}
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
        
        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FiLoader className="animate-spin text-indigo-deep h-8 w-8" />
            <span className="ml-2">{t('products.loading')}</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">{t('products.noResults')}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-deep hover:bg-blue-800"
            >
              <FiRefreshCw className="mr-2" /> {t('products.retry')}
            </button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-6'}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} view={view} />
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="text-center mt-8">
            <button
              onClick={loadMoreProducts}
              disabled={loadingMore}
              className="px-6 py-2 border border-indigo-deep text-indigo-deep rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loadingMore ? (
                <>
                  <FiLoader className="animate-spin inline mr-2" />
                  {t('products.loading')}
                </>
              ) : (
                t('products.loadMore')
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
} 