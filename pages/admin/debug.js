import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function DebugLayout() {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in or not admin
    if (!currentUser) {
      router.push('/login?redirect=/admin');
      return;
    }

    if (userRole !== 'admin') {
      router.push('/account');
      return;
    }
  }, [currentUser, router, userRole]);

  if (!currentUser || userRole !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Debug Layout | Admin</title>
      </Head>
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-indigo-900 text-white min-h-screen">
          <div className="p-4 bg-indigo-950">
            <h1 className="text-xl font-bold">Debug Sidebar</h1>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <a href="/admin" className="block p-2 hover:bg-indigo-800 rounded">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/admin/products" className="block p-2 hover:bg-indigo-800 rounded">
                  Products
                </a>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <header className="bg-white shadow h-16 flex items-center px-6">
            <h1 className="text-xl font-semibold text-gray-800">Debug Page</h1>
          </header>
          
          <main className="p-6">
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-bold mb-4">Layout Structure</h2>
              <p className="mb-4">This page shows a basic layout structure without using the AdminLayout component.</p>
              <p>If this page shows only one sidebar, then the issue is in the AdminLayout component or how it's being used.</p>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-bold text-yellow-800 mb-2">Debugging Steps:</h3>
                <ol className="list-decimal list-inside text-yellow-800">
                  <li>Compare this page with the admin dashboard</li>
                  <li>Check if there are nested layout components</li>
                  <li>Look for duplicate sidebar components in the HTML structure</li>
                </ol>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
} 