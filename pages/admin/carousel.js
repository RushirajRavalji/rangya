import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import CarouselManager from '../../components/admin/CarouselManager';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const CarouselManagementPage = () => {
  const { currentUser, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    // Check admin status directly from database
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setPageLoading(false);
        return;
      }
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check if role is admin or if it's our specific admin email
          setIsAdmin(userData.role === 'admin' || userData.email === 'driger.ray.dranzer@gmail.com');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setPageLoading(false);
      }
    };
    
    if (!loading) {
      checkAdminStatus();
    }
  }, [currentUser, loading]);
  
  useEffect(() => {
    // Only redirect once we've confirmed user is not admin
    if (!loading && !pageLoading && !isAdmin && currentUser) {
      router.push('/');
    }
    
    // Redirect to login if not authenticated
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, pageLoading, isAdmin, router]);
  
  // Show loading state while checking
  if (loading || pageLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="ml-3">Loading...</p>
        </div>
      </AdminLayout>
    );
  }
  
  // If user is not authenticated or not admin, show nothing (redirect will happen)
  if (!currentUser || !isAdmin) {
    return null;
  }
  
  return (
    <AdminLayout>
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Homepage Carousel Management</h1>
        <p className="text-gray-600 mb-6">
          Manage the sliding banners that appear on the homepage. Upload images, set titles, and customize the appearance.
        </p>
        
        <CarouselManager />
      </div>
    </AdminLayout>
  );
};

export default CarouselManagementPage; 