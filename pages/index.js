import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import Layout from '../components/layout/Layout';
import HeroSection from '../components/home/HeroSection';
import FeaturedCategories from '../components/home/FeaturedCategories';
import Carousel from '../components/home/Carousel';
import Testimonials from '../components/home/Testimonials';
import Newsletter from '../components/home/Newsletter';
import ProductCard from '../components/products/ProductCard';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        setLoading(true);
        setError(null);
        
        // Handle case where Firebase might not be initialized yet
        if (!db) {
          console.log('Firebase not initialized yet, retrying in 1 second...');
          setTimeout(fetchFeaturedProducts, 1000);
          return;
        }
        
        const productsRef = collection(db, 'products');
        const featuredQuery = query(
          productsRef,
          where('isFeatured', '==', true),
          limit(4)
        );
        
        const querySnapshot = await getDocs(featuredQuery);
        
        if (querySnapshot.empty) {
          // If no featured products, get the most recent ones
          const recentQuery = query(
            productsRef,
            limit(4)
          );
          
          const recentSnapshot = await getDocs(recentQuery);
          const recentProducts = recentSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setFeaturedProducts(recentProducts);
        } else {
          const featured = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setFeaturedProducts(featured);
        }
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setError('Failed to load featured products');
        // Set empty array to prevent rendering issues
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFeaturedProducts();
  }, []);

  return (
    <Layout>
      <Head>
        <title>Rangya - Premium Denim Products</title>
        <meta name="description" content="Discover premium quality denim products at Rangya. Shop our collection of jeans, jackets, and accessories." />
      </Head>
      
      <HeroSection />
      
      <FeaturedCategories />
      
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Featured Products</h2>
          
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-deep"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link href="/products" className="inline-block bg-indigo-deep text-white py-2 px-6 rounded-md hover:bg-blue-800 transition-colors duration-200">
              View All Products
            </Link>
          </div>
        </div>
      </section>
      
      <Carousel />
      
      <Testimonials />
      
      <Newsletter />
    </Layout>
  );
}