import { useState, useEffect, useMemo } from 'react';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
import { useLocale } from '../contexts/LocaleContext';
import {
  ForecastResult,
  MaintenanceInsight,
  forecastDemand,
  generatePrescriptiveAlerts,
  rankUnitsByMaintenance,
} from '../lib/heuristics';
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

interface SmartBookingSuggestion {
  suggestion?: { date: string; utilization: number };
  alternatives?: { date: string; utilization: number }[];
}

interface OrderedStop {
  id: string;
  serialNo?: string;
  legDistanceKm?: number;
}

interface RouteOptimizationResult {
  totalDistanceKm?: number;
  orderedStops?: OrderedStop[];
}

type AnalyticsRange = 'all' | '30' | '60' | '90' | '365';
type UnitStatus = Unit['status'];
type RouteStatus = Route['status'];
type RoutePriority = Route['priority'];

const Dashboard: React.FC = () => {
  const { locale, setLocale, t } = useLocale();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const tabs = useMemo(
    () => [
      { key: 'overview', label: t('dashboard.overviewTab') },
      { key: 'fleet', label: t('dashboard.fleetMap') },
      { key: 'routes', label: t('dashboard.routesTab') },
      { key: 'bookings', label: t('dashboard.bookingsTab') },
      { key: 'maintenance', label: t('dashboard.maintenanceTab') },
      { key: 'analytics', label: t('dashboard.analyticsTab') },
      { key: 'insights', label: t('dashboard.insightsTab') },
      { key: 'payments', label: t('dashboard.paymentsTab') },
      { key: 'settings', label: t('dashboard.settingsTab') },
    ],
    [t]
  );
  const sidebarItems = useMemo(
    () => [
      { id: 'overview', label: t('dashboard.overviewTab'), icon: BarChart3 },
      { id: 'fleet', label: t('dashboard.fleetMap'), icon: MapPin },
      { id: 'routes', label: t('dashboard.routesTab'), icon: Navigation },
      { id: 'bookings', label: t('dashboard.bookingsTab'), icon: Calendar },
      { id: 'maintenance', label: t('dashboard.maintenanceTab'), icon: Wrench },
      { id: 'analytics', label: t('dashboard.analyticsTab'), icon: TrendingUp },
      { id: 'insights', label: t('dashboard.insightsTab'), icon: BarChart3 },
      { id: 'payments', label: t('dashboard.paymentsTab'), icon: CreditCard },
      { id: 'settings', label: t('dashboard.settingsTab'), icon: Settings },
    ],
    [t]
  );

  // Smart Booking state
  const [sbDate, setSbDate] = useState<string>('');
  const [sbUnits, setSbUnits] = useState<number>(3);
  const [sbLocation, setSbLocation] = useState<string>('Nairobi');
  const [sbDuration, setSbDuration] = useState<number>(1);
  const [sbCapacity, setSbCapacity] = useState<number>(80);
  const [sbLoading, setSbLoading] = useState<boolean>(false);
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbSuggestion, setSbSuggestion] = useState<SmartBookingSuggestion | null>(null);
  const [sbAlternatives, setSbAlternatives] = useState<string[] | null>(null);

  const smartSuggest = async () => {
    setSbLoading(true);
    setSbError(null);
    setSbSuggestion(null);
    setSbAlternatives(null);
    try {
      const history = bookings.map(b => ({ date: new Date(b.date).toISOString() }));
      const resp = await apiFetch('/api/ai/smart-booking/suggest', {
        method: 'POST',
        data: {
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
    } catch (error: unknown) {
      setSbError(error instanceof Error ? error.message : 'Failed to get suggestion');
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
  const [formUnitStatus, setFormUnitStatus] = useState<UnitStatus>('active');
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
  const [formRouteStatus, setFormRouteStatus] = useState<RouteStatus>('pending');
  const [formRoutePriority, setFormRoutePriority] = useState<RoutePriority>('medium');
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
  const [optResult, setOptResult] = useState<RouteOptimizationResult | null>(null);

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to optimize routes');
      }
    }
  };

  const applyOptimizedOrder = () => {
    const stops = optResult?.orderedStops;
    if (!stops || stops.length === 0) {
      alert('No optimized order to apply. Please run Optimize Routes first.');
      return;
    }
    const orderIds: string[] = stops.map((s) => s.id);

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

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);
  const [topRisks, setTopRisks] = useState<MaintenanceInsight[]>([]);

  useEffect(() => {
    if (!units.length) return;
    const result = forecastDemand(bookings, 30, 80);
    setForecast(result);
    setAiAlerts(generatePrescriptiveAlerts(units, result));
    setTopRisks(rankUnitsByMaintenance(units).slice(0, 3));
  }, [units, bookings]);

  // Analytics controls
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('all');
  const [analyticsPaidOnly, setAnalyticsPaidOnly] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [formCustomer, setFormCustomer] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDuration, setFormDuration] = useState('1 day');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<Booking['status']>('pending');
  const [formPaymentStatus, setFormPaymentStatus] = useState<Booking['paymentStatus']>('pending');

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
  const [formMemberStatus, setFormMemberStatus] = useState<TeamMember['status']>('active');

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
    if (editingMemberId) {
      setTeamMembers(prev => prev.map(m => m.id === editingMemberId ? {
        ...m,
        name: formMemberName.trim() || m.name,
        role: formMemberRole.trim() || m.role,
        email: formMemberEmail.trim() || m.email,
        phone: formMemberPhone.trim() || m.phone,
        status: formMemberStatus,
      } : m));
    } else {
      const newM: TeamMember = {
        id: String(Date.now()),
        name: formMemberName.trim() || 'New Member',
        role: formMemberRole.trim() || 'Role',
        email: formMemberEmail.trim() || 'email@example.com',
        phone: formMemberPhone.trim() || '+2547...',
        status: formMemberStatus,
        joinDate: new Date().toISOString().slice(0, 10),
      };
      setTeamMembers(prev => [newM, ...prev]);
    }
    setMemberModalOpen(false);
  };

  const deleteMember = (id: string) => {
    if (!confirm('Delete this team member?')) return;
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

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

      {/* AI Insights */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              <p className="text-sm text-gray-500">
                {forecast
                  ? `${forecast?.peakDay} • Avg ${forecast?.avgDailyBookings} bookings/day`
                  : 'No forecast available'}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 rounded-full">
              AI
            </span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {forecast && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase">Avg Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{forecast.avgDailyBookings}</p>
                <p className="text-xs text-gray-400">Over the next 30 days</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase">Capacity Gap</p>
                <p className="text-2xl font-semibold text-gray-900">{forecast.capacityGap} units</p>
                <p className="text-xs text-gray-400">{forecast?.suggestion}</p>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Top Risks</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              {topRisks.length === 0 ? (
                <li className="text-gray-400">No high-risk units right now.</li>
              ) : (
                topRisks.map((item) => (
                  <li key={item.unit.id} className="flex items-center justify-between">
                    <span>{item.unit.serialNo}</span>
                    <span className="text-xs font-semibold text-red-600">{item.risk}%</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">AI Alerts</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              {aiAlerts.length === 0 ? (
                <li className="text-gray-400">No alerts. System operating within thresholds.</li>
              ) : (
                aiAlerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <span>{alert}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Alerts (driven by units state) */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Urgent Alerts</h3>
        </div>
        <div className="p-6 space-y-4">
          {units.filter(u => u.fillLevel > 80 || u.batteryLevel < 20).length === 0 && (
            <p className="text-sm text-gray-500">No urgent alerts</p>
          )}
          {units.map(u => (
            <div key={u.id}>
              {u.fillLevel > 80 && (
                <div className="flex items-center p-4 bg-red-50 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{`Unit ${u.serialNo} requires immediate servicing`}</p>
                    <p className="text-xs text-red-600">{`Fill level: ${u.fillLevel}% | Location: ${u.location}`}</p>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => { openCreateRoute(); if (u.id) setFormUnitId(u.id); setActiveTab('routes'); setUnitModalOpen(false); }}>
                    Assign Route
                  </button>
                </div>
              )}
              {u.batteryLevel < 20 && (
                <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                  <Battery className="w-5 h-5 text-yellow-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">{`Low battery alert for ${u.serialNo}`}</p>
                    <p className="text-xs text-yellow-600">{`Battery level: ${u.batteryLevel}% | Last seen: ${u.lastSeen}`}</p>
                  </div>
                  <button className="text-yellow-600 hover:text-yellow-800 text-sm font-medium" onClick={() => { setFormUnitStatus('maintenance'); openUnitModal(u); }}>
                    Schedule Maintenance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Unit Detail / Actions Modal (rendered within Overview tab) */}
      {unitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">Unit Details</h4>
              <button className="text-gray-500" onClick={() => setUnitModalOpen(false)}>×</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={formUnitStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormUnitStatus(e.target.value as UnitStatus)}>
                    <option value="active">active</option>
                    <option value="maintenance">maintenance</option>
                    <option value="offline">offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={formUnitLocation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUnitLocation(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fill Level (%)</label>
                  <input type="number" min={0} max={100} className="w-full border rounded px-3 py-2 text-sm" value={formUnitFill} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUnitFill(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Battery (%)</label>
                  <input type="number" min={0} max={100} className="w-full border rounded px-3 py-2 text-sm" value={formUnitBattery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUnitBattery(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 text-sm border rounded" onClick={() => { openCreateRoute(); if (activeUnitId) setFormUnitId(activeUnitId); setActiveTab('routes'); setUnitModalOpen(false); }}>
                  Assign Route
                </button>
                <button className="px-3 py-2 text-sm border rounded" onClick={() => setFormUnitStatus('maintenance')}>Mark Maintenance</button>
                <button className="px-3 py-2 text-sm border rounded" onClick={() => setFormUnitStatus('active')}>Mark Active</button>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 text-sm border rounded-md" onClick={() => setUnitModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveUnitChanges}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Status */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Fleet Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {units.map((unit) => (
              <div key={unit.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openUnitModal(unit)}>
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Active Routes</h3>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={openCreateRoute}>
              <Plus className="w-4 h-4 mr-2 inline" />
              New Route
            </button>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{units.find(u => u.id === route.unitId)?.serialNo || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900" onClick={() => openEditRoute(route)}><Eye className="w-4 h-4" /></button>
                    <button className="text-green-600 hover:text-green-900" onClick={() => openEditRoute(route)}><Edit className="w-4 h-4" /></button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => deleteRoute(route.id)}><Trash2 className="w-4 h-4" /></button>
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
              <select className="w-full border border-gray-300 rounded-md px-3 py-2" value={selectedDepot} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepot(e.target.value)}>
                {Object.keys(depots).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
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
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={optimizeRoutes}>
              <Navigation className="w-4 h-4 mr-2 inline" />
              Optimize Routes
            </button>
            {optResult && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={applyOptimizedOrder}>
                Apply Order
              </button>
            )}
          </div>
          {optResult && (
            <div className="mt-4 border rounded p-4">
              <p className="text-sm text-gray-700 mb-2">Total Distance: <span className="font-medium">{optResult.totalDistanceKm} km</span></p>
              <ol className="list-decimal ml-5 space-y-1 text-sm">
                {optResult.orderedStops?.map((s: OrderedStop, idx: number) => (
                  <li key={idx}>{s.serialNo || s.id} • Leg {s.legDistanceKm} km</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {routeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">{editingRouteId ? 'Edit Route' : 'New Route'}</h4>
              <button className="text-gray-500" onClick={() => setRouteModalOpen(false)}>×</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={formTech} onChange={e => setFormTech(e.target.value)}>
                  {teamMembers.map(t => (
                    <option key={t.id} value={t.name}>{t.name} • {t.role}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={1} className="border rounded px-3 py-2 text-sm" placeholder="# Units" value={formRouteUnits} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRouteUnits(Number(e.target.value))} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="ETA (e.g., 2.5 hrs)" value={formEta} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEta(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="border rounded px-3 py-2 text-sm" value={formRouteStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormRouteStatus(e.target.value as RouteStatus)}>
                  <option value="pending">pending</option>
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                </select>
                <select className="border rounded px-3 py-2 text-sm" value={formRoutePriority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormRoutePriority(e.target.value as RoutePriority)}>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Unit</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={formUnitId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormUnitId(e.target.value)}>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.serialNo} • {u.location}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 text-sm border rounded-md" onClick={() => setRouteModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveRoute}>Save</button>
            </div>
          </div>
        </div>
      )}
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
                <input type="text" placeholder="Search bookings..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={openCreateBooking}>
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
                      <button className="text-blue-600 hover:text-blue-900" onClick={() => openEditBooking(booking)}><Eye className="w-4 h-4" /></button>
                      <button className="text-green-600 hover:text-green-900" onClick={() => openEditBooking(booking)}><Edit className="w-4 h-4" /></button>
                      <button className="text-red-600 hover:text-red-900" onClick={() => deleteBooking(booking.id)}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {bookingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">{editingBookingId ? 'Edit Booking' : 'New Booking'}</h4>
                <button className="text-gray-500" onClick={() => setBookingModalOpen(false)}>×</button>
              </div>
              <div className="p-4 space-y-3">
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Customer" value={formCustomer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCustomer(e.target.value)} />
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Unit" value={formUnit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUnit(e.target.value)} />
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={formDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDate(e.target.value)} />
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Duration" value={formDuration} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDuration(e.target.value)} />
                <input type="number" min={0} className="w-full border rounded px-3 py-2 text-sm" placeholder="Amount" value={formAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAmount(Number(e.target.value))} />
                <div className="grid grid-cols-2 gap-3">
                  <select className="border rounded px-3 py-2 text-sm" value={formStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormStatus(e.target.value as Booking['status'])}>
                    <option value="confirmed">confirmed</option>
                    <option value="pending">pending</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <select className="border rounded px-3 py-2 text-sm" value={formPaymentStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormPaymentStatus(e.target.value as Booking['paymentStatus'])}>
                    <option value="paid">paid</option>
                    <option value="pending">pending</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button className="px-4 py-2 text-sm border rounded-md" onClick={() => setBookingModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveBooking}>Save</button>
              </div>
            </div>
          </div>
        )}

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
                  <button
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      if (sbSuggestion?.date) {
                        openCreateBooking();
                        setFormDate(sbSuggestion.date);
                      }
                    }}
                  >
                    Apply to booking form
                  </button>
                </div>
              )}
              {sbAlternatives && sbAlternatives.length > 0 && (
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-500 mb-1">Alternatives</p>
                  <ul className="text-sm list-disc ml-4 space-y-1">
                    {sbAlternatives.map((alt) => (
                      <li key={alt.date} className="flex items-center justify-between">
                        <span>{alt.date} • {Math.round((alt.utilization || 0) * 100)}%</span>
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            openCreateBooking();
                            setFormDate(alt.date);
                          }}
                        >
                          Use
                        </button>
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

  const renderMaintenance = () => <Maintenance />;

  const [fleetFilter, setFleetFilter] = useState<'all' | 'active' | 'maintenance' | 'offline'>('all');

  const renderFleetMap = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Fleet Map</h3>
            <div className="flex items-center space-x-2">
              <select className="px-3 py-2 text-sm border rounded-md" value={fleetFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFleetFilter(e.target.value as 'all' | 'active' | 'maintenance' | 'offline')}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
              <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => { }}>
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg overflow-hidden h-96">
            <MapContainer center={[-1.2921, 36.8219]} zoom={11} scrollWheelZoom className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {(fleetFilter === 'all' ? units : units.filter(u => u.status === fleetFilter)).map(u => (
                <CircleMarker key={u.id} center={[u.coordinates[0], u.coordinates[1]]} radius={8} pathOptions={{ color: u.status === 'active' ? '#22c55e' : u.status === 'maintenance' ? '#eab308' : '#ef4444', fillOpacity: 0.8 }}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-medium">{u.serialNo}</div>
                      <div>{u.location}</div>
                      <div>Fill: {u.fillLevel}% • Battery: {u.batteryLevel}%</div>
                      <div>Status: {u.status}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center cursor-pointer" onClick={() => setFleetFilter('active')} title="Show Active">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Active ({units.filter(u => u.status === 'active').length})</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => setFleetFilter('maintenance')} title="Show Maintenance">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Maintenance ({units.filter(u => u.status === 'maintenance').length})</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => setFleetFilter('offline')} title="Show Offline">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Offline ({units.filter(u => u.status === 'offline').length})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => <Analytics />;

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
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.companyName} onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.contactEmail} onChange={e => setSettings(s => ({ ...s, contactEmail: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} />
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
              <MessageSquare className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
                <p className="text-xs text-gray-500">Receive alerts via WhatsApp</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.whatsappNotifications} onChange={e => setSettings(s => ({ ...s, whatsappNotifications: e.target.checked }))} />
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
              onClick={openAddMember}
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
                        onClick={() => openEditMember(member)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 transition-colors"
                        onClick={() => deleteMember(member.id)}
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
            <select className="border border-gray-300 rounded-md px-3 py-1 text-sm" value={settings.sessionTimeout} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))}>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
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
                  <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormMemberPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={formMemberStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormMemberStatus(e.target.value as TeamMember['status'])}>
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
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-sm text-gray-500">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="locale" className="text-xs text-gray-500">{t('dashboard.localeLabel')}</label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
            <div className="relative">
              <input
                type="text"
                placeholder="Search units, routes, or bookings..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        <nav className="mb-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`${activeTab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} border-b-2 px-3 py-2 text-sm font-medium`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border p-4">
              <ul className="space-y-2">
                {sidebarItems.map((item) => {
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
    </div>
  );
};

export default Dashboard;