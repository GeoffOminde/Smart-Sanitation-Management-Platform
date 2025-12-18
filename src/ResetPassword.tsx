import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setLoading(false);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error('Reset password error:', err);
            setError('Connection error. Please try again.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
                    <p className="text-blue-200/80 mb-6">Your password has been updated successfully.</p>
                    <p className="text-sm text-blue-200/60">Redirecting to login page...</p>
                </div>
            </div>
        );
    }

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
                        <h2 className="text-3xl font-bold text-white tracking-tight">Reset Password</h2>
                        <p className="text-blue-200/80 mt-2 text-sm font-medium">Enter your new password</p>
                    </div>

                    {error && (
                        <div className="mb-6 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-center backdrop-blur-md">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">New Password</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-400 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:bg-white/10 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-4 pr-4 py-3.5 bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:bg-white/10 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>

                    <div className="text-sm text-blue-200/60 mt-6 text-center">
                        Remember your password?{' '}
                        <Link to="/login" className="text-white font-bold hover:underline">Sign in</Link>
                    </div>
                </div>

                <p className="text-center text-xs text-blue-200/40 mt-8">
                    &copy; 2024 Smart Sanitation Management Platform
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
