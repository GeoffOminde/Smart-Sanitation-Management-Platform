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
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Advanced Analytics</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border flex items-center">
                    <div className="p-3 bg-green-100 rounded-full mr-4">
                        <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-xl font-bold">KES {data.revenue.data.reduce((a: any, b: any) => a + b, 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full mr-4">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Bookings</p>
                        <p className="text-xl font-bold">{data.bookings.confirmed + data.bookings.pending + data.bookings.cancelled}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border flex items-center">
                    <div className="p-3 bg-orange-100 rounded-full mr-4">
                        <Wrench className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Pending Maintenance</p>
                        <p className="text-xl font-bold">{data.maintenance.pending}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border flex items-center">
                    <div className="p-3 bg-purple-100 rounded-full mr-4">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Growth</p>
                        <p className="text-xl font-bold">+12%</p>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                    <Line options={{ responsive: true, plugins: { legend: { position: 'top' as const } } }} data={revenueChart} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">Booking Status</h3>
                    <Bar options={{ responsive: true, plugins: { legend: { position: 'top' as const } } }} data={bookingChart} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">Maintenance Overview</h3>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={maintenanceChart} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
