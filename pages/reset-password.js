import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiLock, FiAlertCircle, FiLoader, FiCheck } from 'react-icons/fi';
import { auth } from '../utils/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

export default function ResetPassword() {
  const router = useRouter();
  const { oobCode } = router.query; // oobCode is the action code from the reset password email link
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Verify the action code when the component loads
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) return;
      
      try {
        setVerifying(true);
        // Verify the password reset code
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
        setVerifying(false);
      } catch (error) {
        console.error('Error verifying reset code:', error);
        setError('Invalid or expired password reset link. Please request a new one.');
        setVerifying(false);
      }
    };
    
    if (oobCode) {
      verifyCode();
    } else {
      setVerifying(false);
      setError('No reset code provided. Please use the link from your email.');
    }
  }, [oobCode]);

  // Check password strength as user types
  useEffect(() => {
    if (password) {
      setPasswordStrength({
        length: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      });
    } else {
      setPasswordStrength({
        length: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false
      });
    }
  }, [password]);
  
  // Calculate overall password strength
  const getPasswordStrengthLevel = () => {
    const { length, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar } = passwordStrength;
    const criteria = [length, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar];
    const metCriteria = criteria.filter(Boolean).length;
    
    if (metCriteria === 0) return 'none';
    if (metCriteria <= 2) return 'weak';
    if (metCriteria <= 4) return 'medium';
    return 'strong';
  };
  
  // Get color for password strength indicator
  const getPasswordStrengthColor = () => {
    const level = getPasswordStrengthLevel();
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  const validateForm = () => {
    setError('');
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    // Enhanced password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must contain at least one special character');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Confirm password reset
      await confirmPasswordReset(auth, oobCode, password);
      
      setSuccessMessage('Your password has been reset successfully!');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      
      if (error.code === 'auth/expired-action-code') {
        setError('This password reset link has expired. Please request a new one.');
      } else if (error.code === 'auth/invalid-action-code') {
        setError('Invalid reset link. Please request a new password reset.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Reset Password | Ranga</title>
        <meta name="description" content="Reset your Ranga account password" />
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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/login" className="font-medium text-indigo-deep hover:text-blue-800">
            back to login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {verifying ? (
            <div className="flex justify-center items-center py-6">
              <FiLoader className="animate-spin text-indigo-deep text-2xl" />
              <span className="ml-2">Verifying reset link...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
                  <FiAlertCircle className="text-red-500 mr-3" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                  <FiCheck className="text-green-500 mr-3" />
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              )}
              
              {!successMessage && email && (
                <>
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-sm text-blue-700">
                      Setting new password for <span className="font-medium">{email}</span>
                    </p>
                  </div>
                  
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-deep focus:border-indigo-deep sm:text-sm"
                        />
                      </div>
                      
                      {/* Password strength indicator */}
                      <div className="mt-2">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                            style={{ 
                              width: password ? 
                                `${Math.min(100, Object.values(passwordStrength).filter(Boolean).length * 20)}%` : 
                                '0%' 
                            }}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Password strength: {getPasswordStrengthLevel() !== 'none' ? getPasswordStrengthLevel() : 'not set'}
                        </p>
                      </div>
                      
                      {/* Password requirements */}
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Password must contain:</p>
                        <ul className="text-xs space-y-1">
                          <li className="flex items-center">
                            {passwordStrength.length ? 
                              <FiCheck className="text-green-500 mr-1" /> : 
                              <FiAlertCircle className="text-gray-400 mr-1" />
                            }
                            <span className={passwordStrength.length ? "text-green-600" : "text-gray-500"}>
                              At least 8 characters
                            </span>
                          </li>
                          <li className="flex items-center">
                            {passwordStrength.hasUpperCase ? 
                              <FiCheck className="text-green-500 mr-1" /> : 
                              <FiAlertCircle className="text-gray-400 mr-1" />
                            }
                            <span className={passwordStrength.hasUpperCase ? "text-green-600" : "text-gray-500"}>
                              One uppercase letter
                            </span>
                          </li>
                          <li className="flex items-center">
                            {passwordStrength.hasLowerCase ? 
                              <FiCheck className="text-green-500 mr-1" /> : 
                              <FiAlertCircle className="text-gray-400 mr-1" />
                            }
                            <span className={passwordStrength.hasLowerCase ? "text-green-600" : "text-gray-500"}>
                              One lowercase letter
                            </span>
                          </li>
                          <li className="flex items-center">
                            {passwordStrength.hasNumber ? 
                              <FiCheck className="text-green-500 mr-1" /> : 
                              <FiAlertCircle className="text-gray-400 mr-1" />
                            }
                            <span className={passwordStrength.hasNumber ? "text-green-600" : "text-gray-500"}>
                              One number
                            </span>
                          </li>
                          <li className="flex items-center">
                            {passwordStrength.hasSpecialChar ? 
                              <FiCheck className="text-green-500 mr-1" /> : 
                              <FiAlertCircle className="text-gray-400 mr-1" />
                            }
                            <span className={passwordStrength.hasSpecialChar ? "text-green-600" : "text-gray-500"}>
                              One special character
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="text-gray-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-deep focus:border-indigo-deep sm:text-sm"
                        />
                      </div>
                      {password && confirmPassword && (
                        <p className={`mt-1 text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-500'} flex items-center`}>
                          {password === confirmPassword ? 
                            <><FiCheck className="mr-1" /> Passwords match</> : 
                            <><FiAlertCircle className="mr-1" /> Passwords don't match</>
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-deep hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-deep disabled:opacity-70"
                      >
                        {loading ? (
                          <>
                            <FiLoader className="animate-spin mr-2" />
                            Resetting password...
                          </>
                        ) : (
                          'Reset Password'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}