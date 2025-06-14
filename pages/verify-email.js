import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { auth } from '../utils/firebase';
import { applyActionCode } from 'firebase/auth';

export default function VerifyEmail() {
  const router = useRouter();
  const { oobCode } = router.query; // oobCode is the action code from the verification email link
  
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!oobCode) return;
      
      try {
        setVerifying(true);
        setError('');
        
        // Apply the verification code
        await applyActionCode(auth, oobCode);
        
        setSuccess(true);
        setVerifying(false);
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/login');
        }, 5000);
      } catch (error) {
        console.error('Email verification error:', error);
        
        if (error.code === 'auth/invalid-action-code') {
          setError('Invalid or expired verification link. Please request a new verification email.');
        } else if (error.code === 'auth/user-disabled') {
          setError('User account has been disabled.');
        } else if (error.code === 'auth/user-not-found') {
          setError('User not found.');
        } else {
          setError('Failed to verify email. Please try again.');
        }
        
        setVerifying(false);
      }
    };
    
    if (oobCode) {
      verifyEmail();
    } else {
      setVerifying(false);
      setError('No verification code provided. Please use the link from your email.');
    }
  }, [oobCode, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Verify Email | Ranga</title>
        <meta name="description" content="Verify your email for Ranga" />
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
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-6">
              <FiLoader className="animate-spin text-indigo-deep text-3xl mb-4" />
              <p className="text-gray-700">Verifying your email address...</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <FiCheckCircle className="text-green-600 text-3xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Email verified successfully!</h3>
              <p className="text-gray-600 mb-6">
                Your email has been verified. You can now sign in to your account.
              </p>
              <p className="text-sm text-gray-500">
                You will be redirected to the login page in a few seconds...
              </p>
              <div className="mt-6">
                <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-deep hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep">
                  Go to Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <FiAlertCircle className="text-red-600 text-3xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Failed</h3>
              <p className="text-red-600 mb-6">
                {error}
              </p>
              <div className="mt-6 space-y-4">
                <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-deep hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep">
                  Go to Login
                </Link>
                <Link href="/" className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep">
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 