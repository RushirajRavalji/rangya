import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit,
  startAfter,
  increment,
  serverTimestamp,
  runTransaction,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { setCacheItem, getCacheItem, deleteCacheItem, cachedFunction } from './cacheUtils';

// Collection references - initialize them when needed, not at module level
const getProductsRef = () => {
  try {
    if (!db) {
      console.error("Firestore database is not initialized");
      throw new Error("Firestore database is not initialized");
    }
    return collection(db, 'products');
  } catch (error) {
    console.error("Error getting products collection reference:", error);
    throw error;
  }
};

/**
 * Helper function to convert Firebase timestamps to ISO strings for JSON compatibility
 * @param {Object} data - Object that may contain Firebase timestamps
 * @returns {Object} - Object with Firebase timestamps converted to ISO strings
 */
const convertTimestamps = (data) => {
  if (!data) return data;
  
  const result = { ...data };
  
  Object.keys(result).forEach(key => {
    const val = result[key];
    
    // Check if it's a Firebase Timestamp
    if (val && typeof val.toDate === 'function') {
      result[key] = val.toDate().toISOString();
    } 
    // Check if it's an object that might contain timestamps
    else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = convertTimestamps(val);
    } 
    // Handle arrays that might contain objects with timestamps
    else if (Array.isArray(val)) {
      result[key] = val.map(item => {
        if (item && typeof item === 'object') {
          return convertTimestamps(item);
        }
        return item;
      });
    }
    // Handle undefined values
    else if (val === undefined) {
      result[key] = null;
    }
  });
  
  return result;
};

/**
 * Get all products with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category
 * @param {number} options.limit - Limit results
 * @param {Object} options.lastDoc - Last document for pagination
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @returns {Promise<{products: Array, lastDoc: Object}>} - Products and last document for pagination
 */
export async function getProducts(options = {}) {
  try {
    console.log("Fetching products with options:", options);
    
    // Check if Firebase is initialized properly
    if (!db) {
      console.error("Firestore database not initialized");
      return { products: [], lastDoc: null };
    }
    
    // Get products collection reference
    let productsRef;
    try {
      productsRef = getProductsRef();
      console.log("Successfully got products collection reference");
    } catch (error) {
      console.error("Failed to get products collection reference:", error);
      return { products: [], lastDoc: null };
    }
    
    // Start building the query
    let q;
    try {
      // Start with a basic query
      q = query(productsRef);
      console.log("Base query created");
      
      // Apply category filter
      if (options.category) {
        // Normalize category mapping for consistent querying
        const categoryMappings = {
          'jeans': 'Jeans',
          'pants': 'Jeans',  // Map pants to Jeans category
          'shirts': 'Shirts',
          'shirt': 'Shirts', // Map shirt to Shirts category
          't-shirts': 'T-shirts',
          'tshirts': 'T-shirts', // Map tshirts to T-shirts category
          't-shirt': 'T-shirts', // Map t-shirt to T-shirts category
          'tshirt': 'T-shirts', // Map tshirt to T-shirts category
          'accessories': 'Accessories'
        };
        
        // Normalize the category name (case-insensitive)
        let formattedCategory;
        if (typeof options.category === 'string') {
          const lowercaseCategory = options.category.toLowerCase();
          formattedCategory = categoryMappings[lowercaseCategory] || options.category;
        } else {
          formattedCategory = options.category;
        }
        
        console.log(`Filtering by category: ${formattedCategory}`);
        q = query(q, where('category', '==', formattedCategory));
      }
      
      // Apply sorting
      const sortField = options.sortBy || 'createdAt';
      const sortDirection = options.sortOrder === 'asc' ? 'asc' : 'desc';
      console.log(`Sorting by ${sortField} in ${sortDirection} order`);
      q = query(q, orderBy(sortField, sortDirection));
      
      // Apply pagination
      if (options.lastDoc) {
        console.log("Applying pagination with lastDoc");
        q = query(q, startAfter(options.lastDoc));
      }
      
      // Apply limit
      if (options.limit) {
        console.log(`Limiting results to ${options.limit}`);
        q = query(q, limit(options.limit));
      }
    } catch (error) {
      console.error("Error building query:", error);
      return { products: [], lastDoc: null };
    }
    
    // Execute the query
    console.log("Executing Firestore query...");
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
      console.log(`Query returned ${querySnapshot.docs.length} products`);
    } catch (error) {
      console.error("Error executing query:", error);
      return { products: [], lastDoc: null };
    }
    
    // Process the results
    const products = [];
    try {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Normalize category if present
        let normalizedCategory = data.category;
        if (data.category) {
          // Ensure proper category naming
          const lcCategory = data.category.toLowerCase();
          if (lcCategory.includes('shirt') && !lcCategory.includes('t-shirt') && !lcCategory.includes('tshirt')) {
            normalizedCategory = 'Shirts';
          } else if (lcCategory.includes('t-shirt') || lcCategory.includes('tshirt')) {
            normalizedCategory = 'T-shirts';
          } else if (lcCategory.includes('jean') || lcCategory.includes('pant')) {
            normalizedCategory = 'Jeans';
          } else if (lcCategory.includes('accessor')) {
            normalizedCategory = 'Accessories';
          }
        }
        
        // Ensure required fields exist
        const product = {
          id: doc.id,
          name_en: data.name_en || "Unnamed Product",
          price: data.price || 0,
          category: normalizedCategory || "Uncategorized",
          images: Array.isArray(data.images) ? data.images : [],
          stock: data.stock || {},
          ...data,
          category: normalizedCategory || data.category || "Uncategorized" // Make sure normalized category gets used
        };
        
        // Convert Firebase timestamps to ISO strings
        const processedProduct = convertTimestamps(product);
        products.push(processedProduct);
      });
      console.log(`Processed ${products.length} products`);
    } catch (error) {
      console.error("Error processing query results:", error);
    }
    
    // Get the last document for pagination (but don't convert it)
    const lastDoc = querySnapshot.docs.length > 0 ? 
      querySnapshot.docs[querySnapshot.docs.length - 1] : 
      null;
    
    return {
      products,
      lastDoc
    };
  } catch (error) {
    console.error('Error getting products:', error);
    // Return empty array instead of throwing to prevent breaking the UI
    return { products: [], lastDoc: null };
  }
}

/**
 * Get a product by ID
 * @param {string} productId - Product ID
 * @param {boolean} bypassCache - Whether to bypass cache
 * @returns {Promise<Object|null>} - Product data or null if not found
 */
export async function getProductById(productId, bypassCache = false) {
  try {
    // Check cache first if not bypassing
    if (!bypassCache) {
      const cacheKey = `product:${productId}`;
      const cachedProduct = getCacheItem(cacheKey);
      if (cachedProduct) {
        return cachedProduct;
      }
    }
    
    if (!db) {
      console.error("Firestore database not initialized");
      return null;
    }
    
    console.log(`Fetching product with ID: ${productId}`);
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const product = {
        id: docSnap.id,
        name_en: data.name_en || "Unnamed Product",
        price: data.price || 0,
        category: data.category || "Uncategorized",
        images: Array.isArray(data.images) ? data.images : [],
        stock: data.stock || {},
        ...data
      };
      
      // Cache the product for 5 minutes
      if (!bypassCache) {
        const cacheKey = `product:${productId}`;
        setCacheItem(cacheKey, product, 300);
      }
      
      return product;
    } else {
      console.log(`No product found with ID: ${productId}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting product by ID:', error);
    throw error;
  }
}

/**
 * Get a product by slug
 * @param {string} slug - Product slug
 * @param {boolean} bypassCache - Whether to bypass cache
 * @returns {Promise<Object|null>} - Product data or null if not found
 */
export async function getProductBySlug(slug, bypassCache = false) {
  try {
    // Check cache first if not bypassing
    if (!bypassCache) {
      const cacheKey = `product:slug:${slug}`;
      const cachedProduct = getCacheItem(cacheKey);
      if (cachedProduct) {
        return cachedProduct;
      }
    }
    
    const productsRef = getProductsRef();
    const q = query(productsRef, where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const product = {
        id: doc.id,
        ...doc.data()
      };
      
      // Cache the product for 5 minutes
      if (!bypassCache) {
        const cacheKey = `product:slug:${slug}`;
        setCacheItem(cacheKey, product, 300);
        
        // Also cache by ID for consistency
        const idCacheKey = `product:${product.id}`;
        setCacheItem(idCacheKey, product, 300);
      }
      
      return product;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting product by slug:', error);
    throw error;
  }
}

/**
 * Get related products for a given product
 * @param {Object} product - Product object
 * @param {number} limit - Maximum number of related products to return
 * @returns {Promise<Array>} - Array of related products
 */
export async function getRelatedProducts(product, limit = 4) {
  try {
    const productsRef = getProductsRef();
    // Query products in the same category
    let q = query(
      productsRef,
      where('category', '==', product.category),
      where('id', '!=', product.id),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    
    const relatedProducts = [];
    querySnapshot.forEach((doc) => {
      relatedProducts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If we don't have enough related products, get more products
    if (relatedProducts.length < limit) {
      const remainingLimit = limit - relatedProducts.length;
      
      // Get products from any category
      const q2 = query(
        productsRef,
        where('id', '!=', product.id),
        limit(remainingLimit)
      );
      
      const querySnapshot2 = await getDocs(q2);
      
      querySnapshot2.forEach((doc) => {
        // Check if this product is already in our related products
        if (!relatedProducts.some(p => p.id === doc.id)) {
          relatedProducts.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });
    }
    
    return relatedProducts;
  } catch (error) {
    console.error('Error getting related products:', error);
    return [];
  }
}

/**
 * Search products by name or description
 * @param {string} searchTerm - Search term
 * @param {number} limit - Limit results
 * @returns {Promise<Array>} - Array of matching products
 */
export async function searchProducts(searchTerm, limit = 10) {
  try {
    // In a real app, you would use a proper search service like Algolia
    // For simplicity, we'll just fetch all products and filter client-side
    const { products } = await getProducts({ limit: 100 });
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const filteredProducts = products.filter(product => 
      product.name_en.toLowerCase().includes(searchTermLower) ||
      product.description_en.toLowerCase().includes(searchTermLower)
    );
    
    return filteredProducts.slice(0, limit);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Convert an image file to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Compress and convert an image file to base64 string
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} - Base64 string
 */
export function compressAndConvertToBase64(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions if needed
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const base64String = canvas.toDataURL('image/jpeg', quality);
        resolve(base64String);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * Upload a product image as base64 string
 * @param {File} file - Image file
 * @param {string} productId - Product ID
 * @returns {Promise<string>} - Base64 string
 */
export async function uploadProductImage(file, productId) {
  try {
    console.log(`Converting image ${file.name} to base64...`);
    // Convert and compress image to base64
    const base64String = await compressAndConvertToBase64(file);
    console.log(`Image converted successfully, length: ${base64String.length}`);
    return base64String;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<string>} - New product ID
 */
export async function createProduct(productData) {
  try {
    const productsRef = getProductsRef();
    // Add timestamp
    const dataWithTimestamp = {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(productsRef, dataWithTimestamp);
    
    // Dispatch a custom event for notification
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('productAdded', { 
        detail: { 
          productId: docRef.id,
          productName: productData.name_en
        } 
      });
      window.dispatchEvent(event);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update a product
 * @param {string} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} - Updated product
 */
export async function updateProduct(productId, productData) {
  try {
    const productRef = doc(db, 'products', productId);
    
    // Update the product
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp()
    });
    
    // Invalidate cache
    deleteCacheItem(`product:${productId}`);
    if (productData.slug) {
      deleteCacheItem(`product:slug:${productData.slug}`);
    }
    
    // Return the updated product
    return getProductById(productId, true); // Bypass cache to get fresh data
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Update product stock
 * @param {string} productId - Product ID
 * @param {Object} stockUpdates - Stock updates by size
 * @returns {Promise<void>}
 */
export async function updateProductStock(productId, stockUpdates) {
  try {
    const productRef = doc(db, 'products', productId);
    
    // Get current product data
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new Error(`Product ${productId} not found`);
    }
    
    const productData = productSnap.data();
    const currentStock = productData.stock || {};
    
    // Create stock update object for Firestore
    const stockUpdateObj = {};
    
    Object.entries(stockUpdates).forEach(([size, change]) => {
      // Calculate new stock value, ensuring it doesn't go below 0
      const currentValue = currentStock[size] || 0;
      const newValue = Math.max(0, currentValue + change);
      
      // Add to update object
      stockUpdateObj[`stock.${size}`] = newValue;
    });
    
    // Update Firestore
    await updateDoc(productRef, stockUpdateObj);
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
}

/**
 * Toggle product in user's wishlist
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>} - True if added, false if removed
 */
export async function toggleWishlistItem(userId, productId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    const wishlist = userData.wishlist || [];
    
    // Check if product is already in wishlist
    const isInWishlist = wishlist.includes(productId);
    
    if (isInWishlist) {
      // Remove from wishlist
      const updatedWishlist = wishlist.filter(id => id !== productId);
      await updateDoc(userRef, { wishlist: updatedWishlist });
      return false;
    } else {
      // Add to wishlist
      const updatedWishlist = [...wishlist, productId];
      await updateDoc(userRef, { wishlist: updatedWishlist });
      return true;
    }
  } catch (error) {
    console.error('Error toggling wishlist item:', error);
    throw error;
  }
}

/**
 * Check if a product is in user's wishlist
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>} - True if in wishlist, false otherwise
 */
export async function isInWishlist(userId, productId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const wishlist = userData.wishlist || [];
    
    return wishlist.includes(productId);
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
}

/**
 * Reserve stock for a product
 * @param {string} productId - Product ID
 * @param {string} size - Size to reserve
 * @param {number} quantity - Quantity to reserve
 * @param {string} sessionId - Unique session ID
 * @returns {Promise<boolean>} - Whether reservation was successful
 */
export const reserveStock = async (productId, size, quantity, sessionId) => {
  try {
    const productRef = doc(db, 'products', productId);
    
    // Use transaction to ensure atomic operation
    return await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      
      if (!productDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }
      
      const productData = productDoc.data();
      
      // Check which field contains stock information
      const hasStockField = productData.stock && productData.stock[size] !== undefined;
      const hasSizesField = productData.sizes && productData.sizes[size] !== undefined;
      
      // Get available quantity
      let availableQuantity = 0;
      let stockFieldToUpdate = '';
      
      if (hasStockField) {
        availableQuantity = productData.stock[size];
        stockFieldToUpdate = 'stock';
      } else if (hasSizesField) {
        availableQuantity = productData.sizes[size];
        stockFieldToUpdate = 'sizes';
      } else {
        throw new Error(`No stock information for ${productData.name || 'product'} (${size})`);
      }
      
      // Check for existing reservations and clean up expired ones (older than 15 minutes)
      const reservations = productData.reservations || {};
      const currentTime = new Date().getTime();
      let reservedQuantity = 0;
      
      Object.entries(reservations).forEach(([resId, res]) => {
        // Skip the current session's reservation
        if (resId.startsWith(sessionId)) return;
        
        // Check if reservation has expired (15 minutes)
        const reservationTime = new Date(res.timestamp).getTime();
        if (currentTime - reservationTime < 15 * 60 * 1000) {
          // Reservation is still valid
          if (res.size === size) {
            reservedQuantity += res.quantity;
          }
        }
      });
      
      // Calculate truly available quantity
      const trueAvailableQuantity = availableQuantity - reservedQuantity;
      
      // Check if enough stock is available
      if (trueAvailableQuantity < quantity) {
        return {
          success: false,
          availableQuantity: trueAvailableQuantity,
          message: `Only ${trueAvailableQuantity} items available for this product/size`
        };
      }
      
      // Create a unique reservation ID
      const reservationId = `${sessionId}_${new Date().getTime()}`;
      
      // Add the reservation
      transaction.update(productRef, {
        [`reservations.${reservationId}`]: {
          size,
          quantity,
          timestamp: new Date().toISOString(),
          expiresAt: new Date(currentTime + 15 * 60 * 1000).toISOString() // 15 minutes expiry
        }
      });
      
      return {
        success: true,
        reservationId,
        expiresAt: new Date(currentTime + 15 * 60 * 1000).toISOString()
      };
    });
  } catch (error) {
    console.error('Error reserving stock:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Release a stock reservation
 * @param {string} productId - Product ID
 * @param {string} reservationId - Reservation ID to release
 * @returns {Promise<boolean>} - Whether release was successful
 */
export const releaseStockReservation = async (productId, reservationId) => {
  try {
    const productRef = doc(db, 'products', productId);
    
    await updateDoc(productRef, {
      [`reservations.${reservationId}`]: deleteField()
    });
    
    return true;
  } catch (error) {
    console.error('Error releasing stock reservation:', error);
    return false;
  }
};

/**
 * Clean up expired reservations for a product
 * @param {string} productId - Product ID
 * @returns {Promise<number>} - Number of expired reservations removed
 */
export const cleanupExpiredReservations = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error(`Product ${productId} not found`);
    }
    
    const productData = productDoc.data();
    const reservations = productData.reservations || {};
    const currentTime = new Date().getTime();
    const updates = {};
    let removedCount = 0;
    
    Object.entries(reservations).forEach(([resId, res]) => {
      // Check if reservation has expired (15 minutes)
      const reservationTime = new Date(res.timestamp).getTime();
      if (currentTime - reservationTime >= 15 * 60 * 1000) {
        // Reservation has expired, mark for deletion
        updates[`reservations.${resId}`] = deleteField();
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      await updateDoc(productRef, updates);
    }
    
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    return 0;
  }
}; 