import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiShoppingBag, FiLoader } from 'react-icons/fi';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../utils/firebase';
import ProductCard from '../components/products/ProductCard';
import { useNotification } from '../contexts/NotificationContext';

export default function SalePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  
  useEffect(() => {
    async function fetchSaleProducts() {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const productsRef = collection(db, 'products');
        
        // Get all products
        const querySnapshot = await getDocs(productsRef);
        const saleProducts = [];
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          // Check if product has a sale price that's less than the regular price
          if (productData.salePrice && 
              productData.price && 
              parseFloat(productData.salePrice) < parseFloat(productData.price)) {
            
            // Calculate discount percentage
            const discount = ((parseFloat(productData.price) - parseFloat(productData.salePrice)) / parseFloat(productData.price)) * 100;
            
            // Only include products with 50% or more discount
            if (discount >= 50) {
              saleProducts.push({
                id: doc.id,
                ...productData,
                discountPercentage: Math.round(discount)
              });
            }
          }
        });
        
        // Sort by discount percentage (highest first)
        saleProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);
        
        console.log(`Found ${saleProducts.length} products on sale with 50%+ discount`);
        setProducts(saleProducts);
      } catch (error) {
        console.error('Error fetching sale products:', error);
        showNotification('Failed to load sale products', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSaleProducts();
  }, [showNotification]);
  
  return (
    <>
      <Head>
        <title>Special Offers | Ranga</title>
        <meta name="description" content="Shop our special sale items with 50% or more discount" />
      </Head>
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Special Offers</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our exclusive collection of premium denim products at unbeatable prices. 
            All items on this page have a minimum of 50% discount!
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FiLoader className="animate-spin h-8 w-8 text-indigo-deep" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex justify-center items-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <FiShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Sale Items Available</h2>
            <p className="text-gray-600 mb-6">
              There are currently no items with 50% or more discount.
              Check back later for new offers!
            </p>
            <Link href="/products" className="bg-indigo-deep text-white px-6 py-3 rounded-md hover:bg-blue-800">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </>
  );
} 