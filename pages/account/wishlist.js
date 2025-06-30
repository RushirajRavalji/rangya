import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FiHeart, FiTrash2, FiLoader, FiShoppingCart, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../utils/firebase';
import { doc, getDoc, setDoc, arrayRemove, updateDoc } from 'firebase/firestore';
import { getProductById } from '../../utils/productService';
import OptimizedImage from '../../components/common/OptimizedImage';

export default function Wishlist() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login?redirect=/account/wishlist');
      return;
    }

    // Fetch wishlist items
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user's wishlist document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().wishlist) {
          const wishlistProductIds = userDoc.data().wishlist;
          
          if (wishlistProductIds.length === 0) {
            setWishlistItems([]);
            setLoading(false);
            return;
          }
          
          // Fetch details for each product in wishlist
          const productPromises = wishlistProductIds.map(async (productId) => {
            try {
              const product = await getProductById(productId);
              return product;
            } catch (err) {
              console.error(`Error fetching product ${productId}:`, err);
              return null;
            }
          });
          
          const products = await Promise.all(productPromises);
          const validProducts = products.filter(product => product !== null);
          setWishlistItems(validProducts);
          
          // If some products couldn't be found, update the wishlist to remove them
          if (validProducts.length !== wishlistProductIds.length) {
            const validProductIds = validProducts.map(product => product.id);
            await updateDoc(userDocRef, {
              wishlist: validProductIds
            });
          }
        } else {
          // Create wishlist if it doesn't exist
          await setDoc(userDocRef, { wishlist: [] }, { merge: true });
          setWishlistItems([]);
        }
      } catch (err) {
        console.error('Error fetching wishlist:', err);
        setError('Failed to load your wishlist');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [currentUser, router]);

  const removeFromWishlist = async (productId) => {
    try {
      if (!currentUser) return;
      
      // Update Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        wishlist: arrayRemove(productId)
      });
      
      // Update local state
      setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError('Failed to remove item from wishlist');
    }
  };

  const addToCart = (product) => {
    try {
      // Get current cart from localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      
      // Check if product already in cart
      const existingItem = cart.find(item => item.id === product.id);
      
      // Get product name (handle both name and name_en fields)
      const productName = product.name || product.name_en || 'Product';
      
      if (existingItem) {
        // Increment quantity if already in cart
        existingItem.quantity += 1;
      } else {
        // Add new item to cart
        cart.push({
          id: product.id,
          name: productName,
          price: product.salePrice || product.price,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          quantity: 1,
          // Default to first available size or null if no sizes
          size: product.stock ? Object.keys(product.stock).find(size => product.stock[size] > 0) || null : null
        });
      }
      
      // Save updated cart to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Trigger storage event for other components to update
      window.dispatchEvent(new Event('storage'));
      
      alert(`${productName} added to cart`);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>My Wishlist | Rangya</title>
          <meta name="description" content="View and manage your wishlist items" />
        </Head>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-indigo-deep h-8 w-8 mb-4" />
            <p>Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>My Wishlist | Rangya</title>
        <meta name="description" content="View and manage your wishlist items" />
      </Head>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <p className="text-gray-600">Manage your saved items</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center">
          <FiAlertCircle className="text-red-500 mr-3" />
          <p>{error}</p>
        </div>
      )}

      {wishlistItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 text-gray-500 mb-4">
            <FiHeart size={24} />
          </div>
          <h2 className="text-lg font-medium mb-2">Your Wishlist is Empty</h2>
          <p className="text-gray-600 mb-6">Save your favorite items to come back to them later.</p>
          <Link 
            href="/products" 
            className="bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wishlistItems.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden mr-4">
                          {product.images && product.images.length > 0 ? (
                            <OptimizedImage
                              src={product.images[0]}
                              alt={product.name_en}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                              No image
                            </div>
                          )}
                        </div>
                        <div>
                          <Link href={`/products/${product.slug}`} className="text-sm font-medium text-gray-900 hover:text-indigo-deep">
                            {product.name || product.name_en || 'Product'}
                          </Link>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.salePrice ? (
                        <div>
                          <span className="text-red-600 font-medium">₹{product.salePrice}</span>
                          <span className="text-gray-500 line-through ml-2">₹{product.price}</span>
                        </div>
                      ) : (
                        <span className="font-medium">₹{product.price}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock && Object.values(product.stock).some(qty => qty > 0) ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          In Stock
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => addToCart(product)}
                          disabled={!product.stock || !Object.values(product.stock).some(qty => qty > 0)}
                          className={`text-indigo-deep hover:text-blue-800 ${(!product.stock || !Object.values(product.stock).some(qty => qty > 0)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={product.stock && Object.values(product.stock).some(qty => qty > 0) ? "Add to Cart" : "Out of Stock"}
                        >
                          <FiShoppingCart size={18} />
                        </button>
                        <button 
                          onClick={() => removeFromWishlist(product.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove from Wishlist"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}