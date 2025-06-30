import Head from 'next/head';
import AdminLayout from '../../../components/layout/AdminLayout';

export default function TestPage() {
  return (
    <AdminLayout title="Test Page">
      <Head>
        <title>Test Page | Admin</title>
      </Head>
      
      <div className="bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Test Page</h1>
        <p>This is a simple test page to check the admin layout.</p>
      </div>
    </AdminLayout>
  );
} 