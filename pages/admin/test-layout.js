import Head from 'next/head';
import AdminLayout from '../../components/layout/AdminLayout';

export default function TestLayout() {
  return (
    <AdminLayout title="Test Layout">
      <Head>
        <title>Test Layout | Admin</title>
      </Head>
      
      <div className="p-4 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Test Layout</h1>
        <p>This is a simple page to check the admin layout.</p>
      </div>
    </AdminLayout>
  );
} 