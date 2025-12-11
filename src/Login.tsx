import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { trackNow } from './lib/analytics';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: username.trim(),
          password: password
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Invalid credentials');
        return;
      }

      const data = await response.json();

      // Store token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      login();
      trackNow('login_success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
      <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-3xl animate-in fade-in duration-1000"></div>
      <div className="absolute bottom-[0%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl animate-in fade-in duration-1000 delay-200"></div>

      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
            <p className="text-blue-200/80 mt-2 text-sm font-medium">Smart Sanitation Platform</p>
          </div>

          {error && (
            <div className="mb-6 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-center backdrop-blur-md">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-400 transition-colors">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:bg-white/10 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Password</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:bg-white/10 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end text-xs text-blue-200/60 pt-2">
              <button type="button" className="hover:text-white transition-colors hover:underline">Forgot password?</button>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>

          <div className="text-sm text-blue-200/60 mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-white font-bold hover:underline">Create Account</Link>
          </div>
        </div>

        <p className="text-center text-xs text-blue-200/40 mt-8">
          &copy; 2024 Smart Sanitation Management Platform
        </p>
      </div>
    </div>
  );

};

export default Login;
