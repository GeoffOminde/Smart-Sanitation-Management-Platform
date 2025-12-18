import { Bell, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';

const Notifications = () => {
  // Mock data for display - normally this would come from a context or API
  const notifications = [
    { id: 1, type: 'info', message: 'New booking received for Unit ST-002.', time: '2 mins ago', read: false },
    { id: 2, type: 'warning', message: 'Low battery alert for Unit ST-005 - 15% remaining.', time: '1 hour ago', read: false },
    { id: 3, type: 'error', message: 'Unit ST-003 requires immediate servicing (Pump failure).', time: '3 hours ago', read: true },
    { id: 4, type: 'success', message: 'Technician completed maintenance for Unit ST-001.', time: '1 day ago', read: true },
    { id: 5, type: 'info', message: 'Weekly revenue report is ready for download.', time: '1 day ago', read: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h2>
            <p className="text-gray-500 font-medium">Stay updated with system alerts</p>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Mark all as read
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n.id} className={`p-6 hover:bg-gray-50 transition-all flex gap-4 group ${n.read ? 'opacity-70' : 'bg-blue-50/10'}`}>
                <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${n.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                    n.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      n.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                  {n.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
                    n.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                      n.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                        <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.message}
                    </p>
                    {!n.read && <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 ml-2"></span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{n.time}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 cursor-pointer ml-2 hover:underline">View details</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50/50 text-center border-t border-gray-100">
            <button className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Load earlier notifications</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
