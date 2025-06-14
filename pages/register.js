import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiAlertCircle, FiLoader } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const router = useRouter();
  const { currentUser, signInWithGoogle, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If user is already logged in, redirect
    if (currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLoading(true);
      
      await signInWithGoogle();
      router.push('/');
    } catch (err) {
      console.error("Google sign-up error:", err);
      
      // Only set local error if auth context didn't already set one
      if (!authError) {
        setError('Failed to sign up. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Register | Ranga</title>
        <meta name="description" content="Create a new Ranga account" />
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
          Create a new account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/login" className="font-medium text-indigo-deep hover:text-blue-800">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {(error || authError) && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
              <FiAlertCircle className="text-red-500 mr-3" />
              <p className="text-sm text-red-500">{error || authError}</p>
            </div>
          )}
          
          <div className="mb-6">
            <p className="text-center text-gray-700 mb-4">
              We use Google Sign-In for enhanced security and convenience.
            </p>
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep disabled:opacity-70"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Signing up with Google...
                </>
              ) : (
                <>
                  <FcGoogle className="mr-2 text-xl" />
                  Continue with Google
                </>
              )}
            </button>
            <p className="mt-4 text-sm text-gray-600 text-center">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-indigo-deep hover:text-blue-800">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-indigo-deep hover:text-blue-800">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 