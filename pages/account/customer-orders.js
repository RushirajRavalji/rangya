import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import CustomerOrders from '../../components/account/CustomerOrders';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Customer Orders Page
 * Displays orders from the customer's subcollection
 */
export default function CustomerOrdersPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  // Redirect if not logged in
  if (!currentUser) {
    if (typeof window !== 'undefined') {
      router.push('/login?redirect=/account/customer-orders');
    }
    return null;
  }

  // Filter options for order status
  const filterOptions = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Your Orders | Rangya</title>
        <meta name="description" content="View your order history and track current orders" />
      </Head>

      <h1 className="text-3xl font-bold mb-8">Your Orders</h1>

      {/* Status filter tabs */}
      <div className="mb-8 border-b">
        <div className="flex overflow-x-auto hide-scrollbar">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === option.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders component */}
      <CustomerOrders status={activeTab !== 'all' ? activeTab : null} />
    </div>
  );
}

// Protect this page - require authentication
export async function getServerSideProps(context) {
  return {
    props: {}
  };
}