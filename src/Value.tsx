import { useState, useEffect } from 'react';
import { track } from './lib/analytics';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Shield, 
  DollarSign, 
  Users, 
  Calendar, 
  Download, 
  RefreshCw 
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Mock data generation functions
const generateMonthlyData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  return months.map(month => ({
    month,
    value: Math.floor(Math.random() * 1000) + 500,
    previous: Math.floor(Math.random() * 900) + 300
  }));
};

const generateCohortData = () => {
  const cohorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return cohorts.map(cohort => ({
    cohort,
    d7: Math.floor(Math.random() * 100) + 20,
    d30: Math.floor(Math.random() * 80) + 10,
    d90: Math.floor(Math.random() * 60) + 5
  }));
};

const Value = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [kpiData, setKpiData] = useState({
    pickupsAvoided: { current: 0, trend: 0 },
    routeMilesReduced: { current: 0, trend: 0 },
    fuelSavings: { current: 0, trend: 0 },
    uptime: { current: 0, trend: 0 }
  });
  const [chartData, setChartData] = useState<any>(null);
  const [cohortData, setCohortData] = useState<any[]>([]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock data
    const monthlyData = generateMonthlyData();
    const cohorts = generateCohortData();
    
    // Update state with mock data
    setKpiData({
      pickupsAvoided: { 
        current: 1242, 
        trend: 12.5 
      },
      routeMilesReduced: { 
        current: 845, 
        trend: 8.2 
      },
      fuelSavings: { 
        current: 12500, 
        trend: 5.8 
      },
      uptime: { 
        current: 99.2, 
        trend: 0.5 
      }
    });
    
    // Prepare chart data
    setChartData({
      labels: monthlyData.map(d => d.month),
      datasets: [
        {
          label: 'This Year',
          data: monthlyData.map(d => d.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Last Year',
          data: monthlyData.map(d => d.previous),
          borderColor: '#9ca3af',
          borderDash: [5, 5],
          tension: 0.3
        }
      ]
    });
    
    setCohortData(cohorts);
    setIsLoading(false);
  };

  useEffect(() => {
    track('view_value_dashboard');
    loadData();
  }, [timeRange]);

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
  };

  // KPI Card component
  const KPICard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    iconBg, 
    iconColor,
    isCurrency = false,
    isPercent = false
  }: {
    title: string;
    value: number;
    trend: number;
    icon: any;
    iconBg: string;
    iconColor: string;
    isCurrency?: boolean;
    isPercent?: boolean;
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {isCurrency 
              ? formatCurrency(value)
              : isPercent 
                ? `${value}%`
                : value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 ${iconBg} rounded-full`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend >= 0 ? (
          <TrendingUp className="w-4 h-4 mr-1" />
        ) : (
          <TrendingUp className="w-4 h-4 mr-1 transform rotate-180" />
        )}
        <span>{Math.abs(trend)}% {trend >= 0 ? 'increase' : 'decrease'} vs. previous period</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Value & ROI</h2>
              <p className="text-sm text-gray-500">Operational, financial and reliability KPIs</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <div className="flex rounded-md shadow-sm">
              {['7d', '30d', '90d', 'YTD'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-md bg-white text-gray-400 hover:text-gray-500 hover:bg-gray-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-1.5 rounded-md bg-white text-gray-400 hover:text-gray-500 hover:bg-gray-50" title="Export">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <KPICard
                title="Pickups Avoided"
                value={kpiData.pickupsAvoided.current}
                trend={kpiData.pickupsAvoided.trend}
                icon={TrendingUp}
                iconBg="bg-green-100"
                iconColor="text-green-600"
              />
              <KPICard
                title="Route Miles Reduced"
                value={kpiData.routeMilesReduced.current}
                trend={kpiData.routeMilesReduced.trend}
                icon={Clock}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <KPICard
                title="Fuel/Labor Savings"
                value={kpiData.fuelSavings.current}
                trend={kpiData.fuelSavings.trend}
                icon={DollarSign}
                iconBg="bg-yellow-100"
                iconColor="text-yellow-600"
                isCurrency
              />
              <KPICard
                title="Uptime (SLA)"
                value={kpiData.uptime.current}
                trend={kpiData.uptime.trend}
                icon={Shield}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                isPercent
              />
            </div>

            {/* Main chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                <div className="text-sm text-gray-500">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="h-80">
                {chartData && <Line data={chartData} options={chartOptions} />}
              </div>
            </div>

            {/* Cohorts & WAU/MAU */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Retention Cohorts</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Beta</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cohort</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">D7</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">D30</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">D90</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cohortData.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.cohort}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{row.d7}%</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{row.d30}%</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{row.d90}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">User Engagement</h3>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Weekly Active Users (WAU)</span>
                      <span className="text-sm font-semibold text-blue-600">1,842</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>2,500</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Monthly Active Users (MAU)</span>
                      <span className="text-sm font-semibold text-green-600">4,237</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>5,000</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Stickiness (WAU/MAU): <span className="font-semibold">43.5%</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Value;