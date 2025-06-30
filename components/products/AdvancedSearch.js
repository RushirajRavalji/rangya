import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { FiSearch, FiX, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getSearchSuggestions } from '../../utils/searchService';
import { t } from '../../utils/i18n';
import OptimizedImage from '../common/OptimizedImage';
import Button from '../common/Button';

const AdvancedSearch = ({ initialQuery = '', onSearch, className = '', showFilters = false }) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(showFilters);
  const searchRef = useRef(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    categories: [],
    minPrice: '',
    maxPrice: '',
    sizes: [],
    onSale: false,
    inStock: true
  });
  
  // Available filter options
  const availableCategories = ['Jeans', 'Shirts', 'Jackets', 'Accessories'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'];
  
  // Load suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        const results = await getSearchSuggestions(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle search submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    
    const searchParams = {
      q: query.trim(),
      ...filters.categories.length > 0 && { categories: filters.categories.join(',') },
      ...filters.minPrice && { minPrice: filters.minPrice },
      ...filters.maxPrice && { maxPrice: filters.maxPrice },
      ...filters.sizes.length > 0 && { sizes: filters.sizes.join(',') },
      ...filters.onSale && { onSale: 'true' },
      ...filters.inStock && { inStock: 'true' }
    };
    
    if (onSearch) {
      onSearch(searchParams);
    } else {
      // Navigate to search results page
      router.push({
        pathname: '/products',
        query: searchParams
      });
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    
    if (suggestion.type === 'category') {
      router.push({
        pathname: '/products',
        query: { categories: suggestion.value }
      });
    } else if (suggestion.type === 'product') {
      router.push(`/products/${suggestion.slug}`);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      switch (filterType) {
        case 'category':
          return {
            ...prevFilters,
            categories: prevFilters.categories.includes(value)
              ? prevFilters.categories.filter(cat => cat !== value)
              : [...prevFilters.categories, value]
          };
        case 'size':
          return {
            ...prevFilters,
            sizes: prevFilters.sizes.includes(value)
              ? prevFilters.sizes.filter(size => size !== value)
              : [...prevFilters.sizes, value]
          };
        case 'minPrice':
          return { ...prevFilters, minPrice: value };
        case 'maxPrice':
          return { ...prevFilters, maxPrice: value };
        case 'onSale':
          return { ...prevFilters, onSale: value };
        case 'inStock':
          return { ...prevFilters, inStock: value };
        default:
          return prevFilters;
      }
    });
  };
  
  // Toggle filters visibility
  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      categories: [],
      minPrice: '',
      maxPrice: '',
      sizes: [],
      onSale: false,
      inStock: true
    });
  };
  
  return (
    <div className={`${className}`}>
      <div className="relative" ref={searchRef}>
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex">
            <div className="relative flex-grow">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t('search.placeholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>
            
            <button
              type="submit"
              className="bg-indigo-deep text-white px-4 py-2 rounded-r-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Search"
            >
              <FiSearch />
            </button>
            
            {showFilters && (
              <button
                type="button"
                onClick={toggleFilters}
                className={`ml-2 px-4 py-2 border rounded-md flex items-center ${
                  filtersVisible ? 'bg-gray-200 border-gray-400' : 'bg-white border-gray-300'
                }`}
                aria-expanded={filtersVisible}
                aria-controls="search-filters"
              >
                <FiFilter className="mr-1" />
                <span className="hidden sm:inline">{t('search.filters')}</span>
                {filtersVisible ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
              </button>
            )}
          </div>
        </form>
        
        {/* Search suggestions */}
        {showSuggestions && query.trim().length >= 2 && (
          <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg border border-gray-300 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-deep mx-auto"></div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {t('search.noResults')}
              </div>
            ) : (
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={`${suggestion.type}-${suggestion.value}-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                    >
                      {suggestion.type === 'product' && suggestion.image && (
                        <div className="w-10 h-10 mr-3 bg-gray-100 rounded flex-shrink-0">
                          <OptimizedImage
                            src={suggestion.image}
                            alt={suggestion.display}
                            width={40}
                            height={40}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <div className="font-medium">{suggestion.display}</div>
                        {suggestion.type === 'product' && (
                          <div className="text-sm text-gray-500">₹{suggestion.price}</div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400 capitalize">
                        {suggestion.type}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* Advanced filters */}
      {showFilters && filtersVisible && (
        <div id="search-filters" className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">{t('search.advancedFilters')}</h3>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-indigo-deep hover:text-blue-800"
            >
              {t('search.clearFilters')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div>
              <h4 className="font-medium mb-2">{t('search.categories')}</h4>
              <div className="space-y-1">
                {availableCategories.map(category => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => handleFilterChange('category', category)}
                      className="rounded text-indigo-deep focus:ring-indigo-500"
                    />
                    <span className="ml-2">{category}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Price range */}
            <div>
              <h4 className="font-medium mb-2">{t('search.priceRange')}</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-1 border border-gray-300 rounded-md"
                />
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-1 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            {/* Sizes */}
            <div>
              <h4 className="font-medium mb-2">{t('search.sizes')}</h4>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFilterChange('size', size)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      filters.sizes.includes(size)
                        ? 'bg-indigo-deep text-white border-indigo-deep'
                        : 'bg-white border-gray-300 hover:border-indigo-deep'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Additional filters */}
            <div>
              <h4 className="font-medium mb-2">{t('search.additionalFilters')}</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.onSale}
                    onChange={(e) => handleFilterChange('onSale', e.target.checked)}
                    className="rounded text-indigo-deep focus:ring-indigo-500"
                  />
                  <span className="ml-2">{t('search.onSale')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                    className="rounded text-indigo-deep focus:ring-indigo-500"
                  />
                  <span className="ml-2">{t('search.inStock')}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={handleSubmit}
              leftIcon={<FiSearch />}
            >
              {t('search.applyFilters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch; 