import React from 'react';
import { FiBell, FiLoader } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useAdminNotification } from '../../contexts/AdminNotificationContext';

const AdminNotifications = () => {
  const { unreadCount, loading, error, retryFetch } = useAdminNotification();
  const router = useRouter();

  const handleNotificationClick = () => {
    router.push('/admin/notifications');
  };

  return (
    <div className="relative">
      {/* Notification Bell with Count */}
      <div 
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none transition-all duration-300 cursor-pointer"
        onClick={handleNotificationClick}
        title={error ? "Error loading notifications. Click to view." : "View notifications"}
      >
        {loading ? (
          <FiLoader className="h-6 w-6 animate-spin text-blue-600" />
        ) : error ? (
          <FiBell className="h-6 w-6 text-red-500" />
        ) : (
          <FiBell className={`h-6 w-6 ${unreadCount > 0 ? 'text-blue-600 animate-pulse' : ''}`} />
        )}
        
        {/* Unread Badge */}
        {!loading && !error && unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications; 