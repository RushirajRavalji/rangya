import '../styles/globals.css';
import Layout from '../components/layout/Layout';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { onAuthStateChanged } from 'firebase/auth';
import { SessionProvider } from 'next-auth/react';
import analytics from '../utils/analytics';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      import('../utils/firebase').then(({ auth }) => {
        if (auth) {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            // User is logged in
            if (user) {
              // Nothing to do here, AuthContext will handle the user
            } 
            // User is not logged in
            else {
              // Nothing to do here, AuthContext will handle the user
            }
          });
          
          return () => unsubscribe && typeof unsubscribe === 'function' && unsubscribe();
        }
      }).catch(err => {
        console.error("Error importing firebase:", err);
      });
    }
  }, [isClient]);

  useEffect(() => {
    // Initialize Firebase services
    const initializeApp = async () => {
      try {
        // Import firebase utils dynamically to ensure it only runs on client
        const firebase = await import('../utils/firebase');
        
        // Verify Firebase configuration
        if (firebase.app) {
          console.log('Firebase app initialized successfully in _app.js');
          
          // Test Firebase auth initialization
          const authTest = firebase.checkFirebaseAuth();
          console.log('Firebase auth test:', authTest.isInitialized ? 'Success' : 'Failed');
          
          if (!authTest.isInitialized) {
            console.error('Firebase auth not properly initialized:', authTest.error);
          }
          
          setFirebaseReady(true);
        } else {
          console.error('Firebase app not initialized properly');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setLoading(false);
      }
    };
    
    initializeApp();
    
    // Add route change event listeners for debugging
    const handleRouteChangeStart = (url) => {
      console.log(`Route change starting: ${url}`);
    };
    
    const handleRouteChangeComplete = (url) => {
      console.log(`Route change complete: ${url}`);
    };
    
    const handleRouteChangeError = (err, url) => {
      console.error(`Route change error: ${url}`, err);
    };
    
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);

  // Initialize Google Analytics
  useEffect(() => {
    analytics.initGA();
  }, []);
  
  // Track page views
  useEffect(() => {
    const handleRouteChange = (url) => {
      analytics.pageview(url);
    };
    
    // Track initial page load
    handleRouteChange(router.asPath);
    
    // Track route changes
    router.events.on('routeChangeComplete', handleRouteChange);
    
    // Cleanup
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.asPath, router.events]);

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading application...</p>
      </div>
    );
  }
  
  // Show loading state while Firebase initializes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Initializing services...</p>
        </div>
      </div>
    );
  }

  // Check if the current page should use the layout
  const useLayout = !router.pathname.includes('/admin');

  // Get page-specific layout or use default
  const getLayout = Component.getLayout || ((page) => (
    <Layout>{page}</Layout>
  ));

  // Render the application with all providers
  // Important: AuthProvider must come before NotificationProvider since NotificationProvider depends on it
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            {useLayout ? (
              getLayout(<Component {...pageProps} isClient={isClient} />)
            ) : (
              <Component {...pageProps} />
            )}
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

export default MyApp;