import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiMail, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SEO from '../components/common/SEO';

export default function VerifyEmail() {
  const router = useRouter();
  const { redirect } = router.query;
  const { currentUser, loading: authLoading, sendVerificationEmail } = useAuth();
  const { showNotification } = useNotification();
  
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Redirect to home if already verified
  useEffect(() => {
    if (!authLoading && currentUser?.emailVerified) {
      const redirectPath = redirect || '/';
      router.push(redirectPath);
      showNotification('Your email is already verified', 'success');
    }
  }, [authLoading, currentUser, router, redirect, showNotification]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      const loginPath = `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
      router.push(loginPath);
      showNotification('Please login to verify your email', 'info');
    }
  }, [authLoading, currentUser, router, redirect, showNotification]);
  
  // Handle countdown for resending email
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Handle sending verification email
  const handleSendVerification = async () => {
    if (sending || countdown > 0) return;
    
    try {
      setSending(true);
      await sendVerificationEmail();
      setEmailSent(true);
      setCountdown(60); // 60 seconds cooldown
      showNotification('Verification email sent. Please check your inbox.', 'success');
    } catch (error) {
      console.error('Error sending verification email:', error);
      showNotification('Failed to send verification email. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };
  
  // Handle manual verification check
  const handleCheckVerification = () => {
    if (!currentUser) return;
    
    // Reload the user to check if email is verified
    currentUser.reload().then(() => {
      if (currentUser.emailVerified) {
        const redirectPath = redirect || '/';
        router.push(redirectPath);
        showNotification('Email verified successfully!', 'success');
      } else {
        showNotification('Email not verified yet. Please check your inbox.', 'info');
      }
    }).catch(error => {
      console.error('Error checking verification:', error);
      showNotification('Failed to check verification status', 'error');
    });
  };
  
  // Show loading state
  if (authLoading) {
    return (
      <>
        <SEO 
          title="Verify Email | Rangya"
          description="Verify your email address"
        />
        <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="animate-spin h-12 w-12 mx-auto text-indigo-600" />
            <p className="mt-4 text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Show verification page
  return (
    <>
      <SEO 
        title="Verify Email | Rangya"
        description="Verify your email address"
      />
      <div className="container mx-auto px-4 py-12 min-h-screen">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-6">
            <div className="bg-blue-100 rounded-full p-4 inline-block">
              <FiMail className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold mt-4">Verify Your Email</h1>
            <p className="text-gray-600 mt-2">
              We've sent a verification email to <strong>{currentUser?.email}</strong>
            </p>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Please check your inbox and click the verification link to verify your email address.
                </p>
              </div>
            </div>
          </div>
          
          {emailSent && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiCheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Verification email sent! Please check your inbox and spam folder.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <button
              onClick={handleSendVerification}
              disabled={sending || countdown > 0}
              className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
                sending || countdown > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {sending ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Verification Email'
              )}
            </button>
            
            <button
              onClick={handleCheckVerification}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              I've Verified My Email
            </button>
            
            <div className="text-center mt-6">
              <Link href="/" className="text-indigo-600 hover:text-indigo-800">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 