import { useState, useEffect } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { useLocale } from './contexts/LocaleContext';
import { useAuth } from './AuthContext';
import { Mail, Phone, Briefcase, User, Shield, Key, Edit3, X, Save } from 'lucide-react';

const Profile = () => {
  const { updateSettings } = useSettings();
  const { user, login } = useAuth();
  const { t } = useLocale();

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState('');

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Account stats
  const [daysActive, setDaysActive] = useState(0);
  const [lastLogin, setLastLogin] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    // Calculate days active (from account creation)
    const accountCreated = new Date('2024-11-23'); // Example date
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - accountCreated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysActive(diffDays);

    // Set last login time
    const now = new Date();
    setLastLogin(now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }));
  }, []);

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditModalOpen(true);
  };

  const saveProfile = () => {
    if (user) {
      // Logic to update user in AuthContext
      const updatedUser = { ...user, name: editName, email: editEmail };
      login(updatedUser); // Update local user state

      setEditModalOpen(false);
      alert('✅ Profile updated successfully!');
    }
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalOpen(true);
  };

  const savePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('⚠️ Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('⚠️ New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      alert('⚠️ Password must be at least 8 characters');
      return;
    }
    // In production, this would call an API
    setPasswordModalOpen(false);
    alert('✅ Password changed successfully!');
  };

  const toggle2FA = () => {
    if (!twoFactorEnabled) {
      const confirm = window.confirm('Enable Two-Factor Authentication? You will receive a verification code via SMS.');
      if (confirm) {
        setTwoFactorEnabled(true);
        alert('✅ Two-Factor Authentication enabled!');
      }
    } else {
      const confirm = window.confirm('Disable Two-Factor Authentication? This will reduce your account security.');
      if (confirm) {
        setTwoFactorEnabled(false);
        alert('⚠️ Two-Factor Authentication disabled');
      }
    }
  };

  const getPasswordAge = () => {
    // In production, this would come from the backend
    return '30 days ago';
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Modern Banner with Gradient */}
      <div className="h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-24">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl p-1 bg-gradient-to-br from-blue-500 to-purple-500 shadow-xl">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-5xl font-bold text-blue-600 border-2 border-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.name || 'User'}</h1>
              <p className="text-lg text-gray-500 font-medium mb-4">{user?.role || 'Administrator'}</p>

              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={handleEditProfile}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {t('profile.edit') || 'Edit Profile'}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  {t('profile.changePassword') || 'Change Password'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 md:gap-4 md:flex-col">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{daysActive}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Days Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">98%</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Uptime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Contact Information Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in slide-in-from-left duration-500">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('profile.contactDetails') || 'Contact Information'}</h2>
                  <p className="text-sm text-gray-600">Your personal contact details</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Email */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-100 group hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('profile.email') || 'Email Address'}</p>
                  <p className="text-gray-900 font-semibold text-lg">{user?.email || '—'}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-green-50/50 border border-green-100 group hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('profile.phone') || 'Phone Number'}</p>
                  <p className="text-gray-900 font-semibold text-lg">{'—'}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-50/50 border border-purple-100 group hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('profile.role') || 'Role'}</p>
                  <p className="text-gray-900 font-semibold text-lg">{user?.role || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Account Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in slide-in-from-right duration-500">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Security & Account</h2>
                  <p className="text-sm text-gray-600">Manage your account security</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Account Status */}
              <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Account Status</span>
                  <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">Active</span>
                </div>
                <p className="text-xs text-gray-600">Your account is in good standing</p>
              </div>

              {/* Last Login */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Last Login</span>
                  <span className="text-sm text-blue-600 font-semibold">Today, {lastLogin}</span>
                </div>
                <p className="text-xs text-gray-600">Nairobi, Kenya • Chrome Browser</p>
              </div>

              {/* Two-Factor Authentication */}
              <div className={`p-4 rounded-2xl border cursor-pointer transition-all ${twoFactorEnabled ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`} onClick={toggle2FA}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Two-Factor Auth</span>
                  <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${twoFactorEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}>
                    {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
                  </span>
                </div>
                <button className={`mt-2 text-xs font-semibold underline ${twoFactorEnabled ? 'text-green-700 hover:text-green-800' : 'text-yellow-700 hover:text-yellow-800'}`}>
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA for extra security'}
                </button>
              </div>

              {/* Password */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Password</span>
                  <span className="text-sm text-gray-500">Last changed {getPasswordAge()}</span>
                </div>
                <button
                  onClick={handleChangePassword}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:text-blue-700 underline"
                >
                  Change password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-100 animate-in fade-in duration-700">
          <p className="text-sm text-blue-700 font-medium">
            {t('profile.footer') || '🔒 Your data is encrypted and secure. For system preferences, visit the Settings page.'}
          </p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-bold">Edit Profile</h4>
                  <p className="text-blue-100 text-sm mt-1">Update your personal information</p>
                </div>
                <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="tel"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 rounded-b-3xl">
              <button onClick={() => setEditModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={saveProfile} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-bold">Change Password</h4>
                  <p className="text-purple-100 text-sm mt-1">Update your account password</p>
                </div>
                <button onClick={() => setPasswordModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 rounded-b-3xl">
              <button onClick={() => setPasswordModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={savePassword} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Key className="w-4 h-4" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
