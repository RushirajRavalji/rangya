import { useState } from 'react';
import Head from 'next/head';
import { FiDatabase, FiRefreshCw, FiPlus, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import AdminLayout from '../../components/layout/AdminLayout';

export default function TestFirebase() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [addingProducts, setAddingProducts] = useState(false);
  const [productResults, setProductResults] = useState(null);

  // Test Firebase connection
  const testConnection = async () => {
    try {
      setLoading(true);
      setTestResults(null);
      
      const response = await fetch('/api/check-firebase');
      const data = await response.json();
      
      setTestResults(data);
    } catch (error) {
      setTestResults({ 
        status: 'error', 
        message: error.message || 'Failed to test connection'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add test products
  const addTestProducts = async () => {
    try {
      setAddingProducts(true);
      setProductResults(null);
      
      const response = await fetch('/api/test-add-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setProductResults(data);
    } catch (error) {
      setProductResults({ 
        success: false, 
        error: error.message || 'Failed to add test products'
      });
    } finally {
      setAddingProducts(false);
    }
  };

  return (
    <>
      <Head>
        <title>Test Firebase Connection | Admin</title>
      </Head>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test Firebase Connection</h1>
        
        <div className="grid gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiDatabase className="mr-2" /> Firebase Connection Test
            </h2>
            
            <div className="mb-4">
              <button
                onClick={testConnection}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="mr-2" />
                    Test Connection
                  </>
                )}
              </button>
            </div>
            
            {testResults && (
              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Test Results:</h3>
                <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiPlus className="mr-2" /> Add Test Products
            </h2>
            
            <div className="mb-4">
              <button
                onClick={addTestProducts}
                disabled={addingProducts}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
              >
                {addingProducts ? (
                  <>
                    <FiRefreshCw className="animate-spin mr-2" />
                    Adding Products...
                  </>
                ) : (
                  <>
                    <FiPlus className="mr-2" />
                    Add Test Products
                  </>
                )}
              </button>
            </div>
            
            {productResults && (
              <div className={`border rounded-md p-4 ${productResults.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className="font-medium mb-2 flex items-center">
                  {productResults.success ? (
                    <>
                      <FiCheck className="text-green-500 mr-1" /> Success
                    </>
                  ) : (
                    <>
                      <FiAlertTriangle className="text-red-500 mr-1" /> Error
                    </>
                  )}
                </h3>
                <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(productResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="font-medium mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>First test your Firebase connection using the "Test Connection" button</li>
            <li>If the connection is successful, you can add test products using the "Add Test Products" button</li>
            <li>Once products are added, go to the products page to view them</li>
            <li>If you encounter any errors, check your Firebase configuration in the .env.local file</li>
          </ol>
        </div>
      </div>
    </>
  );
}

TestFirebase.getLayout = function getLayout(page) {
  return <AdminLayout>{page}</AdminLayout>;
}; 