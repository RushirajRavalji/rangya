import { createContext, useContext, useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserPopupRedirectResolver
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

  // Check if Firebase is properly initialized
  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized");
      setError("Authentication service is not available. Please try again later.");
      setLoading(false);
    }
  }, []);

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
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log("Starting Google sign-in popup...");
      
      // Sign in with popup and explicitly specify resolver
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const user = result.user;
      
      console.log("Google sign-in successful, user:", user.uid);

      // Store authentication token in cookie
      const token = await user.getIdToken();
      Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
      
      if (!db) {
        console.warn("Firestore not initialized, skipping user data save");
        return user;
      }
      
      try {
        // Save user to Firestore if they don't exist
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Create new user document
          await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: 'customer',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
          console.log("New user created in Firestore");
        } else {
          // Update last login time
          await setDoc(userRef, {
            lastLogin: serverTimestamp()
          }, { merge: true });
          console.log("User login time updated in Firestore");
        }
      } catch (firestoreError) {
        console.error("Error saving user data to Firestore:", firestoreError);
        // Continue with authentication even if Firestore update fails
      }
      
      return user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      // Set user-friendly error message
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Multiple popup requests were triggered. Please try again.');
      } else if (error.code === 'auth/internal-error') {
        setError('Authentication service encountered an internal error. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Google authentication is not enabled for this application.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for OAuth operations.');
        console.error("Unauthorized domain. Current domain:", window.location.hostname);
      } else {
        setError(`Authentication failed: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Sign out function
  async function logOut() {
    setError(null);
    
    if (!auth) {
      const noAuthError = new Error("Authentication service is not available");
      setError("Authentication service is not available. Please try again later.");
      throw noAuthError;
    }
    
    try {
      // Remove auth token cookie
      Cookies.remove('firebase-auth-token');
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      setError('Failed to sign out. Please try again.');
      throw error;
    }
  }

  // Get user role from Firestore
  async function getUserRole(uid) {
    if (!db) {
      console.error("Firestore not initialized");
      return 'customer';
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        return userDoc.data().role || 'customer';
      }
      
      return 'customer'; // Default role
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'customer';
    }
  }

  // Set up auth state listener
  useEffect(() => {
    if (!auth) {
      console.error("Cannot set up auth state listener: Auth not initialized");
      setLoading(false);
      return () => {};
    }
    
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
      setCurrentUser(user);
      
      if (user) {
        try {
          // Update the auth token cookie when auth state changes
          const token = await user.getIdToken();
          Cookies.set('firebase-auth-token', token, { expires: 7 }); // 7 days expiry
          
          const role = await getUserRole(user.uid);
          setUserRole(role);
        } catch (error) {
          console.error("Error getting user role:", error);
          setUserRole('customer');
        }
      } else {
        // Remove auth token cookie when user logs out
        Cookies.remove('firebase-auth-token');
        setUserRole(null);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setError("Authentication service encountered an error. Please refresh the page.");
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Context value
  const value = {
    currentUser,
    userRole,
    loading,
    error,
    signInWithGoogle,
    logOut,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 