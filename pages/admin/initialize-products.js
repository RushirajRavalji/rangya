import { useState } from 'react';
import Head from 'next/head';
import { FiDatabase, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useRouter } from 'next/router';

export default function InitializeProducts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleInitializeProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const response = await fetch('/api/admin/initialize-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize products');
      }
      
      setResult(data);
    } catch (err) {
      console.error('Error initializing products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Head>
        <title>Initialize Products | Ranga Admin</title>
      </Head>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <FiDatabase className="text-indigo-deep mr-3 h-8 w-8" />
          <h1 className="text-2xl font-bold">Initialize Products</h1>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This tool will check if your products collection is empty and add sample products if needed.
            Use this to quickly populate your store with demo products.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800">
              <strong>Note:</strong> This action will only add products if your database is empty.
              Existing products will not be modified or deleted.
            </p>
          </div>
          
          <button
            onClick={handleInitializeProducts}
            disabled={loading}
            className="bg-indigo-deep text-white px-6 py-3 rounded-md hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center w-full md:w-auto"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Initializing Products...
              </>
            ) : (
              'Initialize Sample Products'
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex items-center mb-3">
              <FiCheckCircle className="text-green-500 mr-2" />
              <p className="text-green-700 font-medium">{result.message}</p>
            </div>
            
            {result.products && result.products.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Added Products:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {result.products.map(product => (
                    <li key={product.id} className="text-gray-700">
                      {product.name_en} ({product.category})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Admin
          </button>
        </div>
      </div>
    </div>
  );
} 