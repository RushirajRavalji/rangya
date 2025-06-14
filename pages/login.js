import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiAlertCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const router = useRouter();
  const { redirect } = router.query;
  const { currentUser, signInWithGoogle, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    // If user is already logged in, redirect
    if (currentUser) {
      console.log("User already logged in, redirecting...");
      router.push(redirect || '/');
    }
  }, [currentUser, redirect, router]);

  // Check browser compatibility
  useEffect(() => {
    const checkBrowserCompatibility = () => {
      const info = {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        thirdPartyCookiesBlocked: false,
        popupsBlocked: false
      };
      
      // Check for popup blockers (basic check)
      try {
        const popup = window.open('about:blank', '_blank', 'width=1,height=1');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          info.popupsBlocked = true;
        } else {
          popup.close();
        }
      } catch (e) {
        info.popupsBlocked = true;
      }
      
      setDebugInfo(info);
      
      if (info.popupsBlocked) {
        setError('Popup windows may be blocked by your browser. Please allow popups for this site to sign in.');
      }
    };
    
    checkBrowserCompatibility();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      
      console.log('Attempting to log in with Google');
      await signInWithGoogle();
      
      console.log('Google login successful, redirecting...');
      // Redirect after successful login
      router.push(redirect || '/');
    } catch (err) {
      console.error('Google login error:', err);
      
      // Only set local error if auth context didn't already set one
      if (!authError) {
        if (err.message && err.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.');
        } else if (debugInfo && debugInfo.popupsBlocked) {
          setError('Sign-in popup was blocked. Please allow popups for this site and try again.');
        } else {
          setError('Failed to sign in. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Login | Ranga</title>
        <meta name="description" content="Login to your Ranga account" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <img 
            src="/logo.png" 
            alt="Ranga" 
            className="mx-auto h-12 w-auto"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/register" className="font-medium text-indigo-deep hover:text-blue-800">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {(error || authError) && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between">
              <div className="flex items-center">
                <FiAlertCircle className="text-red-500 mr-3" />
                <p className="text-sm text-red-500">{error || authError}</p>
              </div>
              <button 
                onClick={() => handleGoogleLogin()} 
                className="ml-2 text-sm text-red-500 hover:text-red-700 flex items-center"
                disabled={loading}
              >
                <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            </div>
          )}
          
          {/* Google Sign In Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep disabled:opacity-70 relative"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Signing in with Google...
                </>
              ) : (
                <>
                  <FcGoogle className="mr-2 text-xl" />
                  Sign in with Google
                </>
              )}
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              Make sure popups are not blocked by your browser
            </p>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>We only support Google Sign-In for enhanced security and convenience.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 