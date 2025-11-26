import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../lib/api';
import { useSettings } from '../contexts/SettingsContext';
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
import PaymentsPage from '../Payments';
import Insights from '../Insights';
import Maintenance from './Maintenance';
import Analytics from './Analytics';

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
  unitId?: string; // link to a unit for coordinates
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
  const { settings: globalSettings, updateSettings, addTeamMember, updateTeamMember, deleteTeamMember } = useSettings();
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
      // NEW CODE: Cleaner, using the 'data' parameter
      const resp = await apiFetch('/api/ai/smart-booking/suggest', {
        method: 'POST',
        data: { // This object is automatically stringified and headers are set!
          date: sbDate || undefined,
          location: sbLocation,
          units: sbUnits,
          durationDays: sbDuration,
          capacityPerDay: sbCapacity,
          bookingsHistory: history,
        }
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch { }
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

  const [units, setUnits] = useState<Unit[]>(() => {
    const defaults: Unit[] = [
      { id: '1', serialNo: 'ST-001', location: 'Westlands', fillLevel: 85, batteryLevel: 92, status: 'active', lastSeen: '2 min ago', coordinates: [-1.2641, 36.8078] },
      { id: '2', serialNo: 'ST-002', location: 'CBD', fillLevel: 45, batteryLevel: 78, status: 'active', lastSeen: '5 min ago', coordinates: [-1.2921, 36.8219] },
      { id: '3', serialNo: 'ST-003', location: 'Karen', fillLevel: 92, batteryLevel: 15, status: 'maintenance', lastSeen: '1 hour ago', coordinates: [-1.3197, 36.6859] },
      { id: '4', serialNo: 'ST-004', location: 'Kilimani', fillLevel: 23, batteryLevel: 88, status: 'active', lastSeen: '3 min ago', coordinates: [-1.2906, 36.7820] },
    ];
    try { const s = localStorage.getItem('units'); return s ? JSON.parse(s) : defaults; } catch { return defaults; }
  });
  useEffect(() => {
    try { localStorage.setItem('units', JSON.stringify(units)); } catch { }
  }, [units]);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [formUnitStatus, setFormUnitStatus] = useState<'active' | 'maintenance' | 'offline'>('active');
  const [formUnitFill, setFormUnitFill] = useState<number>(0);
  const [formUnitBattery, setFormUnitBattery] = useState<number>(0);
  const [formUnitLocation, setFormUnitLocation] = useState<string>('');

  const openUnitModal = (u: Unit) => {
    setActiveUnitId(u.id);
    setFormUnitStatus(u.status);
    setFormUnitFill(u.fillLevel);
    setFormUnitBattery(u.batteryLevel);
    setFormUnitLocation(u.location);
    setUnitModalOpen(true);
  };

  const saveUnitChanges = () => {
    if (!activeUnitId) return;
    setUnits(prev => prev.map(u => u.id === activeUnitId ? {
      ...u,
      status: formUnitStatus,
      fillLevel: Math.max(0, Math.min(100, Number(formUnitFill) || 0)),
      batteryLevel: Math.max(0, Math.min(100, Number(formUnitBattery) || 0)),
      location: formUnitLocation.trim() || u.location,
      lastSeen: 'just now',
    } : u));
    setUnitModalOpen(false);
  };

  const [routes, setRoutes] = useState<Route[]>(() => {
    const defaults: Route[] = [
      { id: '1', technician: 'John Kamau', units: 1, status: 'active', estimatedTime: '2.5 hrs', priority: 'high', unitId: '1' },
      { id: '2', technician: 'Mary Wanjiku', units: 1, status: 'pending', estimatedTime: '1.8 hrs', priority: 'medium', unitId: '2' },
      { id: '3', technician: 'Peter Ochieng', units: 1, status: 'completed', estimatedTime: '3.2 hrs', priority: 'low', unitId: '3' },
    ];
    try {
      const s = localStorage.getItem('routes');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('routes', JSON.stringify(routes)); } catch { }
  }, [routes]);

  const [settings, setSettings] = useState<{ companyName: string; contactEmail: string; phone: string; language: string; sessionTimeout: string; emailNotifications: boolean; whatsappNotifications: boolean }>(() => {
    try {
      const s = localStorage.getItem('settings');
      return s ? JSON.parse(s) : { companyName: 'Smart Sanitation Co.', contactEmail: 'admin@smartsanitation.co.ke', phone: '+254 700 000 000', language: 'en', sessionTimeout: '30', emailNotifications: true, whatsappNotifications: true };
    } catch {
      return { companyName: 'Smart Sanitation Co.', contactEmail: 'admin@smartsanitation.co.ke', phone: '+254 700 000 000', language: 'en', sessionTimeout: '30', emailNotifications: true, whatsappNotifications: true };
    }
  });
  useEffect(() => {
    try { localStorage.setItem('settings', JSON.stringify(settings)); } catch { }
  }, [settings]);

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [formTech, setFormTech] = useState('');
  const [formRouteUnits, setFormRouteUnits] = useState<number>(1);
  const [formRouteStatus, setFormRouteStatus] = useState<'pending' | 'active' | 'completed'>('pending');
  const [formRoutePriority, setFormRoutePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formEta, setFormEta] = useState('1.0 hrs');
  const [formUnitId, setFormUnitId] = useState<string>('1');

  const openCreateRoute = () => {
    setEditingRouteId(null);
    setFormTech((() => {
      try { return (teamMembers && teamMembers[0]?.name) || ''; } catch { return ''; }
    })());
    setFormRouteUnits(1);
    setFormRouteStatus('pending');
    setFormRoutePriority('medium');
    setFormEta('1.0 hrs');
    setFormUnitId('1');
    setRouteModalOpen(true);
  };

  const openEditRoute = (r: Route) => {
    setEditingRouteId(r.id);
    setFormTech(r.technician);
    setFormRouteUnits(r.units);
    setFormRouteStatus(r.status);
    setFormRoutePriority(r.priority);
    setFormEta(r.estimatedTime);
    setFormUnitId(r.unitId || '1');
    setRouteModalOpen(true);
  };

  const saveRoute = () => {
    if (editingRouteId) {
      setRoutes(prev => prev.map(r => r.id === editingRouteId ? {
        ...r,
        technician: formTech.trim() || 'Technician',
        units: Number(formRouteUnits) || 1,
        status: formRouteStatus,
        priority: formRoutePriority,
        estimatedTime: formEta,
        unitId: formUnitId,
      } : r));
    } else {
      const newR: Route = {
        id: String(Date.now()),
        technician: formTech.trim() || 'Technician',
        units: Number(formRouteUnits) || 1,
        status: formRouteStatus,
        priority: formRoutePriority,
        estimatedTime: formEta,
        unitId: formUnitId,
      };
      setRoutes(prev => [newR, ...prev]);
    }
    setRouteModalOpen(false);
  };

  const deleteRoute = (id: string) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
  };

  const depots: Record<string, [number, number]> = {
    'Westlands Depot': [-1.2641, 36.8078],
    'CBD Depot': [-1.2921, 36.8219],
    'Karen Depot': [-1.3197, 36.6859],
  };
  const [selectedDepot, setSelectedDepot] = useState<string>('Westlands Depot');
  const [optResult, setOptResult] = useState<any | null>(null);

  const optimizeRoutes = async () => {
    try {
      const depotCoords = depots[selectedDepot];
      const stops = routes
        .filter(r => r.unitId)
        .map(r => {
          const u = units.find(x => x.id === r.unitId);
          return {
            id: r.id,
            serialNo: u?.serialNo || r.unitId,
            coordinates: u?.coordinates || [-1.29, 36.82],
            priority: r.priority,
          };
        });
      const resp = await apiFetch('/api/ai/route-optimize', {
        method: 'POST',
        data: { depot: depotCoords, stops },
      });
      if (!resp.ok) throw new Error('optimize failed');
      const data = await resp.json();
      setOptResult(data);
    } catch (e: any) {
      alert(e?.message || 'Failed to optimize routes');
    }
  };

  const applyOptimizedOrder = () => {
    const stops = optResult?.orderedStops;
    if (!stops || stops.length === 0) {
      alert('No optimized order to apply. Please run Optimize Routes first.');
      return;
    }
    const orderIds: string[] = stops.map((s: any) => s.id);
    setRoutes(prev => {
      const map = new Map(prev.map(r => [r.id, r] as const));
      const ordered = orderIds.map(id => map.get(id)).filter(Boolean) as Route[];
      const rest = prev.filter(r => !orderIds.includes(r.id));
      return [...ordered, ...rest];
    });
    alert('Optimized order applied.');
    setOptResult(null);
  };

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const defaults: Booking[] = [
      { id: '1', customer: 'Safari Construction', unit: 'ST-001', date: '2024-01-15', duration: '3 days', amount: 15000, status: 'confirmed', paymentStatus: 'paid' },
      { id: '2', customer: 'Nairobi Events Co.', unit: 'ST-002', date: '2024-01-16', duration: '1 day', amount: 8000, status: 'pending', paymentStatus: 'pending' },
      { id: '3', customer: 'City Council', unit: 'ST-004', date: '2024-01-17', duration: '7 days', amount: 35000, status: 'confirmed', paymentStatus: 'paid' },
    ];
    try {
      const s = localStorage.getItem('bookings');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('bookings', JSON.stringify(bookings)); } catch { }
  }, [bookings]);

  // Analytics controls
  const [analyticsRange, setAnalyticsRange] = useState('all');
  const [analyticsPaidOnly, setAnalyticsPaidOnly] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [formCustomer, setFormCustomer] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDuration, setFormDuration] = useState('1 day');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'confirmed' | 'pending' | 'cancelled'>('pending');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'pending' | 'failed'>('pending');

  const openCreateBooking = () => {
    setEditingBookingId(null);
    setFormCustomer('');
    setFormUnit('');
    setFormDate('');
    setFormDuration('1 day');
    setFormAmount(0);
    setFormStatus('pending');
    setFormPaymentStatus('pending');
    setBookingModalOpen(true);
  };

  const openEditBooking = (b: Booking) => {
    setEditingBookingId(b.id);
    setFormCustomer(b.customer);
    setFormUnit(b.unit);
    setFormDate(b.date);
    setFormDuration(b.duration);
    setFormAmount(b.amount);
    setFormStatus(b.status);
    setFormPaymentStatus(b.paymentStatus);
    setBookingModalOpen(true);
  };

  const saveBooking = () => {
    if (editingBookingId) {
      setBookings(prev => prev.map(b => b.id === editingBookingId ? {
        ...b,
        customer: formCustomer.trim(),
        unit: formUnit.trim(),
        date: formDate,
        duration: formDuration,
        amount: Number(formAmount) || 0,
        status: formStatus,
        paymentStatus: formPaymentStatus,
      } : b));
    } else {
      const newB: Booking = {
        id: String(Date.now()),
        customer: formCustomer.trim(),
        unit: formUnit.trim(),
        date: formDate,
        duration: formDuration,
        amount: Number(formAmount) || 0,
        status: formStatus,
        paymentStatus: formPaymentStatus,
      };
      setBookings(prev => [newB, ...prev]);
    }
    setBookingModalOpen(false);
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const defaults: TeamMember[] = [
      { id: '1', name: 'John Kamau', role: 'Fleet Manager', email: 'john@company.com', phone: '+254712345678', status: 'active', joinDate: '2023-06-15' },
      { id: '2', name: 'Mary Wanjiku', role: 'Field Technician', email: 'mary@company.com', phone: '+254723456789', status: 'active', joinDate: '2023-08-20' },
      { id: '3', name: 'Peter Ochieng', role: 'Route Coordinator', email: 'peter@company.com', phone: '+254734567890', status: 'active', joinDate: '2023-09-10' },
      { id: '4', name: 'Grace Akinyi', role: 'Customer Support', email: 'grace@company.com', phone: '+254745678901', status: 'inactive', joinDate: '2023-11-05' },
    ];
    try { const s = localStorage.getItem('teamMembers'); return s ? JSON.parse(s) : defaults; } catch { return defaults; }
  });
  useEffect(() => { try { localStorage.setItem('teamMembers', JSON.stringify(teamMembers)); } catch { } }, [teamMembers]);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formMemberName, setFormMemberName] = useState('');
  const [formMemberRole, setFormMemberRole] = useState('');
  const [formMemberEmail, setFormMemberEmail] = useState('');
  const [formMemberPhone, setFormMemberPhone] = useState('');
  const [formMemberStatus, setFormMemberStatus] = useState<'active' | 'inactive'>('active');

  const openAddMember = () => {
    setEditingMemberId(null);
    setFormMemberName('');
    setFormMemberRole('');
    setFormMemberEmail('');
    setFormMemberPhone('');
    setFormMemberStatus('active');
    setMemberModalOpen(true);
  };

  const openEditMember = (m: TeamMember) => {
    setEditingMemberId(m.id);
    setFormMemberName(m.name);
    setFormMemberRole(m.role);
    setFormMemberEmail(m.email);
    setFormMemberPhone(m.phone);
    setFormMemberStatus(m.status);
    setMemberModalOpen(true);
  };

  const saveMember = () => {
    if (!formMemberName || !formMemberRole || !formMemberEmail) return;

    if (editingMemberId) {
      updateTeamMember(editingMemberId, {
        name: formMemberName,
        role: formMemberRole,
        email: formMemberEmail,
        phone: formMemberPhone,
        status: formMemberStatus,
      });
    } else {
      addTeamMember({
        name: formMemberName,
        role: formMemberRole,
        email: formMemberEmail,
        phone: formMemberPhone,
        status: formMemberStatus,
        joinDate: new Date().toISOString().split('T')[0],
      });
    }
    setMemberModalOpen(false);
  };

  const deleteMember = (id: string) => {
    if (confirm('Are you sure you want to delete this member?')) {
      deleteTeamMember(id);
    }
  };

  const FleetMap = () => (
    <div className="h-[600px] rounded-lg overflow-hidden border shadow-sm">
      <MapContainer center={[-1.2921, 36.8219]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {units.map(u => (
          <CircleMarker key={u.id} center={u.coordinates} radius={8} pathOptions={{ color: u.status === 'active' ? 'green' : 'red' }}>
            <Popup>
              <strong>{u.serialNo}</strong><br />
              {u.location}<br />
              Fill: {u.fillLevel}%
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Units</h3>
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{units.length}</p>
          <p className="text-sm text-green-600 mt-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" /> +2 this month
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Active Routes</h3>
            <Navigation className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{routes.filter(r => r.status === 'active').length}</p>
          <p className="text-sm text-gray-500 mt-2">
            {routes.filter(r => r.status === 'pending').length} pending
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Revenue (Mo)</h3>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">KES 450k</p>
          <p className="text-sm text-green-600 mt-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" /> +12% vs last mo
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Maintenance</h3>
            <Wrench className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{units.filter(u => u.status === 'maintenance').length}</p>
          <p className="text-sm text-red-600 mt-2">Requires attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start pb-4 border-b last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Unit ST-00{i} serviced</p>
                  <p className="text-xs text-gray-500">2 hours ago • Westlands</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">API Gateway</p>
                  <p className="text-xs text-green-600">Operational</p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">IoT Network</p>
                  <p className="text-xs text-green-600">Connected</p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoutes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Route Management</h2>
        <div className="flex gap-2">
          <button onClick={optimizeRoutes} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
            <BarChart3 className="w-4 h-4 mr-2" /> Optimize AI
          </button>
          <button onClick={openCreateRoute} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Route
          </button>
        </div>
      </div>

      {optResult && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-purple-900 font-semibold flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" /> AI Optimization Complete
              </h4>
              <p className="text-sm text-purple-700 mt-1">
                Estimated savings: {optResult.savings?.distance}km ({optResult.savings?.fuel} fuel)
              </p>
            </div>
            <button onClick={applyOptimizedOrder} className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
              Apply Order
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routes.map(route => (
              <tr key={route.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3">
                      {route.technician.charAt(0)}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{route.technician}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${route.status === 'active' ? 'bg-green-100 text-green-800' :
                      route.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}`}>
                    {route.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.priority}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.estimatedTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openEditRoute(route)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button onClick={() => deleteRoute(route.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Bookings</h2>
        <button onClick={openCreateBooking} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Booking
        </button>
      </div>

      {/* Smart Suggestion UI */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-900 font-semibold flex items-center mb-3">
          <TrendingUp className="w-4 h-4 mr-2" /> Smart Booking Assistant
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          <input type="date" className="border rounded px-3 py-2 text-sm" value={sbDate} onChange={e => setSbDate(e.target.value)} placeholder="Date" />
          <input type="number" className="border rounded px-3 py-2 text-sm" value={sbUnits} onChange={e => setSbUnits(Number(e.target.value))} placeholder="Units" />
          <select className="border rounded px-3 py-2 text-sm" value={sbLocation} onChange={e => setSbLocation(e.target.value)}>
            <option value="Nairobi">Nairobi</option>
            <option value="Mombasa">Mombasa</option>
            <option value="Kisumu">Kisumu</option>
          </select>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map(b => (
              <tr key={b.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{b.customer}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${b.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={globalSettings.company.companyName}
                      onChange={e => updateSettings({ company: { ...globalSettings.company, companyName: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={globalSettings.company.contactEmail}
                      onChange={e => updateSettings({ company: { ...globalSettings.company, contactEmail: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={globalSettings.company.phone}
                      onChange={e => updateSettings({ company: { ...globalSettings.company, phone: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={globalSettings.company.language}
                      onChange={e => updateSettings({ company: { ...globalSettings.company, language: e.target.value } })}
                    >
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                </div>
              </div>
      </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            <p className="text-sm text-gray-500">Choose how you want to be notified</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive daily summaries and alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={globalSettings.notifications.emailNotifications}
                  onChange={e => updateSettings({ notifications: { ...globalSettings.notifications, emailNotifications: e.target.checked } })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">WhatsApp Alerts</p>
                  <p className="text-xs text-gray-500">Get instant alerts for critical events</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={globalSettings.notifications.whatsappNotifications}
                  onChange={e => updateSettings({ notifications: { ...globalSettings.notifications, whatsappNotifications: e.target.checked } })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
              <p className="text-sm text-gray-500">Manage access and roles</p>
            </div>
            <button onClick={openAddMember} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {globalSettings.teamMembers.map(member => (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-4">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role} • {member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {member.status}
                  </span>
                  <button onClick={() => openEditMember(member)} className="p-1 text-gray-400 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMember(member.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'fleet': return <FleetMap />;
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
        {/* Global modals */}
        {memberModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">{editingMemberId ? 'Edit Member' : 'Add Member'}</h4>
                <button className="text-gray-500" onClick={() => setMemberModalOpen(false)}>×</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberName} onChange={e => setFormMemberName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberRole} onChange={e => setFormMemberRole(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full border rounded px-3 py-2 text-sm" value={formMemberEmail} onChange={e => setFormMemberEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberPhone} onChange={e => setFormMemberPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={formMemberStatus} onChange={e => setFormMemberStatus(e.target.value as any)}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button className="px-4 py-2 text-sm border rounded-md" onClick={() => setMemberModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveMember}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Content area only: top navigation is provided by ProtectedLayout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-end mb-4">
          </div>
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
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
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
      </div >
      );
};

      export default Dashboard;