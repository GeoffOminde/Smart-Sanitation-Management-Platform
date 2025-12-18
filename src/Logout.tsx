import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';


const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
      <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[0%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-200"></div>

      <div className="relative z-10 animate-in zoom-in-95 duration-500">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-white border-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Logging Out</h2>
          <p className="text-blue-200/60 text-sm">Please wait while we securely sign you out...</p>
        </div>
      </div>
    </div>
  );
};

export default Logout;
