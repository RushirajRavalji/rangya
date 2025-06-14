import { useState, useEffect, useRef } from 'react';
import { FiBell, FiX, FiCheck, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useNotification } from '../../contexts/NotificationContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AdminNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const { adminNotifications, adminUnreadCount, markAdminNotificationRead, markAllAdminNotificationsRead } = useNotification();
  const notificationRef = useRef(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'error':
        return <FiAlertCircle className="text-red-500" />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" />;
      default:
        return <FiInfo className="text-blue-500" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAdminNotificationRead(notification.id);
    }
    
    if (notification.link) {
      router.push(notification.link);
    }
    
    setIsOpen(false);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAdminNotificationsRead();
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        className="relative p-2 text-gray-600 hover:text-indigo-deep focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBell size={20} />
        {adminUnreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {adminUnreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20">
          <div className="px-4 py-2 bg-gray-50 flex justify-between items-center border-b">
            <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
            {adminUnreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-deep hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {adminNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                <p>No notifications</p>
              </div>
            ) : (
              <div>
                {adminNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-500">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 ml-2">
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {adminNotifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t text-center">
              <Link href="/admin/notifications" className="text-xs text-indigo-deep hover:text-blue-800">
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 