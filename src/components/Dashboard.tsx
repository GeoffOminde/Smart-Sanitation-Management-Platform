// src/components/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../lib/api';
import { useSettings } from '../contexts/SettingsContext';
import { useLocale } from '../contexts/LocaleContext';
import {
  MapPin,
  Truck,
  Calendar,
  Settings,
  AlertTriangle,
  Battery,
  DollarSign,
  TrendingUp,
  Clock,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  Navigation,
  Wrench,
  BarChart3,
  CreditCard,
  MessageSquare,
  Globe,
} from 'lucide-react';
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

/**
 * This Dashboard.tsx is a consolidated, lint-cleaned component reconstructed
 * from the fragments you uploaded. It assumes the listed imported modules exist
 * in your project (Payments, Insights, heuristics, api, contexts).
 */

/* -------------------------- Types & Helpers --------------------------- */

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
  unitId?: string;
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
  date: string;
  utilization: number;
}

interface OrderedStop {
  id: string;
  serialNo?: string;
  legDistanceKm?: number;
}

interface RouteOptimizationResult {
  totalDistanceKm?: number;
  orderedStops?: OrderedStop[];
  savings?: { distance?: number; fuel?: string | number };
}

type AnalyticsRange = 'all' | '30' | '60' | '90' | '365';
type UnitStatus = Unit['status'];
type RouteStatus = Route['status'];
type RoutePriority = Route['priority'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'offline':
      return 'bg-gray-100 text-gray-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getBookingStatusColor = (s: Booking['status'] | Booking['paymentStatus']) => {
  switch (s) {
    case 'confirmed':
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/* -------------------------- Main Component --------------------------- */

const Dashboard: React.FC = () => {
  // contexts
  const { locale, setLocale, t } = useLocale();
  const { settings: globalSettings } = useSettings();

  // layout
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const tabs = useMemo(
    () => [
      { key: 'overview', label: t('dashboard.overviewTab') || 'Overview' },
      { key: 'fleet', label: t('dashboard.fleetMap') || 'Fleet Map' },
      { key: 'routes', label: t('dashboard.routesTab') || 'Routes' },
      { key: 'bookings', label: t('dashboard.bookingsTab') || 'Bookings' },
      { key: 'maintenance', label: t('dashboard.maintenanceTab') || 'Maintenance' },
      { key: 'analytics', label: t('dashboard.analyticsTab') || 'Analytics' },
      { key: 'insights', label: t('dashboard.insightsTab') || 'Insights' },
      { key: 'payments', label: t('dashboard.paymentsTab') || 'Payments' },
      { key: 'settings', label: t('dashboard.settingsTab') || 'Settings' },
    ],
    [t],
  );

  const sidebarItems = useMemo(
    () => [
      { id: 'overview', label: t('dashboard.overviewTab') || 'Overview', icon: BarChart3 },
      { id: 'fleet', label: t('dashboard.fleetMap') || 'Fleet Map', icon: MapPin },
      { id: 'routes', label: t('dashboard.routesTab') || 'Routes', icon: Navigation },
      { id: 'bookings', label: t('dashboard.bookingsTab') || 'Bookings', icon: Calendar },
      { id: 'maintenance', label: t('dashboard.maintenanceTab') || 'Maintenance', icon: Wrench },
      { id: 'analytics', label: t('dashboard.analyticsTab') || 'Analytics', icon: TrendingUp },
      { id: 'insights', label: t('dashboard.insightsTab') || 'Insights', icon: BarChart3 },
      { id: 'payments', label: t('dashboard.paymentsTab') || 'Payments', icon: CreditCard },
      { id: 'settings', label: t('dashboard.settingsTab') || 'Settings', icon: Settings },
    ],
    [t],
  );

  /* -------------------------- Smart Booking -------------------------- */
  const [sbDate, setSbDate] = useState<string>('');
  const [sbUnits, setSbUnits] = useState<number>(3);
  const [sbLocation, setSbLocation] = useState<string>('Nairobi');
  const [sbDuration, setSbDuration] = useState<number>(1);
  const [sbCapacity, setSbCapacity] = useState<number>(80);
  const [sbLoading, setSbLoading] = useState<boolean>(false);
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbSuggestion, setSbSuggestion] = useState<SmartBookingSuggestion | null>(null);
  const [sbAlternatives, setSbAlternatives] = useState<SmartBookingSuggestion[] | null>(null);

  const smartSuggest = async () => {
    setSbLoading(true);
    setSbError(null);
    setSbSuggestion(null);
    setSbAlternatives(null);
    try {
      const history = bookings.map((b) => ({ date: new Date(b.date).toISOString() }));
      const resp = await apiFetch('/api/ai/smart-booking/suggest', {
        method: 'POST',
        data: {
          date: sbDate || undefined,
          location: sbLocation,
          units: sbUnits,
          durationDays: sbDuration,
          capacityPerDay: sbCapacity,
          bookingsHistory: history,
        },
      });

      if (!resp.ok) {
        let detail = '';
        try {
          const j = await resp.json();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          detail = j?.error || JSON.stringify(j);
        } catch {
          // ignore
        }
        throw new Error(`Smart suggestion failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }

      const data = await resp.json();
      setSbSuggestion(data?.suggestion || null);
      setSbAlternatives(data?.alternatives || null);
    } catch (err: unknown) {
      setSbError(err instanceof Error ? err.message : 'Failed to get suggestion');
    } finally {
      setSbLoading(false);
    }
  };

  /* -------------------------- Sample persistent state -------------------------- */
  const [units, setUnits] = useState<Unit[]>(() => {
    const defaults: Unit[] = [
      {
        id: '1',
        serialNo: 'ST-001',
        location: 'Westlands',
        fillLevel: 85,
        batteryLevel: 92,
        status: 'active',
        lastSeen: '2 min ago',
        coordinates: [-1.2641, 36.8078],
      },
      {
        id: '2',
        serialNo: 'ST-002',
        location: 'CBD',
        fillLevel: 45,
        batteryLevel: 78,
        status: 'active',
        lastSeen: '5 min ago',
        coordinates: [-1.2921, 36.8219],
      },
      {
        id: '3',
        serialNo: 'ST-003',
        location: 'Karen',
        fillLevel: 92,
        batteryLevel: 15,
        status: 'maintenance',
        lastSeen: '1 hour ago',
        coordinates: [-1.3197, 36.6859],
      },
      {
        id: '4',
        serialNo: 'ST-004',
        location: 'Kilimani',
        fillLevel: 23,
        batteryLevel: 88,
        status: 'active',
        lastSeen: '3 min ago',
        coordinates: [-1.2906, 36.782],
      },
    ];
    try {
      const s = localStorage.getItem('units');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('units', JSON.stringify(units));
    } catch {
      // ignore
    }
  }, [units]);

  const [routes, setRoutes] = useState<Route[]>(() => {
    const defaults: Route[] = [
      {
        id: '1',
        technician: 'John Kamau',
        units: 1,
        status: 'active',
        estimatedTime: '2.5 hrs',
        priority: 'high',
        unitId: '1',
      },
      {
        id: '2',
        technician: 'Mary Wanjiku',
        units: 1,
        status: 'pending',
        estimatedTime: '1.8 hrs',
        priority: 'medium',
        unitId: '2',
      },
      {
        id: '3',
        technician: 'Peter Ochieng',
        units: 1,
        status: 'completed',
        estimatedTime: '3.2 hrs',
        priority: 'low',
        unitId: '3',
      },
    ];
    try {
      const s = localStorage.getItem('routes');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('routes', JSON.stringify(routes));
    } catch {
      // ignore
    }
  }, [routes]);

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const defaults: Booking[] = [
      {
        id: '1',
        customer: 'Safari Construction',
        unit: 'ST-001',
        date: '2024-01-15',
        duration: '3 days',
        amount: 15000,
        status: 'confirmed',
        paymentStatus: 'paid',
      },
      {
        id: '2',
        customer: 'Nairobi Events Co.',
        unit: 'ST-002',
        date: '2024-01-16',
        duration: '1 day',
        amount: 8000,
        status: 'pending',
        paymentStatus: 'pending',
      },
      {
        id: '3',
        customer: 'City Council',
        unit: 'ST-004',
        date: '2024-01-17',
        duration: '7 days',
        amount: 35000,
        status: 'confirmed',
        paymentStatus: 'paid',
      },
    ];
    try {
      const s = localStorage.getItem('bookings');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('bookings', JSON.stringify(bookings));
    } catch {
      // ignore
    }
  }, [bookings]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const defaults: TeamMember[] = [
      {
        id: '1',
        name: 'John Kamau',
        role: 'Fleet Manager',
        email: 'john@company.com',
        phone: '+254712345678',
        status: 'active',
        joinDate: '2023-06-15',
      },
      {
        id: '2',
        name: 'Mary Wanjiku',
        role: 'Field Technician',
        email: 'mary@company.com',
        phone: '+254723456789',
        status: 'active',
        joinDate: '2023-08-20',
      },
      {
        id: '3',
        name: 'Peter Ochieng',
        role: 'Route Coordinator',
        email: 'peter@company.com',
        phone: '+254734567890',
        status: 'active',
        joinDate: '2023-09-10',
      },
      {
        id: '4',
        name: 'Grace Akinyi',
        role: 'Customer Support',
        email: 'grace@company.com',
        phone: '+254745678901',
        status: 'inactive',
        joinDate: '2023-11-05',
      },
    ];
    try {
      const s = localStorage.getItem('teamMembers');
      return s ? JSON.parse(s) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    } catch {
      // ignore
    }
  }, [teamMembers]);

  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('settings');
      return s
        ? JSON.parse(s)
        : {
          companyName: 'Smart Sanitation Co.',
          contactEmail: 'admin@smartsanitation.co.ke',
          phone: '+254 700 000 000',
          language: 'en',
          sessionTimeout: '30',
          emailNotifications: true,
          whatsappNotifications: true,
        };
    } catch {
      return {
        companyName: 'Smart Sanitation Co.',
        contactEmail: 'admin@smartsanitation.co.ke',
        phone: '+254 700 000 000',
        language: 'en',
        sessionTimeout: '30',
        emailNotifications: true,
        whatsappNotifications: true,
      };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  /* -------------------------- UI Modals & Forms -------------------------- */
  const [unitModalOpen, setUnitModalOpen] = useState<boolean>(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [formUnitStatus, setFormUnitStatus] = useState<UnitStatus>('active');
  const [formUnitFill, setFormUnitFill] = useState<number>(0);
  const [formUnitBattery, setFormUnitBattery] = useState<number>(0);
  const [formUnitLocation, setFormUnitLocation] = useState<string>('');

  const [routeModalOpen, setRouteModalOpen] = useState<boolean>(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [formTech, setFormTech] = useState<string>('');
  const [formRouteUnits, setFormRouteUnits] = useState<number>(1);
  const [formRouteStatus, setFormRouteStatus] = useState<RouteStatus>('pending');
  const [formRoutePriority, setFormRoutePriority] = useState<RoutePriority>('medium');
  const [formEta, setFormEta] = useState<string>('1.0 hrs');
  const [formUnitId, setFormUnitId] = useState<string>(units[0]?.id || '1');

  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formDuration, setFormDuration] = useState<string>('1 day');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<Booking['status']>('pending');
  const [formPaymentStatus, setFormPaymentStatus] = useState<Booking['paymentStatus']>('pending');

  const [memberModalOpen, setMemberModalOpen] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formMemberName, setFormMemberName] = useState<string>('');
  const [formMemberRole, setFormMemberRole] = useState<string>('');
  const [formMemberEmail, setFormMemberEmail] = useState<string>('');
  const [formMemberPhone, setFormMemberPhone] = useState<string>('');
  const [formMemberStatus, setFormMemberStatus] = useState<TeamMember['status']>('active');

  /* -------------------------- Route optimization -------------------------- */
  const depots: Record<string, [number, number]> = {
    'Westlands Depot': [-1.2641, 36.8078],
    'CBD Depot': [-1.2921, 36.8219],
    'Karen Depot': [-1.3197, 36.6859],
  };
  const [selectedDepot, setSelectedDepot] = useState<string>('Westlands Depot');
  const [optResult, setOptResult] = useState<RouteOptimizationResult | null>(null);

  /* -------------------------- AI derived data -------------------------- */
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);
  const [topRisks, setTopRisks] = useState<MaintenanceInsight[]>([]);

  /* -------------------------- Analytics controls -------------------------- */
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('all');
  const [analyticsPaidOnly, setAnalyticsPaidOnly] = useState<boolean>(false);

  /* -------------------------- Effects -------------------------- */
  useEffect(() => {
    if (!units.length) return;
    try {
      const result = forecastDemand(bookings, 30, sbCapacity);
      setForecast(result);
      setAiAlerts(generatePrescriptiveAlerts(units, result));
      setTopRisks(rankUnitsByMaintenance(units).slice(0, 3));
    } catch {
      // ignore if heuristics not available or fail
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, bookings, sbCapacity]);

  useEffect(() => {
    const loadRecommendation = async () => {
      try {
        const history = bookings.map((b) => ({ date: new Date(b.date).toISOString() }));
        const resp = await apiFetch('/api/ai/forecast-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookings: history, horizonDays: 30, capacityPerDay: sbCapacity }),
        });
        if (!resp.ok) return;
        const data = await resp.json();
        // optional future use
        // if (data?.recommendation) setRecText(String(data.recommendation));
      } catch {
        // ignore
      }
    };
    loadRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  /* -------------------------- Unit modal helpers -------------------------- */
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
    setUnits((prev) =>
      prev.map((u) =>
        u.id === activeUnitId
          ? {
            ...u,
            status: formUnitStatus,
            fillLevel: Math.max(0, Math.min(100, Number(formUnitFill) || 0)),
            batteryLevel: Math.max(0, Math.min(100, Number(formUnitBattery) || 0)),
            location: formUnitLocation.trim() || u.location,
            lastSeen: 'just now',
          }
          : u,
      ),
    );
    setUnitModalOpen(false);
  };

  /* -------------------------- Routes CRUD -------------------------- */
  const openCreateRoute = () => {
    setEditingRouteId(null);
    setFormTech(teamMembers[0]?.name || 'Technician');
    setFormRouteUnits(1);
    setFormRouteStatus('pending');
    setFormRoutePriority('medium');
    setFormEta('1.0 hrs');
    setFormUnitId(units[0]?.id || '1');
    setRouteModalOpen(true);
  };

  const openEditRoute = (r: Route) => {
    setEditingRouteId(r.id);
    setFormTech(r.technician);
    setFormRouteUnits(r.units);
    setFormRouteStatus(r.status);
    setFormRoutePriority(r.priority);
    setFormEta(r.estimatedTime);
    setFormUnitId(r.unitId || (units[0]?.id || '1'));
    setRouteModalOpen(true);
  };

  const saveRoute = () => {
    if (editingRouteId) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === editingRouteId
            ? {
              ...r,
              technician: formTech.trim() || 'Technician',
              units: Number(formRouteUnits) || 1,
              status: formRouteStatus,
              priority: formRoutePriority,
              estimatedTime: formEta,
              unitId: formUnitId,
            }
            : r,
        ),
      );
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
      setRoutes((prev) => [newR, ...prev]);
    }
    setRouteModalOpen(false);
  };

  const deleteRoute = (id: string) => setRoutes((prev) => prev.filter((r) => r.id !== id));

  /* -------------------------- Route optimization -------------------------- */
  const optimizeRoutes = async () => {
    try {
      const depotCoords = depots[selectedDepot];
      const stops = routes
        .filter((r) => r.unitId)
        .map((r) => {
          const u = units.find((x) => x.id === r.unitId);
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
    } catch (err: unknown) {
      // minimal surfacing — better error UI can be added
      if (err instanceof Error) {
        // eslint-disable-next-line no-alert
        alert(err.message);
      } else {
        // eslint-disable-next-line no-alert
        alert('Failed to optimize routes');
      }
    }
  };

  const applyOptimizedOrder = () => {
    const stops = optResult?.orderedStops;
    if (!stops || stops.length === 0) {
      // eslint-disable-next-line no-alert
      alert('No optimized order to apply. Please run Optimize Routes first.');
      return;
    }
    const orderIds: string[] = stops.map((s) => s.id);
    setRoutes((prev) => {
      const map = new Map(prev.map((r) => [r.id, r] as const));
      const ordered = orderIds.map((id) => map.get(id)).filter(Boolean) as Route[];
      const rest = prev.filter((r) => !orderIds.includes(r.id));
      return [...ordered, ...rest];
    });
    // eslint-disable-next-line no-alert
    alert('Optimized order applied.');
    setOptResult(null);
  };

  /* -------------------------- Bookings CRUD -------------------------- */
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
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBookingId
            ? {
              ...b,
              customer: formCustomer.trim(),
              unit: formUnit.trim(),
              date: formDate,
              duration: formDuration,
              amount: Number(formAmount) || 0,
              status: formStatus,
              paymentStatus: formPaymentStatus,
            }
            : b,
        ),
      );
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
      setBookings((prev) => [newB, ...prev]);
    }
    setBookingModalOpen(false);
  };

  const deleteBooking = (id: string) => setBookings((prev) => prev.filter((b) => b.id !== id));

  /* -------------------------- Team members CRUD -------------------------- */
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
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === editingMemberId
            ? {
              ...m,
              name: formMemberName.trim() || m.name,
              role: formMemberRole.trim() || m.role,
              email: formMemberEmail.trim() || m.email,
              phone: formMemberPhone.trim() || m.phone,
              status: formMemberStatus,
            }
            : m,
        ),
      );
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
      setTeamMembers((prev) => [newM, ...prev]);
    }
    setMemberModalOpen(false);
  };

  const deleteMember = (id: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm('Delete this team member?')) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  /* -------------------------- Small render helpers -------------------------- */

  const FleetMapView: React.FC = () => (
    <div className="h-[600px] rounded-lg overflow-hidden border shadow-sm">
      <MapContainer center={[-1.2921, 36.8219]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {units.map((u) => (
          <CircleMarker
            key={u.id}
            center={u.coordinates}
            radius={8}
            pathOptions={{ color: u.status === 'active' ? 'green' : u.status === 'maintenance' ? 'orange' : 'red' }}
          >
            <Popup>
              <strong>{u.serialNo}</strong>
              <br />
              {u.location}
              <br />
              Fill: {u.fillLevel}%
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );

  /* -------------------------- Tab renderers -------------------------- */

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats and AI Insights */}
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
          <p className="text-3xl font-bold text-gray-900">{routes.filter((r) => r.status === 'active').length}</p>
          <p className="text-sm text-gray-500 mt-2">{routes.filter((r) => r.status === 'pending').length} pending</p>
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
              {bookings.filter((b) => b.paymentStatus === 'pending').length > 0 && (
                <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {bookings.filter((b) => b.paymentStatus === 'pending').length} Pending
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-gray-500 text-sm font-medium">Maintenance</h3>
            <p className="text-3xl font-bold text-gray-900">{units.filter((u) => u.status === 'maintenance').length}</p>
            <p className="text-sm text-red-600 mt-2">Requires attention</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              <p className="text-sm text-gray-500">{forecast ? `${forecast.peakDay} • Avg ${forecast.avgDailyBookings} bookings/day` : 'No forecast available'}</p>
            </div>
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 rounded-full">AI</span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Top Risks</p>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {topRisks.length === 0 ? (
                  <li className="text-gray-400">No high-risk units right now.</li>
                ) : (
                  topRisks.map((item) => (
                    <li key={item.unit.id} className="flex items-center justify-between">
                      <span>{item.unit.serialNo}</span>
                      <span className="text-xs font-semibold text-red-600">{`${item.risk}%`}</span>
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
      </div>

      {/* Urgent Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Alerts</h3>
        <div className="space-y-4">
          {units.filter((u) => u.fillLevel > 80 || u.batteryLevel < 20).length === 0 && <p className="text-sm text-gray-500">No urgent alerts</p>}
          {units.map((u) => (
            <div key={u.id}>
              {u.fillLevel > 80 && (
                <div className="flex items-center p-4 bg-red-50 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{`Unit ${u.serialNo} requires immediate servicing`}</p>
                    <p className="text-xs text-red-600">{`Fill level: ${u.fillLevel}% | Location: ${u.location}`}</p>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    type="button"
                    onClick={() => {
                      openCreateRoute();
                      if (u.id) setFormUnitId(u.id);
                      setActiveTab('routes');
                      setUnitModalOpen(false);
                    }}
                  >
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
                  <button
                    className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    type="button"
                    onClick={() => {
                      setFormUnitStatus('maintenance');
                      openUnitModal(u);
                    }}
                  >
                    Schedule Maintenance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fleet Status table (compact) */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => openUnitModal(unit)}
              onKeyDown={() => openUnitModal(unit)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{unit.serialNo}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>{unit.status}</span>
              </div>
              <div className="text-sm text-gray-600">Location: {unit.location}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs">Fill: {unit.fillLevel}%</div>
                <div className="text-xs">Battery: {unit.batteryLevel}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Modal */}
      {unitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">Unit Details</h4>
              <button className="text-gray-500" type="button" onClick={() => setUnitModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={formUnitStatus}
                    onChange={(e) => setFormUnitStatus(e.target.value as UnitStatus)}
                  >
                    <option value="active">active</option>
                    <option value="maintenance">maintenance</option>
                    <option value="offline">offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={formUnitLocation}
                    onChange={(e) => setFormUnitLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fill Level (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={formUnitFill}
                    onChange={(e) => setFormUnitFill(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Battery (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={formUnitBattery}
                    onChange={(e) => setFormUnitBattery(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-sm border rounded"
                  onClick={() => {
                    openCreateRoute();
                    if (activeUnitId) setFormUnitId(activeUnitId);
                    setUnitModalOpen(false);
                  }}
                >
                  Assign Route
                </button>
                <button type="button" className="px-3 py-2 text-sm border rounded" onClick={() => setFormUnitStatus('maintenance')}>
                  Mark Maintenance
                </button>
                <button type="button" className="px-3 py-2 text-sm border rounded" onClick={() => setFormUnitStatus('active')}>
                  Mark Active
                </button>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button type="button" className="px-4 py-2 text-sm border rounded-md" onClick={() => setUnitModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveUnitChanges}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Bookings Management</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={openCreateBooking}>
              <Plus className="w-4 h-4 mr-2 inline" />
              New Booking
            </button>
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
                .filter((b) => b.customer.toLowerCase().includes(searchTerm.toLowerCase()) || b.unit.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {booking.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusColor(booking.status)}`}>{booking.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusColor(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900" type="button" onClick={() => openEditBooking(booking)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900" type="button" onClick={() => openEditBooking(booking)}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900" type="button" onClick={() => deleteBooking(booking.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Booking modal */}
        {bookingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">{editingBookingId ? 'Edit Booking' : 'New Booking'}</h4>
                <button className="text-gray-500" type="button" onClick={() => setBookingModalOpen(false)}>
                  ×
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Customer" value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} />
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Unit" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} />
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Duration" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
                <input type="number" min={0} className="w-full border rounded px-3 py-2 text-sm" placeholder="Amount" value={formAmount} onChange={(e) => setFormAmount(Number(e.target.value))} />
                <div className="grid grid-cols-2 gap-3">
                  <select className="border rounded px-3 py-2 text-sm" value={formStatus} onChange={(e) => setFormStatus(e.target.value as Booking['status'])}>
                    <option value="confirmed">confirmed</option>
                    <option value="pending">pending</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <select className="border rounded px-3 py-2 text-sm" value={formPaymentStatus} onChange={(e) => setFormPaymentStatus(e.target.value as Booking['paymentStatus'])}>
                    <option value="paid">paid</option>
                    <option value="pending">pending</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button type="button" className="px-4 py-2 text-sm border rounded-md" onClick={() => setBookingModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveBooking}>
                  Save
                </button>
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
              <button type="button" onClick={smartSuggest} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" disabled={sbLoading}>
                {sbLoading ? 'Suggesting...' : 'Smart Suggest'}
              </button>
            </div>
          </div>

          {sbError && <div className="text-red-600 text-sm">{sbError}</div>}

          {(sbSuggestion || (sbAlternatives && sbAlternatives.length > 0)) && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sbSuggestion && (
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-500 mb-1">Suggested</p>
                  <p className="text-gray-900 font-medium">{sbSuggestion.date}</p>
                  <p className="text-xs text-gray-600">Utilization: {Math.round((sbSuggestion.utilization || 0) * 100)}%</p>
                  <button
                    type="button"
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
                        <span>
                          {alt.date} • {Math.round((alt.utilization || 0) * 100)}%
                        </span>
                        <button
                          type="button"
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

  const renderRoutes = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Routes</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={optimizeRoutes} className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              <Navigation className="w-4 h-4 mr-2 inline" /> Optimize Routes
            </button>
            <button type="button" onClick={openCreateRoute} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2 inline" /> New Route
            </button>
          </div>
        </div>

        {optResult && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Depot Location</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2" value={selectedDepot} onChange={(e) => setSelectedDepot(e.target.value)}>
                  {Object.keys(depots).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
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
                <h4 className="text-purple-900 font-semibold flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 mr-2" /> AI Optimization Complete
                </h4>
                <p className="text-sm text-purple-700 mt-1">Estimated savings: {optResult.savings?.distance ?? '-'} km ({optResult.savings?.fuel ?? '-'})</p>
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={applyOptimizedOrder} className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
                  Apply Order
                </button>
              </div>
            </div>
            {optResult.orderedStops && (
              <div className="mt-4 border rounded p-4">
                <p className="text-sm text-gray-700 mb-2">
                  Total Distance: <span className="font-medium">{optResult.totalDistanceKm ?? '-'} km</span>
                </p>
                <ol className="list-decimal ml-5 space-y-1 text-sm">
                  {optResult.orderedStops.map((s, idx) => (
                    <li key={idx}>
                      {s.serialNo || s.id} • Leg {s.legDistanceKm ?? '-'} km
                    </li>
                  ))}
                </ol>
              </div>
            )}
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
              {routes.map((route) => (
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
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${route.status === 'active' ? 'bg-green-100 text-green-800' : route.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {route.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.estimatedTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" onClick={() => openEditRoute(route)} className="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteRoute(route.id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Route modal */}
        {routeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">{editingRouteId ? 'Edit Route' : 'New Route'}</h4>
                <button className="text-gray-500" type="button" onClick={() => setRouteModalOpen(false)}>
                  ×
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={formTech} onChange={(e) => setFormTech(e.target.value)}>
                    {teamMembers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} • {t.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={1} className="border rounded px-3 py-2 text-sm" placeholder="# Units" value={formRouteUnits} onChange={(e) => setFormRouteUnits(Number(e.target.value))} />
                  <input className="border rounded px-3 py-2 text-sm" placeholder="ETA (e.g., 2.5 hrs)" value={formEta} onChange={(e) => setFormEta(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select className="border rounded px-3 py-2 text-sm" value={formRouteStatus} onChange={(e) => setFormRouteStatus(e.target.value as RouteStatus)}>
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                  </select>
                  <select className="border rounded px-3 py-2 text-sm" value={formRoutePriority} onChange={(e) => setFormRoutePriority(e.target.value as RoutePriority)}>
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked Unit</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={formUnitId} onChange={(e) => setFormUnitId(e.target.value)}>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.serialNo} • {u.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button type="button" className="px-4 py-2 text-sm border rounded-md" onClick={() => setRouteModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveRoute}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFleetMap = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Fleet Map</h3>
          <div className="flex items-center space-x-2">
            <select className="px-3 py-2 text-sm border rounded-md" value={analyticsRange} onChange={(e) => setAnalyticsRange(e.target.value as AnalyticsRange)}>
              <option value="all">All</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
            </select>
            <button type="button" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => { }}>
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg overflow-hidden h-96">
            <MapContainer center={[-1.2921, 36.8219]} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {units.map((u) => (
                <CircleMarker
                  key={u.id}
                  center={[u.coordinates[0], u.coordinates[1]]}
                  radius={8}
                  pathOptions={{ color: u.status === 'active' ? '#22c55e' : u.status === 'maintenance' ? '#eab308' : '#ef4444', fillOpacity: 0.8 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-medium">{u.serialNo}</div>
                      <div>{u.location}</div>
                      <div>
                        Fill: {u.fillLevel}% • Battery: {u.batteryLevel}%
                      </div>
                      <div>Status: {u.status}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('fleet')}>
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              <span>Active ({units.filter((u) => u.status === 'active').length})</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('maintenance')}>
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
              <span>Maintenance ({units.filter((u) => u.status === 'maintenance').length})</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('routes')}>
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              <span>Offline ({units.filter((u) => u.status === 'offline').length})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaintenance = () => <Maintenance />;
  const renderAnalytics = () => <Analytics />;

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Company Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.companyName} onChange={(e) => setSettings((s: any) => ({ ...s, companyName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.contactEmail} onChange={(e) => setSettings((s: any) => ({ ...s, contactEmail: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2" value={settings.phone} onChange={(e) => setSettings((s: any) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="BL-2023-001234" readOnly />
            </div>
          </div>
        </div>
      </div>

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
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(settings.whatsappNotifications)}
                onChange={(e) => setSettings((s: any) => ({ ...s, whatsappNotifications: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full relative peer-checked:bg-blue-600">
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </div>
      </div>

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
            <button type="button" className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700" onClick={() => alert('Configure Google Maps API')}>
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Team members */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search team..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button type="button" onClick={openAddMember} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2 inline" /> Add
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers
            .filter(
              (member) =>
                member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((member) => (
              <div key={member.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEditMember(member)} className="text-green-600 hover:text-green-800">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => deleteMember(member.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{member.email}</div>
                <div className="text-xs text-gray-500">{member.phone}</div>
                <div className="text-xs text-gray-400 mt-2">Joined {member.joinDate}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Member modal */}
      {memberModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">{editingMemberId ? 'Edit Member' : 'Add Member'}</h4>
              <button className="text-gray-500" type="button" onClick={() => setMemberModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberName} onChange={(e) => setFormMemberName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberRole} onChange={(e) => setFormMemberRole(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full border rounded px-3 py-2 text-sm" value={formMemberEmail} onChange={(e) => setFormMemberEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={formMemberPhone} onChange={(e) => setFormMemberPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={formMemberStatus} onChange={(e) => setFormMemberStatus(e.target.value as TeamMember['status'])}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button type="button" className="px-4 py-2 text-sm border rounded-md" onClick={() => setMemberModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={saveMember}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* -------------------------- main layout -------------------------- */
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'fleet':
        return renderFleetMap();
      case 'routes':
        return renderRoutes();
      case 'payments':
        return <PaymentsPage />;
      case 'insights':
        return <Insights />;
      case 'bookings':
        return renderBookings();
      case 'maintenance':
        return renderMaintenance();
      case 'analytics':
        return renderAnalytics();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow-sm border p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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

        <div className="flex-1">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Dashboard;
