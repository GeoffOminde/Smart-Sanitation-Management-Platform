import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Truck, Bell } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotifications } from './contexts/NotificationContext';
import { useLocale } from './contexts/LocaleContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotifications();
  const { t } = useLocale();
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

  // Premium Glassmorphism Header Design
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
                <Truck className="w-6 h-6 text-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">
                  Smart Sanitation Management Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-1 bg-gray-50/80 p-1.5 rounded-full border border-gray-200/50">
            <Link
              to="/dashboard"
              className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-full transition-all duration-200"
            >
              {t('nav.overview')}
            </Link>
            <Link
              to="/value"
              className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-full transition-all duration-200"
            >
              {t('nav.value')}
            </Link>
          </div>

          {/* Right Actions Section */}
          <div className="flex items-center gap-4">

            {/* Regional Flags */}
            <div className="flex items-center gap-3 mr-1 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hidden md:flex">
              <img
                src="https://flagcdn.com/w40/ke.png"
                alt="Kenya"
                className="w-6 h-4 object-cover rounded shadow-sm hover:scale-125 transition-transform cursor-pointer"
                title="Kenya Operations"
              />
              <img
                src="https://flagcdn.com/w40/ug.png"
                alt="Uganda"
                className="w-6 h-4 object-cover rounded shadow-sm hover:scale-125 transition-transform cursor-pointer"
                title="Uganda Operations"
              />
              <img
                src="https://flagcdn.com/w40/tz.png"
                alt="Tanzania"
                className="w-6 h-4 object-cover rounded shadow-sm hover:scale-125 transition-transform cursor-pointer"
                title="Tanzania Operations"
              />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-full transition-colors duration-200 focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
              </button>

              {/* Notification Dropdown (Styled) */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">{t('nav.notifications')}</h3>
                    <div className="flex gap-3 text-xs">
                      <button onClick={markAllAsRead} disabled={unreadCount === 0} className="text-blue-600 hover:underline disabled:text-gray-400">{t('nav.markRead')}</button>
                      <button onClick={clearAll} disabled={notifications.length === 0} className="text-gray-500 hover:text-red-500 disabled:text-gray-300">{t('nav.clear')}</button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                          <Bell className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500">{t('nav.noNotifications')}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                          >
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notification.read ? 'bg-gray-200' : 'bg-blue-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900 leading-snug">{notification.title}</p>
                              {notification.body && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notification.body}</p>}
                              <p className="text-[10px] text-gray-400 mt-2 font-medium">{notification.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative pl-4 border-l border-gray-200" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-3 focus:outline-none group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-none group-hover:text-blue-600 transition-colors">Admin User</p>
                  <p className="text-xs text-gray-500 mt-1">{t('nav.user.role')}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-0.5 shadow-inner ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </button>

              {/* Profile Dropdown (Styled) */}
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="p-2 space-y-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                    >
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/admin/transactions"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                    >
                      {t('nav.adminTransactions')}
                    </Link>
                  </div>
                  <div className="p-2 border-t border-gray-50 bg-gray-50/50">
                    <button
                      onClick={() => {
                        logout();
                        navigate('/login');
                        setProfileOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
