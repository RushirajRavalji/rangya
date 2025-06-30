import Head from 'next/head';
import AdminLayout from '../../components/layout/AdminLayout';

export default function CheckLayout() {
  return (
    <AdminLayout title="Check Layout">
      <Head>
        <title>Check Layout | Admin</title>
      </Head>
      
      <div className="p-4 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Layout Test</h1>
        <p>This is a simple page to check the admin layout.</p>
      </div>
    </AdminLayout>
  );
} 