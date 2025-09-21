import { createContext, useContext, useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserPopupRedirectResolver,  // This import might be incorrect
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import Cookies from 'js-cookie';

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Check if Firebase is properly initialized
  useEffect(() => {
    if (!auth || !auth.app) {
      console.error("Firebase Auth is not initialized");
      setError("Authentication service is not available. Please try again later.");
      setLoading(false);
    } else {
      setAuthInitialized(true);
    }
  }, []);

  // Email/Password Registration
  async function registerWithEmail(email, password, displayName) {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      throw noAuthError;
    }
    
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Store authentication token in cookie
      const token = await user.getIdToken();
      Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
      
      // Generate and store JWT token
      try {
        const response = await fetch('/api/auth/generate-jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            Cookies.set('jwt-token', data.token, { expires: 7 }); // 7 days expiry
          }
        }
      } catch (jwtError) {
        console.error("Error generating JWT token:", jwtError);
        // Continue anyway - authentication succeeded but JWT generation failed
      }
      
      if (!db) {
        console.warn("Firestore not initialized, skipping user data save");
        return user;
      }
      
      try {
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || '',
          emailVerified: false,
          role: 'customer',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } catch (firestoreError) {
        console.error("Error saving user data to Firestore:", firestoreError);
        // Continue anyway - authentication succeeded but Firestore save failed
      }
      
      return user;
    } catch (error) {
      console.error("Registration error:", error);
      
      // Set user-friendly error message
      if (error.code === 'auth/email-already-in-use') {
        setError('This email address is already in use. Please use a different email or try logging in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format. Please check and try again.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(`Registration failed: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Email/Password Login
  async function loginWithEmail(email, password) {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      throw noAuthError;
    }
    
    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store authentication token in cookie
      const token = await user.getIdToken();
      Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
      
      // Generate and store JWT token
      try {
        const response = await fetch('/api/auth/generate-jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            Cookies.set('jwt-token', data.token, { expires: 7 }); // 7 days expiry
          }
        }
      } catch (jwtError) {
        console.error("Error generating JWT token:", jwtError);
        // Continue anyway - authentication succeeded but JWT generation failed
      }
      
      if (!db) {
        console.warn("Firestore not initialized, skipping user data update");
        return user;
      }
      
      try {
        // Update last login time in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } catch (firestoreError) {
        console.error("Error updating user data in Firestore:", firestoreError);
        // Continue anyway - authentication succeeded but Firestore update failed
      }
      
      return user;
    } catch (error) {
      console.error("Email login error:", error);
      
      // Set user-friendly error message
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else if (error.code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid login credentials. Please check your email and password and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(`Login failed: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Reset Password
  async function resetPassword(email) {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      throw noAuthError;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Password reset error:", error);
      
      // Set user-friendly error message
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else {
        setError(`Password reset failed: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Google Sign-in function
  async function signInWithGoogle() {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      console.error("Google sign-in failed: Auth not initialized", noAuthError);
      throw noAuthError;
    }
    
    try {
      // Create Google provider
      const provider = new GoogleAuthProvider();
      
      // Add scopes
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters - use 'select_account' to force Google to show account selection dialog
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log("Starting Google sign-in popup...");
      
      // Check if Firebase is properly configured for Google Auth
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.error("Firebase API key is missing");
        setError("Authentication service is not properly configured. Please contact support.");
        throw new Error("Firebase API key is missing");
      }
      
      // Try to make sure popup works by checking for popup blockers
      const popupBlocked = window.innerWidth <= 0 || window.innerHeight <= 0;
      if (popupBlocked) {
        console.error("Popup might be blocked by browser settings");
        throw new Error("Popup blocked by browser. Please allow popups for this site.");
      }
      
      // Sign in with popup and explicitly specify resolver
      // In the signInWithGoogle function, change this line:
const userCredential = await signInWithPopup(auth, provider);
      
      // To this:
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("Google sign-in successful, user:", user.uid);

      // Store authentication token in cookie
      const token = await user.getIdToken();
      Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
      
      // Generate and store JWT token
      try {
        const response = await fetch('/api/auth/generate-jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            Cookies.set('jwt-token', data.token, { expires: 7 }); // 7 days expiry
          }
        }
      } catch (jwtError) {
        console.error("Error generating JWT token:", jwtError);
        // Continue anyway - authentication succeeded but JWT generation failed
      }
      
      if (!db) {
        console.warn("Firestore not initialized, skipping user data save");
        return user;
      }
      
      try {
        // Check if user exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          // Update existing user
          await setDoc(userRef, {
            lastLogin: serverTimestamp(),
            displayName: user.displayName || userDoc.data().displayName || '',
            photoURL: user.photoURL || userDoc.data().photoURL || '',
            email: user.email,
            emailVerified: user.emailVerified
          }, { merge: true });
        } else {
          // Create new user document
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            emailVerified: user.emailVerified,
            role: 'customer',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
        }
      } catch (firestoreError) {
        console.error("Error saving user data to Firestore:", firestoreError);
        // Continue anyway - authentication succeeded but Firestore save failed
      }
      
      return user;
    } catch (error) {
      console.error("Google sign-in error:", error.code, error.message);
      
      // Set user-friendly error message
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address but different sign-in credentials. Please sign in using the original method.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for OAuth operations. Please contact support.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/internal-error') {
        setError('Internal authentication error. Please try again or use a different sign-in method.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Multiple popup requests detected. Please try again.');
      } else if (error.code === 'auth/web-storage-unsupported') {
        setError('This browser does not support web storage. Please use a different browser.');
      } else {
        setError(`Google sign-in failed: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Log out
  async function logout() {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      throw noAuthError;
    }
    
    try {
      await signOut(auth);
      
      // Clear cookies
      Cookies.remove('firebase-auth-token');
      Cookies.remove('jwt-token');
      
      // Clear user state
      setCurrentUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError(`Logout failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

  // Get user role from Firestore
  async function getUserRole(uid) {
    if (!db) {
      console.warn("Firestore not initialized, cannot get user role");
      return null;
    }
    
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Check if this is our designated admin email
        if (userData.email === 'ns421602@gmail.com') {
          // Set as admin regardless of what's in the database
          setUserRole('admin');
          
          // Update the role in the database if it's not already set
          if (userData.role !== 'admin') {
            try {
              await setDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
              console.log('Updated user to admin role in database');
            } catch (updateError) {
              console.error('Error updating admin role:', updateError);
            }
          }
          
          return 'admin';
        }
        
        setUserRole(userData.role || 'customer');
        return userData.role || 'customer';
      } else {
        console.warn("User document not found in Firestore");
        setUserRole('customer');
        return 'customer';
      }
    } catch (error) {
      console.error("Error getting user role:", error);
      setUserRole('customer');
      return 'customer';
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    // If auth is not initialized or doesn't have the proper methods, don't try to listen
    if (!auth || !auth.app || typeof auth.onAuthStateChanged !== 'function') {
      console.warn("Firebase Auth not properly initialized, skipping auth state listener");
      setLoading(false);
      return;
    }
    
    let unsubscribe;
    try {
      // Use the auth object's method directly
      unsubscribe = auth.onAuthStateChanged(async (user) => {
        try {
          setCurrentUser(user);
          
          if (user) {
            // Check if this is our designated admin email
            if (user.email === 'ns421602@gmail.com') {
              setUserRole('admin');
              
              // Update the role in the database
              try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { 
                  role: 'admin', 
                  email: user.email,
                  updatedAt: serverTimestamp() 
                }, { merge: true });
                console.log('Updated user to admin role in database during auth state change');
              } catch (updateError) {
                console.error('Error updating admin role during auth state change:', updateError);
              }
            } else {
              // Get user role from Firestore for non-admin emails
              await getUserRole(user.uid);
            }
            
            // Store authentication token in cookie
            try {
              const token = await user.getIdToken();
              Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
              
              // Generate and store JWT token
              const response = await fetch('/api/auth/generate-jwt', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.token) {
                  Cookies.set('jwt-token', data.token, { expires: 7 }); // 7 days expiry
                }
              }
            } catch (tokenError) {
              console.error("Error setting auth token cookie:", tokenError);
            }
          } else {
            // Clear role and token when logged out
            setUserRole(null);
            Cookies.remove('firebase-auth-token');
            Cookies.remove('jwt-token');
          }
        } catch (error) {
          console.error("Auth state change error:", error);
          setError("Error updating authentication state. Please refresh the page.");
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error("Failed to set up auth state listener:", error);
      setError("Failed to initialize authentication. Please refresh the page.");
      setLoading(false);
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing from auth state:", error);
        }
      }
    };
  }, [authInitialized]); // Only re-run when authInitialized changes

  // Context value
  const value = {
    currentUser,
    userRole,
    loading,
    error,
    registerWithEmail,
    loginWithEmail,
    signInWithGoogle,
    resetPassword,
    logout,
    isAdmin: userRole === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading || !authInitialized ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}