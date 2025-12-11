import { useSettings } from './contexts/SettingsContext';
import { Mail, Phone, Briefcase } from 'lucide-react';

const Profile = () => {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Banner */}
      <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-32">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">

          <div className="p-8 pb-0 flex flex-col items-center relative">
            <div className="w-40 h-40 rounded-full p-1.5 bg-white shadow-xl mb-4 relative z-10">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-5xl font-bold text-blue-600 border border-blue-50">
                {settings.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900">{settings.user.name}</h2>
            <p className="text-lg text-gray-500 font-medium">{settings.user.role}</p>

            <div className="mt-6 flex items-center gap-4 w-full justify-center pb-8 border-b border-gray-100">
              <button className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                Edit Profile
              </button>
              <button className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Change Password
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Details</h3>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover:border-blue-100">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email Address</p>
                  <p className="text-gray-900 font-semibold">{settings.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-colors hover:border-green-200 hover:bg-green-50/30">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-green-600 shadow-sm border border-gray-100 group-hover:border-green-100">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                  <p className="text-gray-900 font-semibold">{settings.user.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-colors hover:border-purple-200 hover:bg-purple-50/30">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm border border-gray-100 group-hover:border-purple-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Work Role</p>
                  <p className="text-gray-900 font-semibold">{settings.user.role}</p>
                </div>
              </div>
            </div>

            {/* System Preferences */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">System Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600 font-medium">Theme</span>
                  <span className="px-3 py-1 bg-white rounded-lg text-sm font-semibold capitalize shadow-sm border border-gray-100">{settings.display.theme}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600 font-medium">Language</span>
                  <span className="px-3 py-1 bg-white rounded-lg text-sm font-semibold shadow-sm border border-gray-100">{settings.display.language === 'en' ? 'English' : 'Swahili'}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600 font-medium">Currency</span>
                  <span className="px-3 py-1 bg-white rounded-lg text-sm font-semibold shadow-sm border border-gray-100">{settings.display.currency}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600 font-medium">Notifications</span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.notifications.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.notifications.enabled ? 'translate-x-6' : ''}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 text-center border-t border-blue-100/50">
            <p className="text-sm text-blue-600 font-medium">
              Need to update advanced settings? <a href="/dashboard" className="underline hover:text-blue-800">Go to Dashboard Settings</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
