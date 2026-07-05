import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useSocketStore } from '../store/socketStore';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = ({ mobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAsClicked,
    deleteNotification,
    clearAllRead,
    addRealtimeNotification 
  } = useNotificationStore();

  const { socket } = useSocketStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (socket) {
      socket.on('new-notification', (notification) => {
        addRealtimeNotification(notification);
      });
      return () => {
        socket.off('new-notification');
      };
    }
  }, [socket, addRealtimeNotification]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsClicked(notification._id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className={`relative ${mobile ? 'flex justify-center static sm:relative' : ''}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 focus:outline-none"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-dark-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className={
            mobile 
              ? "fixed bottom-16 left-2 right-2 sm:absolute sm:bottom-full sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:mb-2 w-auto sm:w-80 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-100 dark:border-dark-700 z-[100] overflow-hidden flex flex-col max-h-[70vh]" 
              : "absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-100 dark:border-dark-700 z-50 overflow-hidden flex flex-col max-h-[85vh]"
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {unreadCount} New
              </span>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Bell size={40} className="text-gray-300 dark:text-dark-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">We'll let you know when something arrives!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-dark-700">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`relative p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition cursor-pointer flex gap-3 ${
                      !notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Unread dot */}
                    {!notification.isRead && (
                      <div className="absolute left-2 top-5 h-2 w-2 rounded-full bg-primary-500" />
                    )}
                    
                    <div className="flex-1 ml-2">
                      {notification.title && (
                        <p className={`text-sm mb-0.5 ${!notification.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'}`}>
                          {notification.title}
                        </p>
                      )}
                      <p className={`text-sm ${!notification.isRead ? 'text-gray-800 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1.5 font-medium">
                        {new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-start gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification._id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification._id); }}
                          className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.some(n => n.isRead) && (
            <div className="p-3 border-t border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 flex justify-center">
              <button
                onClick={clearAllRead}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
              >
                Clear all read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
