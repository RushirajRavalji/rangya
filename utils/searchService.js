import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  startAfter,
  endBefore,
  limitToLast,
  startAt,
  endAt,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { setCacheItem, getCacheItem } from './cacheUtils';

/**
 * Advanced search for products
 * @param {Object} options - Search options
 * @param {string} options.query - Search query string
 * @param {string[]} options.categories - Categories to filter by
 * @param {number} options.minPrice - Minimum price
 * @param {number} options.maxPrice - Maximum price
 * @param {string[]} options.sizes - Sizes to filter by
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @param {number} options.limit - Maximum number of products to fetch
 * @param {Object} options.lastDoc - Last document for pagination
 * @param {Object} options.firstDoc - First document for pagination (when going backwards)
 * @param {boolean} options.bypassCache - Whether to bypass cache
 * @returns {Promise<Object>} - Search results and pagination info
 */
export async function searchProducts(options = {}) {
  const {
    query: searchQuery = '',
    categories = [],
    minPrice = 0,
    maxPrice = Number.MAX_SAFE_INTEGER,
    sizes = [],
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit: resultLimit = 12,
    lastDoc = null,
    firstDoc = null,
    bypassCache = false,
    onSale = false,
    inStock = false
  } = options;

  // Generate cache key based on search parameters
  const cacheKey = `search:${searchQuery}:${categories.join(',')}:${minPrice}:${maxPrice}:${sizes.join(',')}:${sortBy}:${sortOrder}:${resultLimit}:${onSale}:${inStock}`;
  
  // Check cache first if not bypassing
  if (!bypassCache && !lastDoc && !firstDoc) {
    const cachedResults = getCacheItem(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }
  }
  
  try {
    const productsRef = collection(db, 'products');
    let constraints = [];
    
    // Add search query filter (search in name_en, name, description_en, description)
    if (searchQuery && searchQuery.trim() !== '') {
      // Firebase doesn't support full-text search, so we'll use a simple contains check
      // This is not ideal for production, but works for basic search
      // For production, consider using Algolia, Elasticsearch, or Firebase Extensions for search
      const normalizedQuery = searchQuery.trim().toLowerCase();
      
      // We'll need to do client-side filtering for the search query
      // But we'll add other constraints to the Firestore query
    }
    
    // Add category filter
    if (categories.length > 0) {
      constraints.push(where('category', 'in', categories));
    }
    
    // Add price filter
    if (minPrice > 0) {
      constraints.push(where('price', '>=', minPrice));
    }
    if (maxPrice < Number.MAX_SAFE_INTEGER) {
      constraints.push(where('price', '<=', maxPrice));
    }
    
    // Add sale filter
    if (onSale) {
      constraints.push(where('salePrice', '>', 0));
    }
    
    // Add sorting
    constraints.push(orderBy(sortBy, sortOrder));
    
    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    } else if (firstDoc) {
      constraints.push(endBefore(firstDoc));
      constraints.push(limitToLast(resultLimit));
    } else {
      constraints.push(limit(resultLimit));
    }
    
    // Execute query
    const q = query(productsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    // Process results
    let products = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data
      });
    });
    
    // Client-side filtering for search query and sizes
    // Only apply if we have a search query or sizes filter
    if ((searchQuery && searchQuery.trim() !== '') || sizes.length > 0 || inStock) {
      products = products.filter(product => {
        let matchesSearch = true;
        let matchesSizes = true;
        let matchesStock = true;
        
        // Apply search query filter
        if (searchQuery && searchQuery.trim() !== '') {
          const normalizedQuery = searchQuery.trim().toLowerCase();
          const searchableFields = [
            product.name_en?.toLowerCase() || '',
            product.name?.toLowerCase() || '',
            product.description_en?.toLowerCase() || '',
            product.description?.toLowerCase() || '',
            product.category?.toLowerCase() || '',
            ...(product.tags?.map(tag => tag.toLowerCase()) || [])
          ];
          
          matchesSearch = searchableFields.some(field => field.includes(normalizedQuery));
        }
        
        // Apply sizes filter
        if (sizes.length > 0) {
          matchesSizes = sizes.some(size => product.stock && product.stock[size] > 0);
        }
        
        // Apply in-stock filter
        if (inStock) {
          matchesStock = product.stock && Object.values(product.stock).some(qty => qty > 0);
        }
        
        return matchesSearch && matchesSizes && matchesStock;
      });
    }
    
    // Get first and last documents for pagination
    const firstVisible = querySnapshot.docs[0] || null;
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    const results = {
      products,
      pagination: {
        hasMore: products.length === resultLimit,
        firstVisible,
        lastVisible
      }
    };
    
    // Cache results for 5 minutes (only cache first page)
    if (!lastDoc && !firstDoc) {
      setCacheItem(cacheKey, results, 300);
    }
    
    return results;
  } catch (error) {
    console.error('Error searching products:', error);
    return { products: [], pagination: { hasMore: false } };
  }
}

/**
 * Get search suggestions based on a query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Promise<Array>} - Array of search suggestions
 */
export async function getSearchSuggestions(query, limit = 5) {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `suggestions:${normalizedQuery}:${limit}`;
  
  // Check cache first
  const cachedSuggestions = getCacheItem(cacheKey);
  if (cachedSuggestions) {
    return cachedSuggestions;
  }
  
  try {
    // Get top categories
    const categoriesRef = collection(db, 'categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    const categories = [];
    categoriesSnapshot.forEach(doc => {
      const name = doc.data().name;
      if (name.toLowerCase().includes(normalizedQuery)) {
        categories.push({
          type: 'category',
          value: name,
          display: name
        });
      }
    });
    
    // Get matching products
    const { products } = await searchProducts({
      query: normalizedQuery,
      limit: 10,
      bypassCache: false
    });
    
    const productSuggestions = products.map(product => ({
      type: 'product',
      value: product.id,
      display: product.name_en || product.name,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      price: product.salePrice || product.price,
      slug: product.slug
    }));
    
    // Combine and limit results
    const suggestions = [...categories, ...productSuggestions].slice(0, limit);
    
    // Cache suggestions for 5 minutes
    setCacheItem(cacheKey, suggestions, 300);
    
    return suggestions;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

export default {
  searchProducts,
  getSearchSuggestions
}; 