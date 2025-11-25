import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Truck, Bell } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotifications } from './contexts/NotificationContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotifications();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const toggleNotifications = () => {
    setNotificationsOpen(prev => !prev);
    setProfileOpen(false);
  };

  return (
    <nav className="flex items-center justify-between bg-white shadow-sm border-b max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <Link to="/dashboard" className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-semibold text-gray-900">Smart Sanitation</h1>
            <p className="text-sm text-gray-500">Fleet Management Platform</p>
          </div>
        </Link>
      </div>
      <div className="flex items-center space-x-3">
        <Link
          to="/value"
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
        >
          Value
        </Link>
        <Link
          to="/assistant"
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
        >
          Assistant
        </Link>
        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
          </button>
          {profileOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/admin/transactions"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  Admin — Transactions
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                    setProfileOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Notifications dropdown */}
        <div className="relative ml-3" ref={notificationsRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white">
                <span className="sr-only">{unreadCount} unread notifications</span>
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Mark all as read
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={notifications.length === 0}
                      className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-center text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          markAsRead(notification.id);
                        }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <div
                              className={`h-2 w-2 rounded-full ${notification.read ? 'bg-transparent' : 'bg-blue-500'}`}
                            />
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            {notification.body && (
                              <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <button onClick={() => setNotificationsOpen(false)} className="text-xs font-medium text-gray-600 hover:text-gray-800">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;