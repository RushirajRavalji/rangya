import { useState } from 'react';
import { FiMail, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null, 'success', 'error'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Simulate API call - in production, replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success
      setStatus('success');
      setEmail('');
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 bg-indigo-deep text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="mb-8">
            Subscribe to our newsletter for exclusive offers, new arrivals, and styling tips.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="pl-10 w-full py-3 px-4 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || status === 'success'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || status === 'success'}
              className="py-3 px-6 bg-white text-indigo-deep font-medium rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          
          {/* Status message */}
          {status === 'success' && (
            <div className="mt-4 flex items-center justify-center text-green-300">
              <FiCheckCircle className="mr-2" />
              <span>Thank you for subscribing!</span>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4 flex items-center justify-center text-red-300">
              <FiAlertCircle className="mr-2" />
              <span>Please enter a valid email address.</span>
            </div>
          )}
          
          <p className="mt-4 text-sm opacity-80">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
} 