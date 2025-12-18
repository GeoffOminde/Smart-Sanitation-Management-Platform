import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, Users, Wrench, DollarSign, RefreshCw } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Analytics = () => {
    const { t } = useLocale();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const resp = await apiFetch('/api/analytics/dashboard');
            if (resp.ok) {
                const json = await resp.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally {
            setLoading(false);
            if (isManualRefresh) setRefreshing(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []);

    // Calculate dynamic growth rate
    const calculateGrowthRate = () => {
        if (!data || !data.revenue || !data.revenue.data || data.revenue.data.length < 2) {
            return { rate: 0, isPositive: true };
        }

        const revenueData = data.revenue.data;
        const currentMonth = revenueData[revenueData.length - 1];
        const previousMonth = revenueData[revenueData.length - 2];

        if (previousMonth === 0) {
            return { rate: currentMonth > 0 ? 100 : 0, isPositive: currentMonth > 0 };
        }

        const growth = ((currentMonth - previousMonth) / previousMonth) * 100;
        return { rate: Math.abs(growth), isPositive: growth >= 0 };
    };

    const growthData = data ? calculateGrowthRate() : { rate: 0, isPositive: true };

    if (loading) return <div className="p-8 text-center text-gray-500">{t('analytics.loading')}</div>;
    if (!data) return <div className="p-8 text-center text-red-500">{t('analytics.error')}</div>;

    const revenueChart = {
        labels: data.revenue.labels,
        datasets: [
            {
                label: t('analytics.revenue.title') + ' (KES)',
                data: data.revenue.data,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3,
            },
        ],
    };

    const bookingChart = {
        labels: [t('analytics.label.confirmed'), t('analytics.label.pending'), t('analytics.label.cancelled')],
        datasets: [
            {
                label: t('analytics.bookings.chartTitle'),
                data: [data.bookings.confirmed, data.bookings.pending, data.bookings.cancelled],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const maintenanceChart = {
        labels: [t('analytics.label.completed'), t('analytics.label.pending')],
        datasets: [
            {
                label: t('analytics.tasks.desc'),
                data: [data.maintenance.completed, data.maintenance.pending],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                ],
                borderWidth: 1,
            },
        ],
    };



    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Actions */}
            <div className="flex justify-end">
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-green-100 font-medium text-sm uppercase tracking-wide">{t('analytics.revenue.title')}</p>
                                <h3 className="text-3xl font-extrabold mt-1">KES {data.revenue.data.reduce((a: any, b: any) => a + b, 0).toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-green-100 font-medium">{t('analytics.revenue.desc')}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 font-medium text-sm uppercase tracking-wide">{t('analytics.bookings.title')}</p>
                                <h3 className="text-3xl font-extrabold mt-1">{data.bookings.confirmed + data.bookings.pending + data.bookings.cancelled}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-blue-100 font-medium">{t('analytics.bookings.desc')}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-100 font-medium text-sm uppercase tracking-wide">{t('analytics.tasks.title')}</p>
                                <h3 className="text-3xl font-extrabold mt-1">{data.maintenance.pending}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-orange-100 font-medium">{t('analytics.tasks.desc')}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-purple-100 font-medium text-sm uppercase tracking-wide">{t('analytics.growth.title')}</p>
                                <h3 className="text-3xl font-extrabold mt-1">
                                    {growthData.isPositive ? '+' : '-'}
                                    {growthData.rate.toFixed(1)}%
                                </h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-purple-100 font-medium">{t('analytics.growth.desc')}</p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">{t('analytics.revenue.chartTitle')}</h3>
                        <button className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{t('analytics.revenue.last6Months')}</button>
                    </div>
                    <div className="h-[320px]">
                        <Line
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' as const, labels: { usePointStyle: true, boxWidth: 6 } },
                                    tooltip: {
                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                        padding: 12,
                                        cornerRadius: 8,
                                        displayColors: false
                                    }
                                },
                                scales: {
                                    y: { grid: { color: '#f3f4f6' }, border: { display: false } },
                                    x: { grid: { display: false }, border: { display: false } }
                                }
                            }}
                            data={revenueChart}
                        />
                    </div>
                </div>

                {/* Booking Status */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">{t('analytics.bookings.chartTitle')}</h3>
                        <button className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">{t('analytics.bookings.realTime')}</button>
                    </div>
                    <div className="h-[320px]">
                        <Bar
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' as const, labels: { usePointStyle: true, boxWidth: 6 } }
                                },
                                scales: {
                                    y: { grid: { color: '#f3f4f6' }, border: { display: false } },
                                    x: { grid: { display: false }, border: { display: false } }
                                }
                            }}
                            data={bookingChart}
                        />
                    </div>
                </div>

                {/* Maintenance Overview */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">{t('analytics.maintenance.chartTitle')}</h3>
                    </div>
                    <div className="h-80 w-full max-w-2xl mx-auto">
                        <Doughnut
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'right' as const, labels: { usePointStyle: true, padding: 20, font: { size: 12 } } }
                                }
                            }}
                            data={maintenanceChart}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
