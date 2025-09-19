import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  MapPin, 
  Truck, 
  Calendar, 
  Settings, 
  AlertTriangle, 
  Battery, 
  Users, 
  DollarSign,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Navigation,
  Phone,
  Mail,
  Wrench,
  BarChart3,
  CreditCard,
  MessageSquare,
  Shield,
  Globe
} from 'lucide-react';
import { Bell } from 'lucide-react';
import PaymentsPage from '../Payments';
import Insights from '../Insights';

interface Unit {
  id: string;
  serialNo: string;
  location: string;
  fillLevel: number;
  batteryLevel: number;
  status: 'active' | 'maintenance' | 'offline';
  lastSeen: string;
  coordinates: [number, number];
}

interface Route {
  id: string;
  technician: string;
  units: number;
  status: 'pending' | 'active' | 'completed';
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
}

interface Booking {
  id: string;
  customer: string;
  unit: string;
  date: string;
  duration: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Smart Booking state
  const [sbDate, setSbDate] = useState<string>('');
  const [sbUnits, setSbUnits] = useState<number>(3);
  const [sbLocation, setSbLocation] = useState<string>('Nairobi');
  const [sbDuration, setSbDuration] = useState<number>(1);
  const [sbCapacity, setSbCapacity] = useState<number>(80);
  const [sbLoading, setSbLoading] = useState<boolean>(false);
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbSuggestion, setSbSuggestion] = useState<any | null>(null);
  const [sbAlternatives, setSbAlternatives] = useState<any[] | null>(null);

  const smartSuggest = async () => {
    setSbLoading(true);
    setSbError(null);
    setSbSuggestion(null);
    setSbAlternatives(null);
    try {
      const history = bookings.map(b => ({ date: new Date(b.date).toISOString() }));
      const resp = await apiFetch('/api/ai/smart-booking/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: sbDate || undefined,
          location: sbLocation,
          units: sbUnits,
          durationDays: sbDuration,
          capacityPerDay: sbCapacity,
          bookingsHistory: history,
        })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Smart suggestion failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setSbSuggestion(data?.suggestion || null);
      setSbAlternatives(data?.alternatives || null);
    } catch (e: any) {
      setSbError(e?.message || 'Failed to get suggestion');
    } finally {
      setSbLoading(false);
    }
  };

  // Prescriptive recommendation (demand forecast)
  const [recText, setRecText] = useState<string | null>(null);
  const [recVisible, setRecVisible] = useState(true);

  useEffect(() => {
    const loadRecommendation = async () => {
      try {
        // Use existing bookings array (below) to build simple history
        const history = bookings.map(b => ({ date: new Date(b.date).toISOString() }));
        const resp = await apiFetch('/api/ai/forecast-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookings: history, horizonDays: 30, capacityPerDay: 80 })
        });
        if (!resp.ok) throw new Error('forecast not ok');
        const data = await resp.json();
        if (data?.recommendation) setRecText(String(data.recommendation));
      } catch {
        // ignore if endpoint not available; keep alert hidden
      }
    };
    loadRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mock data
  const units: Unit[] = [
    { id: '1', serialNo: 'ST-001', location: 'Westlands', fillLevel: 85, batteryLevel: 92, status: 'active', lastSeen: '2 min ago', coordinates: [-1.2641, 36.8078] },
    { id: '2', serialNo: 'ST-002', location: 'CBD', fillLevel: 45, batteryLevel: 78, status: 'active', lastSeen: '5 min ago', coordinates: [-1.2921, 36.8219] },
    { id: '3', serialNo: 'ST-003', location: 'Karen', fillLevel: 92, batteryLevel: 15, status: 'maintenance', lastSeen: '1 hour ago', coordinates: [-1.3197, 36.6859] },
    { id: '4', serialNo: 'ST-004', location: 'Kilimani', fillLevel: 23, batteryLevel: 88, status: 'active', lastSeen: '3 min ago', coordinates: [-1.2906, 36.7820] },
  ];

  const routes: Route[] = [
    { id: '1', technician: 'John Kamau', units: 5, status: 'active', estimatedTime: '2.5 hrs', priority: 'high' },
    { id: '2', technician: 'Mary Wanjiku', units: 3, status: 'pending', estimatedTime: '1.8 hrs', priority: 'medium' },
    { id: '3', technician: 'Peter Ochieng', units: 4, status: 'completed', estimatedTime: '3.2 hrs', priority: 'low' },
  ];

  const bookings: Booking[] = [
    { id: '1', customer: 'Safari Construction', unit: 'ST-001', date: '2024-01-15', duration: '3 days', amount: 15000, status: 'confirmed', paymentStatus: 'paid' },
    { id: '2', customer: 'Nairobi Events Co.', unit: 'ST-002', date: '2024-01-16', duration: '1 day', amount: 8000, status: 'pending', paymentStatus: 'pending' },
    { id: '3', customer: 'City Council', unit: 'ST-004', date: '2024-01-17', duration: '7 days', amount: 35000, status: 'confirmed', paymentStatus: 'paid' },
  ];

  const teamMembers: TeamMember[] = [
    { id: '1', name: 'John Kamau', role: 'Fleet Manager', email: 'john@company.com', phone: '+254712345678', status: 'active', joinDate: '2023-06-15' },
    { id: '2', name: 'Mary Wanjiku', role: 'Field Technician', email: 'mary@company.com', phone: '+254723456789', status: 'active', joinDate: '2023-08-20' },
    { id: '3', name: 'Peter Ochieng', role: 'Route Coordinator', email: 'peter@company.com', phone: '+254734567890', status: 'active', joinDate: '2023-09-10' },
    { id: '4', name: 'Grace Akinyi', role: 'Customer Support', email: 'grace@company.com', phone: '+254745678901', status: 'inactive', joinDate: '2023-11-05' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'confirmed': case 'paid': return 'text-green-600 bg-green-100';
      case 'maintenance': case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'offline': case 'cancelled': case 'failed': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {recText && recVisible && (
        <div className="flex items-start justify-between p-4 border rounded-lg bg-yellow-50">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-700 mr-3 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Prescriptive Insight:</span> {recText}
              </p>
            </div>
          </div>
          <button className="text-yellow-700 text-sm" onClick={() => setRecVisible(false)}>Dismiss</button>
        </div>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{units.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600">+2</span> from last month
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Routes</p>
              <p className="text-2xl font-bold text-gray-900">{routes.filter(r => r.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Navigation className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600">+1</span> from yesterday
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">KSh 58,000</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              {/* Payments pending badge */}
              {bookings.filter(b => b.paymentStatus === 'pending').length > 0 && (
                <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {bookings.filter(b => b.paymentStatus === 'pending').length} Pending
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600">+12%</span> from yesterday
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className="text-2xl font-bold text-gray-900">87%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600">+5%</span> from last week
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Urgent Alerts</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Unit ST-003 requires immediate servicing</p>
              <p className="text-xs text-red-600">Fill level: 92% | Location: Karen</p>
            </div>
            <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => alert('Assign Route to technician for Unit ST-003')}>
              Assign Route
            </button>
          </div>
          
          <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
            <Battery className="w-5 h-5 text-yellow-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Low battery alert for Unit ST-003</p>
              <p className="text-xs text-yellow-600">Battery level: 15% | Last seen: 1 hour ago</p>
            </div>
            <button className="text-yellow-600 hover:text-yellow-800 text-sm font-medium" onClick={() => alert('Schedule maintenance for Unit ST-003')}>
              Schedule Maintenance
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Status */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Fleet Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {units.map((unit) => (
              <div key={unit.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{unit.serialNo}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                    {unit.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{unit.location}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Fill Level:</span>
                    <span className={`font-medium ${unit.fillLevel > 80 ? 'text-red-600' : unit.fillLevel > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {unit.fillLevel}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Battery:</span>
                    <span className={`font-medium ${unit.batteryLevel < 20 ? 'text-red-600' : unit.batteryLevel < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {unit.batteryLevel}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Last seen: {unit.lastSeen}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoutes = () => (
    <div className="space-y-6">
      {/* Active Routes */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Active Routes</h3>
        </div>
        <div className="overflow-x-auto p-6 pt-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route.technician}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.units}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>{route.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.estimatedTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(route.priority)}`}>{route.priority}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900" onClick={() => alert('View route details')}><Eye className="w-4 h-4" /></button>
                    <button className="text-green-600 hover:text-green-900" onClick={() => alert('Edit route')}><Edit className="w-4 h-4" /></button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => alert('Delete route')}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route Optimizer */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Route Optimizer</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Depot Location</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Westlands Depot</option>
                <option>CBD Depot</option>
                <option>Karen Depot</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Fill Level Priority</option>
                <option>Distance Priority</option>
                <option>Customer Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Window</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Morning (6AM - 12PM)</option>
                <option>Afternoon (12PM - 6PM)</option>
                <option>Full Day (6AM - 6PM)</option>
              </select>
            </div>
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={() => alert('Routes optimized!')}>
            <Navigation className="w-4 h-4 mr-2 inline" />
            Optimize Routes
          </button>
        </div>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Bookings Management</h3>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search bookings..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => alert('Create new booking')}>
                <Plus className="w-4 h-4 mr-2 inline" />
                New Booking
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings
                .filter(b => b.customer.toLowerCase().includes(searchTerm.toLowerCase()) || b.unit.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {booking.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>{booking.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.paymentStatus)}`}>{booking.paymentStatus}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900" onClick={() => alert('View booking details')}><Eye className="w-4 h-4" /></button>
                      <button className="text-green-600 hover:text-green-900" onClick={() => alert('Edit booking')}><Edit className="w-4 h-4" /></button>
                      <button className="text-red-600 hover:text-red-900" onClick={() => alert('Delete booking')}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Smart Booking */}
        <div className="p-6 border-t space-y-4">
          <h4 className="text-md font-semibold text-gray-900">Smart Booking</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input type="date" className="border rounded px-3 py-2 text-sm" value={sbDate} onChange={(e) => setSbDate(e.target.value)} />
            <input type="text" className="border rounded px-3 py-2 text-sm" value={sbLocation} onChange={(e) => setSbLocation(e.target.value)} placeholder="Location" />
            <input type="number" min={1} className="border rounded px-3 py-2 text-sm" value={sbUnits} onChange={(e) => setSbUnits(Number(e.target.value))} placeholder="# Units" />
            <input type="number" min={1} className="border rounded px-3 py-2 text-sm" value={sbDuration} onChange={(e) => setSbDuration(Number(e.target.value))} placeholder="Duration (days)" />
            <div className="flex items-center gap-2">
              <input type="number" min={0} className="border rounded px-3 py-2 text-sm w-full" value={sbCapacity} onChange={(e) => setSbCapacity(Number(e.target.value))} placeholder="Capacity/day" />
              <button onClick={smartSuggest} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" disabled={sbLoading}>{sbLoading ? 'Suggesting...' : 'Smart Suggest'}</button>
            </div>
          </div>

          {sbError && <div className="text-red-600 text-sm">{sbError}</div>}

          {(sbSuggestion || (sbAlternatives && sbAlternatives.length)) && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sbSuggestion && (
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-500 mb-1">Suggested</p>
                  <p className="text-gray-900 font-medium">{sbSuggestion.date}</p>
                  <p className="text-xs text-gray-600">Utilization: {Math.round((sbSuggestion.utilization || 0) * 100)}%</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-800" onClick={() => { if (sbSuggestion?.date) setSbDate(sbSuggestion.date); }}>Apply to booking form</button>
                </div>
              )}
              {sbAlternatives && sbAlternatives.length > 0 && (
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-500 mb-1">Alternatives</p>
                  <ul className="text-sm list-disc ml-4 space-y-1">
                    {sbAlternatives.map((alt) => (
                      <li key={alt.date} className="flex items-center justify-between">
                        <span>{alt.date} • {Math.round((alt.utilization || 0) * 100)}%</span>
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => setSbDate(alt.date)}>Use</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Scheduled</h4>
              <p className="text-sm text-gray-700">3 jobs scheduled this week</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Completed</h4>
              <p className="text-sm text-gray-700">5 jobs completed</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Critical</h4>
              <p className="text-sm text-gray-700">1 unit needs urgent service</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFleetMap = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Fleet Map</h3>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50" onClick={() => alert('Filter map view')}>
                <Filter className="w-4 h-4 mr-1 inline" />
                Filter
              </button>
              <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => alert('Map refreshed!')}>
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Map placeholder */}
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center relative">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Interactive Map View</p>
              <p className="text-sm text-gray-400">Showing {units.length} units across Nairobi</p>
            </div>
            
            {/* Map markers simulation */}
            <div className="absolute top-20 left-32 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="absolute top-32 right-40 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="absolute bottom-24 left-24 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="absolute bottom-32 right-32 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
          </div>
          
          {/* Map Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Active ({units.filter(u => u.status === 'active').length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Maintenance ({units.filter(u => u.status === 'maintenance').length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Offline ({units.filter(u => u.status === 'offline').length})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">KSh 1.2M</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">+15% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">82%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">+8% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">+22% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">4.8/5</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">+0.3 from last month</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          </div>
          <div className="p-6">
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Revenue Chart</p>
                <p className="text-sm text-gray-400">Last 12 months</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Utilization by Location</h3>
          </div>
          <div className="p-6">
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Location Analytics</p>
                <p className="text-sm text-gray-400">Utilization by area</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Company Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Company Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="Smart Sanitation Co." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="admin@smartsanitation.co.ke" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="+254 700 123 456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="BL-2023-001234" />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive alerts via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
                <p className="text-xs text-gray-500">Receive alerts via WhatsApp</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* API Integrations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">API Integrations</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">M-Pesa Integration</p>
                <p className="text-xs text-gray-500">Connected • Last sync: 2 hours ago</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp Business API</p>
                <p className="text-xs text-gray-500">Connected • Last sync: 1 hour ago</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Google Maps API</p>
                <p className="text-xs text-gray-500">Not configured</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700" onClick={() => alert('Configure Google Maps API')}>
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => console.log('Add team member clicked')}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Member
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers
              .filter(member => 
                member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((member) => (
                <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">{member.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{member.role}</p>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="w-3 h-3 mr-1" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Phone className="w-3 h-3 mr-1" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>Joined {member.joinDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={() => console.log('View member:', member.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-800 transition-colors"
                        onClick={() => console.log('Edit member:', member.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 transition-colors"
                        onClick={() => console.log('Delete member:', member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          
          {teamMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No team members found</p>
              <p className="text-sm text-gray-400">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Add an extra layer of security</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700" onClick={() => alert('Enable Two-Factor Authentication')}>
              Enable
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Session Timeout</p>
                <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
              </div>
            </div>
            <select className="border border-gray-300 rounded-md px-3 py-1 text-sm">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>2 hours</option>
              <option>4 hours</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'fleet': return renderFleetMap();
      case 'routes': return renderRoutes();
      case 'payments': return <PaymentsPage />;
      case 'insights': return <Insights />;
      case 'bookings': return renderBookings();
      case 'maintenance': return renderMaintenance();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content area only: top navigation is provided by ProtectedLayout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border p-4">
              <ul className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'fleet', label: 'Fleet Map', icon: MapPin },
                  { id: 'routes', label: 'Routes', icon: Navigation },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'insights', label: 'Insights', icon: BarChart3 },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;