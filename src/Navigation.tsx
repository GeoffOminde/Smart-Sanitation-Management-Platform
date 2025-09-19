import { Link, useNavigate } from 'react-router-dom';
import { Bell, Users, Truck, CreditCard, BarChart3 } from 'lucide-react';
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
            <Link to="/notifications" className="p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
            </Link>
            <Link to="/insights" className="p-2 text-gray-400 hover:text-gray-600" title="Insights">
              <BarChart3 className="w-5 h-5" />
            </Link>
            <Link to="/payments" className="p-2 text-gray-400 hover:text-gray-600" title="Payments">
              <CreditCard className="w-5 h-5" />
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;