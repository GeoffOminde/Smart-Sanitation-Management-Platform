import { useSettings } from './contexts/SettingsContext';
import { User, Mail, Phone, Briefcase } from 'lucide-react';

const Profile = () => {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-600 mt-1">View your profile information</p>
          </div>

          {/* Avatar and Name */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-3xl font-bold">
              {settings.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">{settings.user.name}</h3>
              <p className="text-gray-600 mt-1">{settings.user.role}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{settings.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{settings.user.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <Briefcase className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium text-gray-900">{settings.user.role}</p>
              </div>
            </div>
          </div>

          {/* Preferences Summary */}
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Theme</p>
                <p className="font-medium text-gray-900 capitalize">{settings.display.theme}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Language</p>
                <p className="font-medium text-gray-900">{settings.display.language === 'en' ? 'English' : 'Swahili'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Currency</p>
                <p className="font-medium text-gray-900">{settings.display.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="font-medium text-gray-900">{settings.notifications.enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              To update your profile or preferences, go to the Dashboard and click on the Settings tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
