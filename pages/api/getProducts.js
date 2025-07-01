import { getProducts } from '../../utils/productService';
import { rateLimit } from '../../utils/rateLimit';

// Create a rate limiter that allows 30 requests per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per interval
  limit: 30, // 30 requests per interval per IP
});

// Map for normalizing category names
const categoryMappings = {
  'jeans': 'Jeans',
  'pants': 'Jeans',
  'jean': 'Jeans',
  'pant': 'Jeans',
  'shirts': 'Shirts',
  'shirt': 'Shirts',
  't-shirts': 'T-shirts',
  'tshirts': 'T-shirts',
  't-shirt': 'T-shirts',
  'tshirt': 'T-shirts',
  'accessories': 'Accessories',
  'accessory': 'Accessories'
};

// Helper function to normalize category names
const normalizeCategory = (category) => {
  if (!category) return null;
  
  const lowercaseCategory = category.toLowerCase();
  
  // Check for direct mapping first
  if (categoryMappings[lowercaseCategory]) {
    return categoryMappings[lowercaseCategory];
  }
  
  // If no direct mapping, check for partial matches
  if (lowercaseCategory.includes('shirt') && !lowercaseCategory.includes('t-shirt') && !lowercaseCategory.includes('tshirt')) {
    return 'Shirts';
  } else if (lowercaseCategory.includes('t-shirt') || lowercaseCategory.includes('tshirt')) {
    return 'T-shirts';
  } else if (lowercaseCategory.includes('jean') || lowercaseCategory.includes('pant')) {
    return 'Jeans';
  } else if (lowercaseCategory.includes('accessor')) {
    return 'Accessories';
  }
  
  return category; // Return original if no match
};

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log("API: getProducts endpoint called");
    
    // Apply rate limiting - but don't block if it fails
    try {
      await limiter.check(res, 10, 'CACHE_TOKEN'); // 10 requests per minute per IP
    } catch (rateLimitError) {
      console.warn('Rate limit warning:', rateLimitError.message);
      // Continue processing the request even if rate limiting fails
    }
    
    // Get query parameters with defaults
    const { 
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category = null
    } = req.query;
    
    console.log("API: Query parameters:", { limit, page, sortBy, sortOrder, category });
    
    // Validate parameters
    const validatedLimit = Math.min(parseInt(limit) || 20, 50); // Max 50 items per request
    const validatedPage = Math.max(parseInt(page) || 1, 1);
    const validSortFields = ['createdAt', 'price', 'name_en', 'popularity'];
    const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validatedSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    // Normalize category name if provided
    const normalizedCategory = normalizeCategory(category);
    
    console.log("API: Validated parameters:", { 
      validatedLimit, 
      validatedPage, 
      validatedSortBy, 
      validatedSortOrder,
      normalizedCategory 
    });
    
    // Fetch products from Firestore with validated parameters
    const result = await getProducts({ 
      limit: validatedLimit, 
      sortBy: validatedSortBy, 
      sortOrder: validatedSortOrder,
      category: normalizedCategory
    });
    
    console.log(`API: Retrieved ${result.products?.length || 0} products`);
    
    // Check if we got products back
    if (!result || !result.products) {
      console.error("API: No products returned from service");
      return res.status(500).json({ 
        error: 'Failed to load products',
        message: 'Product service returned no data'
      });
    }
    
    // Set cache control headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    
    // Return the products with pagination info
    return res.status(200).json({
      products: result.products,
      pagination: {
        total: result.total || result.products.length,
        page: validatedPage,
        limit: validatedLimit,
        totalPages: Math.ceil((result.total || result.products.length) / validatedLimit)
      }
    });
  } catch (error) {
    console.error('API: Error fetching products:', error);
    
    // Don't expose internal error details in production
    return res.status(500).json({ 
      error: 'Failed to load products',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}