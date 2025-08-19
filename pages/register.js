import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import PasswordStrengthMeter from '../components/auth/PasswordStrengthMeter';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SEO from '../components/common/SEO';

export default function Register() {
  const router = useRouter();
  const { redirect } = router.query;
  const { registerWithEmail, currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation state
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordStrengthValid, setPasswordStrengthValid] = useState(false);
  
  // Password requirements
  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', label: 'At least one uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', label: 'At least one lowercase letter', regex: /[a-z]/ },
    { id: 'number', label: 'At least one number', regex: /[0-9]/ },
    { id: 'special', label: 'At least one special character', regex: /[^A-Za-z0-9]/ }
  ];
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      router.push(redirect || '/');
    }
  }, [currentUser, router, redirect]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }));
    }
    
    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };
  
  // Handle field blur for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field
    validateField(name, value);
  };
  
  // Validate a specific field
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'displayName':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        } else {
          // Check password strength
          let score = 0;
          passwordRequirements.forEach(req => {
            if (req.regex.test(value)) {
              score++;
            }
          });
          
          // Require at least moderate strength
          if (score < 3) {
            error = 'Password is too weak';
          }
          
          setPasswordScore(score);
          setPasswordStrengthValid(score >= 3);
        }
        
        // Check if confirm password needs to be revalidated
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          setErrors(prev => ({ 
            ...prev, 
            confirmPassword: 'Passwords do not match'
          }));
        } else if (formData.confirmPassword) {
          setErrors(prev => ({ 
            ...prev, 
            confirmPassword: ''
          }));
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
        
      default:
        break;
    }
    
    // Update errors state
    setErrors(prev => ({ ...prev, [name]: error }));
    
    return !error;
  };
  
  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Validate each field
    Object.entries(formData).forEach(([name, value]) => {
      const fieldIsValid = validateField(name, value);
      
      // If any field is invalid, the form is invalid
      if (!fieldIsValid) {
        isValid = false;
      }
    });
    
    // Mark all fields as touched
    setTouched({
      displayName: true,
      email: true,
      password: true,
      confirmPassword: true
    });
    
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Register user
      await registerWithEmail(
        formData.email,
        formData.password,
        formData.displayName
      );
      
      // Show success notification
      showNotification('Account created successfully', 'success');
      
      // Redirect to specified URL or home page
      router.push(redirect || '/');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Registration failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Check if a password requirement is met
  const checkPasswordRequirement = (requirement) => {
    return requirement.regex.test(formData.password);
  };
  
  // Handle password strength change
  const handlePasswordStrengthChange = (score) => {
    setPasswordScore(score);
    setPasswordStrengthValid(score >= 3);
    
    // Update password validation error
    if (score < 3 && touched.password) {
      setErrors(prev => ({ ...prev, password: 'Password is too weak' }));
    } else if (touched.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };
  
  return (
    <>
      <SEO 
        title="Register | Rangya" 
        description="Create a new account on Rangya to start shopping premium denim clothing."
        noindex={true}
      />
      
      <Head>
        <title>Create an Account | Rangya</title>
        <meta name="description" content="Join Rangya to access exclusive products and track your orders." />
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">Create an Account</h1>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign in
              </Link>
            </p>
          </div>
          
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
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    touched.displayName && errors.displayName 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  placeholder="John Doe"
                  aria-invalid={Boolean(touched.displayName && errors.displayName)}
                  aria-describedby={errors.displayName ? "displayName-error" : undefined}
                />
                {touched.displayName && errors.displayName && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiAlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {touched.displayName && errors.displayName && (
                <p className="mt-2 text-sm text-red-600" id="displayName-error">
                  {errors.displayName}
                </p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    touched.email && errors.email 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(touched.email && errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {touched.email && errors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiAlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {touched.email && errors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>
            
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`appearance-none block w-full pl-10 pr-10 py-2 border ${
                    touched.password && errors.password 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  placeholder="••••••••"
                  aria-invalid={Boolean(touched.password && errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">
                  {errors.password}
                </p>
              )}
              
              {/* Password strength meter */}
              {formData.password && (
                <PasswordStrengthMeter password={formData.password} onStrengthChange={handlePasswordStrengthChange} />
              )}
              
              {/* Password requirements */}
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500">Your password must include:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map(req => (
                    <li 
                      key={req.id} 
                      className="text-xs flex items-center"
                    >
                      {checkPasswordRequirement(req) ? (
                        <FiCheckCircle className="h-3.5 w-3.5 text-green-500 mr-2" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-gray-300 mr-2"></span>
                      )}
                      <span className={checkPasswordRequirement(req) ? 'text-green-700' : 'text-gray-600'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`appearance-none block w-full pl-10 pr-10 py-2 border ${
                    touched.confirmPassword && errors.confirmPassword 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  placeholder="••••••••"
                  aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600" id="confirmPassword-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
                disabled={loading}
                loadingText="Creating account..."
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}