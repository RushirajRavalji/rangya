import '../styles/globals.css';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import Head from 'next/head';
import Script from 'next/script';
import { onAuthStateChanged } from 'firebase/auth';
import analytics from '../utils/analytics';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Dynamically import components for code splitting
const Layout = dynamic(() => import('../components/layout/Layout'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading...</div>
});

const AdminLayout = dynamic(() => import('../components/layout/AdminLayout'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading admin dashboard...</div>
});

const AccountLayout = dynamic(() => import('../components/layout/AccountLayout'), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading account...</div>
});

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const { pathname } = router;
  
  // Determine which layout to use based on the current path
  const getLayout = () => {
    // Check if the Component has a getLayout property
    if (Component.getLayout) {
      return Component.getLayout(<Component {...pageProps} />);
    }
    
    // Otherwise, use default layouts based on path
    if (pathname.startsWith('/admin')) {
      // Admin pages now handle their own layout
      return <Component {...pageProps} />;
    } else if (pathname.startsWith('/account')) {
      return (
        <AccountLayout>
          <Component {...pageProps} />
        </AccountLayout>
      );
    } else {
      return (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      );
    }
  };

  // Remove console logs in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
    }
  }, []);

  // Initialize Google Analytics
  useEffect(() => {
    analytics.initGA();
  }, []);
  
  // Track page views
  useEffect(() => {
    const handleRouteChange = (url) => {
      analytics.pageView(url);
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

  // Handle error reporting for the error boundary
  const handleError = (error, errorInfo) => {
    // Log to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      analytics.logError(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Head>
        {/* Base meta tags */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* Add Razorpay script for payment processing */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <SessionProvider session={session}>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              {getLayout()}
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default MyApp;