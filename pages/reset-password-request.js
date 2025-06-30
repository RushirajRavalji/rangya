import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiMail, FiAlertCircle, FiLoader, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function ResetPasswordRequest() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { showNotification } = useNotification();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await resetPassword(email);
      
      setSuccess(true);
      showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
      console.error('Error requesting password reset:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else {
        setError(error.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Reset Password | Rangya</title>
        <meta name="description" content="Reset your Rangya account password" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <img 
            src="/images/logo/logo.png" 
            alt="Rangya" 
            className="mx-auto h-12 w-auto"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            back to login
          </Link>
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <FiCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Check your email</h3>
              <p className="mt-1 text-sm text-gray-500">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your inbox and spam folder.
              </p>
              <div className="mt-6">
                <Link href="/login" className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
                  <FiArrowLeft className="mr-2" />
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiAlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin h-5 w-5 mr-2" />
                      Sending reset link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 