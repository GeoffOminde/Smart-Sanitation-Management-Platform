import { Link, useNavigate } from 'react-router-dom';
import { Users, Truck, CreditCard, BarChart3 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useState, useRef, useEffect } from 'react';

const Navigation = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Notifications state + unread count
  const [notifications, setNotifications] = useState<any[]>(() => {
    try { const s = localStorage.getItem('notifications'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    try { localStorage.setItem('notifications', JSON.stringify(notifications)); } catch {}
  }, [notifications]);

  const onBellClick = () => {
    setNotificationsOpen(prev => !prev);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">Smart Sanitation</h1>
                <p className="text-sm text-gray-500">Fleet Management Platform</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/value" className="px-2 py-1 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded" title="Value & ROI">
              Value
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <Users className="w-4 h-4 text-gray-600" />
              </button>

              <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ${open ? 'block' : 'hidden'}`}>
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Profile
                </Link>
                <Link to="/admin/transactions" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Admin — Transactions
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Bell / Notifications */}
            <div className="relative">
              <button
                onClick={onBellClick}
                aria-label="Notifications"
                className="relative p-2 rounded-md hover:bg-gray-100 focus:outline-none transition"
                title="Notifications"
              >
                {/* Bell icon (SVG) */}
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Red unread badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 transform translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-medium leading-none px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                    <div className="flex items-center space-x-2">
                      <button onClick={markAllRead} className="text-xs text-gray-600 hover:text-gray-800">Mark all read</button>
                      <button onClick={() => setNotificationsOpen(false)} className="text-xs text-gray-600 hover:text-gray-800">Close</button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="p-4 text-sm text-gray-500">No notifications</div>
                    )}
                    {notifications.map((n, idx) => (
                      <div key={n.id || idx} className={`p-3 border-b hover:bg-gray-50 flex items-start gap-3 ${n.read ? 'opacity-80' : 'bg-white'}`}>
                        <div className="flex-1">
                          <div className="text-sm text-gray-800">{n.title || 'Notification'}</div>
                          {n.body && <div className="text-xs text-gray-500 mt-1">{n.body}</div>}
                          <div className="text-xs text-gray-400 mt-1">{n.time || ''}</div>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                      </div>
                    ))}
                  </div>

                  <div className="p-2 border-t text-right">
                    <button
                      onClick={() => {
                        setNotifications([]);
                        setNotificationsOpen(false);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;