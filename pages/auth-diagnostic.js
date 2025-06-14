import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle, FiDatabase, FiPackage, FiShoppingBag, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { checkFirebaseAuth, testGoogleAuthProvider } from '../utils/firebase';
import { auth, app } from '../utils/firebase';
import { GoogleAuthProvider } from 'firebase/auth';

export default function AuthDiagnostic() {
  const { currentUser, error: authContextError } = useAuth();
  const router = useRouter();
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleProviderTest, setGoogleProviderTest] = useState(null);
  const [authConfig, setAuthConfig] = useState(null);

  useEffect(() => {
    async function runDiagnostics() {
      try {
        setLoading(true);
        
        // Check browser environment
        const browserInfo = {
          userAgent: navigator.userAgent,
          cookiesEnabled: navigator.cookieEnabled,
          language: navigator.language,
          platform: navigator.platform,
          vendor: navigator.vendor,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        };

        // Check Firebase initialization
        const firebaseInfo = {
          appInitialized: !!app,
          authInitialized: !!auth,
          authConfig: auth ? {
            apiKey: auth.app.options.apiKey ? "✓ Set" : "✗ Missing",
            authDomain: auth.app.options.authDomain ? "✓ Set" : "✗ Missing",
            projectId: auth.app.options.projectId ? "✓ Set" : "✗ Missing",
          } : null,
          currentUser: currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            displayName: currentUser.displayName,
            isAnonymous: currentUser.isAnonymous,
            providerData: currentUser.providerData.map(p => ({
              providerId: p.providerId,
              uid: p.uid,
              displayName: p.displayName,
              email: p.email,
            })),
          } : null,
        };

        // Check Google provider
        let googleProviderInfo = {};
        try {
          const provider = new GoogleAuthProvider();
          googleProviderInfo = {
            success: true,
            provider: "Google provider initialized successfully",
          };
        } catch (err) {
          googleProviderInfo = {
            success: false,
            error: err.message,
          };
        }

        // Check if popups are blocked
        let popupInfo = {};
        try {
          const popup = window.open('about:blank', '_blank', 'width=1,height=1');
          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            popupInfo = {
              popupsBlocked: true,
              message: "Popup windows appear to be blocked by the browser"
            };
          } else {
            popup.close();
            popupInfo = {
              popupsBlocked: false,
              message: "Popup windows are allowed"
            };
          }
        } catch (err) {
          popupInfo = {
            popupsBlocked: true,
            error: err.message,
            message: "Error checking popup blocker status"
          };
        }

        // Check Content-Security-Policy
        const cspInfo = {
          cspHeader: document.head.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "No CSP meta tag found",
        };

        // Fetch auth diagnostic data from API
        let apiCheckResult = {};
        try {
          const response = await fetch('/api/check-auth');
          apiCheckResult = await response.json();
        } catch (err) {
          apiCheckResult = {
            error: err.message,
            message: "Failed to fetch auth diagnostic data from API"
          };
        }

        // Combine all diagnostic data
        const diagnosticResult = {
          timestamp: new Date().toISOString(),
          browser: browserInfo,
          firebase: {
            app: firebaseInfo,
            auth: {
              ...firebaseInfo.authConfig,
              currentUser: firebaseInfo.currentUser,
              error: authContextError
            },
            googleProvider: googleProviderInfo,
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          },
          security: {
            csp: cspInfo,
            popups: popupInfo,
          },
          apiCheck: apiCheckResult,
        };

        setDiagnosticData(diagnosticResult);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    runDiagnostics();
  }, [currentUser, authContextError]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Auth Diagnostic | Ranga</title>
        <meta name="description" content="Authentication diagnostic tool" />
      </Head>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Authentication Diagnostic</h1>
        
        {loading && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <p className="text-gray-500">Loading diagnostic data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-lg font-medium text-red-800">Error running diagnostics</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {diagnosticData && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Diagnostic Results</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Generated at {new Date(diagnosticData.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Firebase Initialization Status */}
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Firebase Initialization</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.app.appInitialized ? (
                      <span className="text-green-600">✓ Firebase app initialized successfully</span>
                    ) : (
                      <span className="text-red-600">✗ Firebase app initialization failed</span>
                    )}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Auth Initialization</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.app.authInitialized ? (
                      <span className="text-green-600">✓ Firebase auth initialized successfully</span>
                    ) : (
                      <span className="text-red-600">✗ Firebase auth initialization failed</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Firebase Configuration */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Firebase Configuration</h3>
              </div>
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">API Key</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.auth?.apiKey || "Not available"}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Auth Domain</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.auth?.authDomain || "Not available"}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Project ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.auth?.projectId || "Not available"}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Environment Variables</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul>
                      <li>NODE_ENV: {diagnosticData.environment.nodeEnv}</li>
                      <li>NEXT_PUBLIC_FIREBASE_API_KEY: {diagnosticData.environment.hasApiKey ? "✓ Set" : "✗ Missing"}</li>
                      <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {diagnosticData.environment.hasAuthDomain ? "✓ Set" : "✗ Missing"}</li>
                      <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID: {diagnosticData.environment.hasProjectId ? "✓ Set" : "✗ Missing"}</li>
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Google Provider */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Google Provider</h3>
              </div>
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.firebase.googleProvider.success ? (
                      <span className="text-green-600">{diagnosticData.firebase.googleProvider.provider}</span>
                    ) : (
                      <span className="text-red-600">{diagnosticData.firebase.googleProvider.error}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Browser Environment */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Browser Environment</h3>
              </div>
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">User Agent</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.browser.userAgent}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Cookies Enabled</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.browser.cookiesEnabled ? "Yes" : "No"}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Popup Windows</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {diagnosticData.security.popups.popupsBlocked ? (
                      <span className="text-red-600">{diagnosticData.security.popups.message}</span>
                    ) : (
                      <span className="text-green-600">{diagnosticData.security.popups.message}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Current User */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Current User</h3>
              </div>
              <dl>
                {diagnosticData.firebase.auth.currentUser ? (
                  <>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">User ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {diagnosticData.firebase.auth.currentUser.uid}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {diagnosticData.firebase.auth.currentUser.email}
                      </dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {diagnosticData.firebase.auth.currentUser.displayName}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">No user is currently signed in</p>
                  </div>
                )}
              </dl>
            </div>

            {/* Error Information */}
            {diagnosticData.firebase.auth.error && (
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-red-800">Authentication Error</h3>
                </div>
                <dl>
                  <div className="bg-red-50 px-4 py-5 sm:px-6">
                    <p className="text-sm text-red-700">{diagnosticData.firebase.auth.error}</p>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 