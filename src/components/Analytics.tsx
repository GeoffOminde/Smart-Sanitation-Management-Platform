import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
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
import { TrendingUp, Users, Wrench, DollarSign } from 'lucide-react';

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
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
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
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics data.</div>;

    const revenueChart = {
        labels: data.revenue.labels,
        datasets: [
            {
                label: 'Revenue (KES)',
                data: data.revenue.data,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3,
            },
        ],
    };

    const bookingChart = {
        labels: ['Confirmed', 'Pending', 'Cancelled'],
        datasets: [
            {
                label: '# of Bookings',
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
        labels: ['Completed', 'Pending'],
        datasets: [
            {
                label: 'Maintenance Tasks',
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
            {/* Header / Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-green-100 font-medium text-sm uppercase tracking-wide">Total Revenue</p>
                                <h3 className="text-3xl font-extrabold mt-1">KES {data.revenue.data.reduce((a: any, b: any) => a + b, 0).toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-green-100 font-medium">Net earnings this period</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 font-medium text-sm uppercase tracking-wide">Total Bookings</p>
                                <h3 className="text-3xl font-extrabold mt-1">{data.bookings.confirmed + data.bookings.pending + data.bookings.cancelled}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-blue-100 font-medium">+15% vs last month</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-100 font-medium text-sm uppercase tracking-wide">Pending Tasks</p>
                                <h3 className="text-3xl font-extrabold mt-1">{data.maintenance.pending}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-orange-100 font-medium">Maintenance jobs requiring attention</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-purple-100 font-medium text-sm uppercase tracking-wide">Growth</p>
                                <h3 className="text-3xl font-extrabold mt-1">+12%</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-purple-100 font-medium">Year-over-Year growth</p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                        <button className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">Last 6 Months</button>
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
                        <h3 className="text-lg font-bold text-gray-900">Booking Status</h3>
                        <button className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">Real-time</button>
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
                        <h3 className="text-lg font-bold text-gray-900">Maintenance Distribution</h3>
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
