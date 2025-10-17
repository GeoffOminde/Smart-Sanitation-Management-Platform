import { useEffect } from 'react';
import { track } from './lib/analytics';
import { BarChart3, TrendingUp, Clock, Shield } from 'lucide-react';

const Value = () => {
  useEffect(() => {
    track('view_value_dashboard');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Value & ROI</h2>
              <p className="text-sm text-gray-500">Operational, financial and reliability KPIs</p>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pickups Avoided</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">vs. baseline</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Route Miles Reduced</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Optimized vs. actual</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fuel/Labor Savings</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Estimated this month</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime (SLA)</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
          </div>
        </div>

        {/* Cohorts & WAU/MAU placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Retention Cohorts</h3>
            </div>
            <div className="p-6 text-sm text-gray-500">D7 / D30 / D90 retention — data not yet connected</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">WAU / MAU</h3>
            </div>
            <div className="p-6 text-sm text-gray-500">Weekly / Monthly active users — data not yet connected</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Value;
