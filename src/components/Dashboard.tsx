// src/components/Dashboard.tsx
// Refreshed Build 1
import React, { useEffect, useMemo, useState } from 'react';
import LiveFleetMap from './LiveFleetMap';
// import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../lib/api';
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
  Globe, // Added Globe
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
  ChevronRight,
  CheckCircle,
  Lock,
  Shield,
  Download,
  Bell,
  User,
  Building,
} from 'lucide-react';
import {
  ForecastResult,
  MaintenanceInsight,
  forecastDemand,
  generatePrescriptiveAlerts,
  rankUnitsByMaintenance,
} from '../lib/heuristics';

import Insights from '../Insights';
import Maintenance from './Maintenance';
import Analytics from './Analytics';
import Assistant from '../Assistant';
import Billing from '../Billing';

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
  predictedFullDate?: string; // New field from enhanced AI
  riskScore?: number;        // New field from enhanced AI
  recommendation?: string;   // New field from enhanced AI
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
  technicianId?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
  lastLat?: number;
  lastLng?: number;
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


/* -------------------------- Main Component --------------------------- */

const Dashboard: React.FC = () => {
  // contexts
  const { locale, setLocale, t } = useLocale();

  // layout
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);


  const sidebarItems = useMemo(
    () => [
      { id: 'overview', label: t('dashboard.overviewTab') || 'Overview', icon: BarChart3 },
      { id: 'fleet', label: t('dashboard.fleetMap') || 'Fleet Map', icon: MapPin },
      { id: 'routes', label: t('dashboard.routesTab') || 'Routes', icon: Navigation },
      { id: 'bookings', label: t('dashboard.bookingsTab') || 'Bookings', icon: Calendar },
      { id: 'maintenance', label: t('dashboard.maintenanceTab') || 'Maintenance', icon: Wrench },
      { id: 'analytics', label: t('dashboard.analyticsTab') || 'Analytics', icon: TrendingUp },
      { id: 'insights', label: t('dashboard.insightsTab') || 'Insights', icon: BarChart3 },
      { id: 'billing', label: 'Billing', icon: DollarSign },
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

  const [cortexReportLoading, setCortexReportLoading] = useState(false);

  const generateCortexReport = async () => {
    setCortexReportLoading(true);
    try {
      // simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const report = `
CORTEX AI - FLEET ANALYSIS REPORT
--------------------------------
Date: ${new Date().toLocaleDateString()}
Status: OPTIMAL

SUMMARY:
- 98% Fleet Uptime
- 12% Revenue Growth
- 3 Maintenance Risks Detected

Forecast:
- Peak demand expected: Friday
- Recommendation: Increase capacity by 15%
`;
      alert(report);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report');
    } finally {
      setCortexReportLoading(false);
    }
  };


  /* -------------------------- Sample persistent state -------------------------- */

  /* -------------------------- Persistent State via API -------------------------- */
  const [units, setUnits] = useState<Unit[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState({
    companyName: 'Smart Sanitation Co.',
    contactEmail: 'admin@smartsanitation.co.ke',
    phone: '+254 700 000 000',
    language: 'en',
    sessionTimeout: '30',
    emailNotifications: true,
    whatsappNotifications: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Save settings function
  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const resp = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, userId: 'admin-user' })
      });

      if (!resp.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await resp.json();
      setSettingsSaved(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };


  /* -------------------------- Data Fetching -------------------------- */
  const fetchAll = async () => {
    try {
      const [uRes, rRes, bRes, mRes, sRes] = await Promise.all([
        apiFetch('/api/units'),
        apiFetch('/api/routes'),
        apiFetch('/api/bookings'),
        apiFetch('/api/team-members'),
        apiFetch('/api/settings'),
      ]);

      if (uRes.ok) {
        const raw = await uRes.json();
        // Parse coordinates string "lat,lng" to [lat, lng]
        const parsed = raw.map((u: any) => ({
          ...u,
          coordinates: typeof u.coordinates === 'string' && u.coordinates.includes(',')
            ? u.coordinates.split(',').map((n: string) => Number(n.trim()))
            : [-1.2921, 36.8219] // Default Nairobi
        }));
        setUnits(parsed);
      }
      if (rRes.ok) setRoutes(await rRes.json());
      if (bRes.ok) setBookings(await bRes.json());
      if (mRes.ok) setTeamMembers(await mRes.json());
      if (sRes.ok) setSettings(await sRes.json());
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
  const [formBookingTechId, setFormBookingTechId] = useState<string>('');

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

  const openUnitModal = async (u: Unit) => {
    setActiveUnitId(u.id);
    setFormUnitStatus(u.status);
    setFormUnitFill(u.fillLevel);
    setFormUnitBattery(u.batteryLevel);
    setFormUnitLocation(u.location);
    setUnitModalOpen(true);

    // Fetch live prediction
    try {
      const resp = await apiFetch('/api/ai/predict-maintenance', {
        method: 'POST',
        data: { units: [u] }
      });
      if (resp.ok) {
        const data = await resp.json();
        const prediction = data.results[0];
        if (prediction) {
          // Update local state to show prediction in UI
          setUnits(prev => prev.map(unit => unit.id === u.id ? { ...unit, ...prediction } : unit));
        }
      }
    } catch (err) {
      console.error('Failed to predict maintenance', err);
    }
  };


  const saveUnitChanges = async () => {
    if (!activeUnitId) return;
    const u = units.find((x) => x.id === activeUnitId);
    if (!u) return;

    try {
      const resp = await apiFetch(`/api/units/${activeUnitId}`, {
        method: 'PUT',
        data: {
          status: formUnitStatus,
          fillLevel: Math.max(0, Math.min(100, Number(formUnitFill) || 0)),
          batteryLevel: Math.max(0, Math.min(100, Number(formUnitBattery) || 0)),
          location: formUnitLocation.trim() || u.location,
        },
      });
      if (resp.ok) {
        const updated = await resp.json();
        setUnits((prev) => prev.map((unit) => (unit.id === activeUnitId ? updated : unit)));
        setUnitModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update unit', err);
    }
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


  const saveRoute = async () => {
    const payload = {
      technician: formTech.trim() || 'Technician',
      units: Number(formRouteUnits) || 1,
      status: formRouteStatus,
      priority: formRoutePriority,
      estimatedTime: formEta,
      unitId: formUnitId,
    };

    try {
      if (editingRouteId) {
        const resp = await apiFetch(`/api/routes/${editingRouteId}`, {
          method: 'PUT',
          data: payload,
        });
        if (resp.ok) {
          const updated = await resp.json();
          setRoutes((prev) => prev.map((r) => (r.id === editingRouteId ? updated : r)));
        }
      } else {
        const resp = await apiFetch('/api/routes', {
          method: 'POST',
          data: payload,
        });
        if (resp.ok) {
          const created = await resp.json();
          setRoutes((prev) => [created, ...prev]);
        }
      }
      setRouteModalOpen(false);
    } catch (err) {
      console.error('Failed to save route', err);
    }
  };


  const deleteRoute = async (id: string) => {
    try {
      const resp = await apiFetch(`/api/routes/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setRoutes((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete route', err);
    }
  };

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
    alert("Routes have been re-ordered for maximum efficiency.");
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
    setFormBookingTechId('');
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
    setFormBookingTechId(b.technicianId || '');
    setBookingModalOpen(true);
  };



  const saveBooking = async () => {
    // Validation
    if (!formCustomer.trim() || !formUnit.trim() || !formDate) {
      alert("Please fill in Customer, Unit, and Date.");
      return;
    }

    const payload = {
      customer: formCustomer.trim(),
      unit: formUnit.trim(),
      date: formDate,
      duration: formDuration,
      amount: Number(formAmount) || 0,
      status: formStatus,
      paymentStatus: formPaymentStatus,
      technicianId: formBookingTechId,
    };

    try {
      if (editingBookingId) {
        const resp = await apiFetch(`/api/bookings/${editingBookingId}`, {
          method: 'PUT',
          data: payload,
        });
        if (resp.ok) {
          const updated = await resp.json();
          setBookings((prev) => prev.map((b) => (b.id === editingBookingId ? updated : b)));
          setBookingModalOpen(false);
          alert('Booking updated successfully!');
        } else {
          alert('Failed to update booking. Please try again.');
        }
      } else {
        const resp = await apiFetch('/api/bookings', {
          method: 'POST',
          data: payload,
        });
        if (resp.ok) {
          const created = await resp.json();
          // Ensure Date string aligns with UI expectations if needed
          if (created.date && typeof created.date === 'string') {
            created.date = created.date.split('T')[0];
          }
          setBookings((prev) => [created, ...prev]);

          // Trigger WhatsApp notification for new bookings if enabled
          if (settings.whatsappNotifications) {
            // Fire and forget notification
            apiFetch('/api/notifications/send', {
              method: 'POST',
              data: {
                channel: 'whatsapp',
                recipient: '+2547XXXXXXXX', // Demo number
                message: `New booking confirmed: ${created.customer} for ${created.unit} on ${created.date}.`
              }
            }).catch(console.error);
          }
          setBookingModalOpen(false);
          alert('Booking created successfully!');
        } else {
          const errData = await resp.json().catch(() => ({}));
          alert(`Failed to create booking: ${errData.error || 'Server error'}`);
        }
      }
    } catch (err) {
      console.error('Failed to save booking', err);
      alert('An error occurred. Check console for details.');
    }
  };


  const deleteBooking = async (id: string) => {
    try {
      const resp = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete booking', err);
    }
  };

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


  const saveMember = async () => {
    const payload = {
      name: formMemberName.trim() || 'New Member',
      role: formMemberRole.trim() || 'Role',
      email: formMemberEmail.trim() || 'email@example.com',
      phone: formMemberPhone.trim() || '',
      status: formMemberStatus,
    };

    try {
      if (editingMemberId) {
        const resp = await apiFetch(`/api/team-members/${editingMemberId}`, {
          method: 'PUT',
          data: payload,
        });
        if (resp.ok) {
          const updated = await resp.json();
          setTeamMembers((prev) => prev.map((m) => (m.id === editingMemberId ? updated : m)));
        }
      } else {
        const resp = await apiFetch('/api/team-members', {
          method: 'POST',
          data: payload,
        });
        if (resp.ok) {
          const created = await resp.json();
          setTeamMembers((prev) => [created, ...prev]);
        }
      }
      setMemberModalOpen(false);
    } catch (err) {
      console.error('Failed to save member', err);
    }
  };


  const deleteMember = async (id: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm('Delete this team member?')) return;
    try {
      const resp = await apiFetch(`/api/team-members/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete member', err);
    }
  };

  /* -------------------------- Small render helpers -------------------------- */


  /* -------------------------- Tab renderers -------------------------- */

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Hero Welcome Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl text-white p-8 md:p-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop')] mix-blend-overlay opacity-20 bg-cover bg-center"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">System Online</span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              Welcome back, Administrator
            </h2>
            <p className="text-blue-100/80 mt-2 text-lg max-w-xl">
              Real-time telemetry indicates optimal performance across the sanitation fleet. 98% operational uptime today.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveTab('bookings')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-5 py-3 rounded-xl font-medium transition-all flex items-center shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <Plus className="w-5 h-5 mr-2" /> New Booking
            </button>
            <button onClick={() => setActiveTab('routes')} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all flex items-center hover:-translate-y-0.5">
              <Navigation className="w-5 h-5 mr-2" /> Dispatch Route
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metrics */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Total Units Card - Premium */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Total Fleet</p>
                    <h3 className="mt-2 text-4xl font-extrabold">{units.length}</h3>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-emerald-50 mb-1">
                    <span>Utilization</span>
                    <span>85%</span>
                  </div>
                  <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/90 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Routes Card - Premium */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl shadow-indigo-500/20 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Active Routes</p>
                    <h3 className="mt-2 text-4xl font-extrabold">{routes.filter((r) => r.status === 'active').length}</h3>
                    <p className="mt-1 text-sm text-indigo-200">On the road now</p>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Navigation className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? 'bg-white/90' : 'bg-black/20'}`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Card - Premium */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Daily Revenue</h3>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <DollarSign className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">58k</span>
                  <span className="text-lg font-medium text-gray-500">KES</span>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded mr-2">+12.5%</span>
                  <span className="text-gray-400">vs yesterday</span>
                </div>
              </div>
            </div>

            {/* Maintenance Card - Premium */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-red-500/5 blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Maintenance</h3>
                  <div className="p-3 bg-red-50 rounded-xl">
                    <Wrench className="w-6 h-6 text-red-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">{units.filter((u) => u.status === 'maintenance').length}</span>
                  <span className="text-lg font-medium text-gray-500">Units</span>
                </div>
                <div className="mt-4">
                  {units.filter((u) => u.status === 'maintenance').length > 0 ? (
                    <button onClick={() => setActiveTab('maintenance')} className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center">
                      View Critical Issues <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  ) : <span className="text-sm font-medium text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> All systems operational</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity / Chart Placeholder */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 min-h-[250px] relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Live Fleet Activity</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold">View Full Map</button>
            </div>

            {/* Live Map Component */}
            <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-slate-50 relative z-0">
              <LiveFleetMap />
            </div>
          </div>
        </div>


        {/* Right Column: AI Insights - Premium Dark Mode Card */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col h-full min-h-[500px] relative overflow-hidden">
          {/* Abstract BG shapes */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Cortex AI</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Analysis Mode: ACTIVE</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Forecast Block */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-semibold text-slate-200">Demand Forecast</h4>
                </div>
                <p className="text-2xl font-bold">{forecast ? forecast.peakDay : '---'}</p>
                <p className="text-xs text-slate-400 mt-1">Expected peak traffic day</p>
              </div>

              {/* Risks Block */}
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Risk Assessment</p>
                <ul className="space-y-3">
                  {topRisks.length === 0 ? (
                    <li className="text-slate-500 text-sm italic">No critical anomalies.</li>
                  ) : (
                    topRisks.map((item) => (
                      <li key={item.unit.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border-l-2 border-red-500">
                        <span className="font-mono text-sm text-slate-300">{item.unit.serialNo}</span>
                        <span className="text-xs font-bold text-red-400">{`${item.risk}% RISK`}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Alerts Block */}
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Live Alerts</p>
                <div className="space-y-3">
                  {aiAlerts.length === 0 ? (
                    <div className="flex items-center text-sm text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-900/30">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                      Normal operations
                    </div>
                  ) : (
                    aiAlerts.map((alert, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-yellow-900/20 rounded-lg text-xs text-yellow-100 border border-yellow-700/30">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                        <span className="leading-relaxed opacity-90">{alert}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={generateCortexReport}
                disabled={cortexReportLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
              >
                {cortexReportLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {cortexReportLoading ? 'Generating Analysis...' : 'Generate Full Report'}
              </button>
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
      {
        unitModalOpen && (
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

              {/* AI Prediction Display */}
              {activeUnitId && units.find(u => u.id === activeUnitId)?.predictedFullDate && (
                <div className="p-4 border-t bg-purple-50">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    AI Predictive Maintenance
                  </h4>
                  <div className="text-sm text-purple-800 space-y-1">
                    <p><strong>Predicted Full Date:</strong> {new Date(units.find(u => u.id === activeUnitId)!.predictedFullDate!).toDateString()}</p>
                    <p><strong>Urgency Score:</strong> {((units.find(u => u.id === activeUnitId)!.riskScore || 0) * 100).toFixed(0)}/100</p>
                    <p className="font-medium text-purple-900">Recommendation: {units.find(u => u.id === activeUnitId)!.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );

  const renderBookings = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.technicianId
                        ? (teamMembers.find(t => t.id === booking.technicianId)?.name || 'Unknown')
                        : <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{editingBookingId ? 'Edit Booking' : 'New Booking'}</h4>
                  <p className="text-sm text-gray-500 mt-1">Manage reservation details and payment status</p>
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Name</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="e.g. John Doe"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assign Technician</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formBookingTechId}
                    onChange={(e) => setFormBookingTechId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id.slice(0, 4).toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Unit</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="e.g. UNIT-001"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Duration</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      placeholder="e.g. 3 days"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (KES)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Booking Status</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as Booking['status'])}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Status</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as Booking['paymentStatus'])}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                  onClick={saveBooking}
                >
                  {editingBookingId ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Booking */}
        <div className="p-6 border-t space-y-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Smart Booking Intelligence</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sbDate} onChange={(e) => setSbDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location</label>
              <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sbLocation} onChange={(e) => setSbLocation(e.target.value)} placeholder="e.g. Nairobi" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unit Count</label>
              <input type="number" min={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sbUnits} onChange={(e) => setSbUnits(Number(e.target.value))} placeholder="1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Duration (Days)</label>
              <input type="number" min={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sbDuration} onChange={(e) => setSbDuration(Number(e.target.value))} placeholder="1" />
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity / Day</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sbCapacity} onChange={(e) => setSbCapacity(Number(e.target.value))} placeholder="80" />
                <button type="button" onClick={smartSuggest} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap shadow-md" disabled={sbLoading}>
                  {sbLoading ? '...' : 'Suggest'}
                </button>
              </div>
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
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden p-0">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tech ID</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {(teamMembers.find(t => t.name === route.technician)?.id || '-').slice(0, 4).toUpperCase()}
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
        {/* Route modal */}
        {routeModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{editingRouteId ? 'Edit Route' : 'New Route'}</h4>
                  <p className="text-sm text-gray-500 mt-1">Dispatch or update service route details</p>
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Technician</label>

                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formTech}
                    onChange={(e) => setFormTech(e.target.value)}
                  >
                    <option value="">Select Technician</option>
                    {teamMembers
                      .filter(t => /technician|driver|field/i.test(t.role))
                      .map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Number of Units</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      placeholder="e.g. 5"
                      value={formRouteUnits}
                      onChange={(e) => setFormRouteUnits(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estimated Time</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      placeholder="e.g. 2.5 hrs"
                      value={formEta}
                      onChange={(e) => setFormEta(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formRouteStatus}
                      onChange={(e) => setFormRouteStatus(e.target.value as RouteStatus)}
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Priority</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formRoutePriority}
                      onChange={(e) => setFormRoutePriority(e.target.value as RoutePriority)}
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Linked Unit (Optional)</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(e.target.value)}
                  >
                    <option value="">No specific unit linked</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.serialNo} • {u.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  onClick={() => setRouteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                  onClick={saveRoute}
                >
                  {editingRouteId ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFleetMap = () => (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
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
            <button type="button" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={fetchAll}>
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-gray-100 relative z-0">
            <LiveFleetMap
              units={units}
              trucks={teamMembers.filter(m =>
                (m.role && (m.role.toLowerCase().includes('driver') || m.role.toLowerCase().includes('tech')))
              )}
            />
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


  /* -------------------------- Tab renderers -------------------------- */

  const handleChangePassword = () => {
    alert("Password Change: This feature is currently in demo mode. In production, this would open a secure password reset form.");
  };

  const handleEditProfile = () => {
    alert("Edit Profile: You are logged in as Administrator. Profile details are synced with the central registry.");
  };

  const handleDownloadData = () => {
    alert("Privacy Export: Your data is being prepared in GDPR-compliant JSON format. It will be emailed to " + settings.contactEmail);
  };



  const renderSettings = () => (
    <div className="space-y-8 animate-in fly-in-bottom duration-500">

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column */}
        <div className="space-y-8">
          {/* Company Profile - Premium Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 h-fit">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-inner border border-white/20">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Company Profile</h3>
                  <p className="text-blue-100 text-sm opacity-90">Manage your business identity</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Company Name</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none hover:bg-white"
                    value={settings.companyName}
                    onChange={(e) => setSettings((s: any) => ({ ...s, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contact Email</label>
                  <input
                    type="email"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none hover:bg-white"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings((s: any) => ({ ...s, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none hover:bg-white"
                    value={settings.phone}
                    onChange={(e) => setSettings((s: any) => ({ ...s, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Business License</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-xl block p-3 cursor-not-allowed opacity-75"
                      defaultValue="BL-2023-001234"
                      readOnly
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="px-6 pb-6">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </button>

              {/* Success Message */}
              {settingsSaved && (
                <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle className="w-4 h-4" />
                  Settings saved successfully!
                </div>
              )}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Connected Services</h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: 'M-Pesa Integration', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100', status: 'Active', sync: '2m ago' },
                { name: 'WhatsApp Business', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100', status: 'Active', sync: '1h ago' },
                { name: 'OpenWeatherMap', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100', status: 'Providing Data', sync: 'Live' }
              ].map((api, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${api.bg} ${api.color}`}>
                      <api.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{api.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{api.sync}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-md">{api.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preferences & Integrations Column */}
        <div className="space-y-8">

          {/* Security & Access */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Security & Access</h3>
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-6 space-y-4">
              <button onClick={handleEditProfile} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Edit Profile</p>
                    <p className="text-xs text-gray-500">Update personal details</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button onClick={handleChangePassword} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Change Password</p>
                    <p className="text-xs text-gray-500">Update your security key</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Data Privacy & AI Transparency */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Data & AI Responsibility</h3>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 leading-relaxed">
                  This platform uses AI to optimize routes and forecast demand.
                  <strong className="block mt-1">Privacy Guarantee:</strong> All personal data is anonymized before processing. We do not share customer identities with external AI models.
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">AI Optimization</p>
                  <p className="text-xs text-gray-500">Allow anonymized fleet analysis</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked readOnly />
                  <div className="w-10 h-6 bg-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow-sm"></div>
                </label>
              </div>

              <button onClick={handleDownloadData} className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Export My Data (GDPR)
              </button>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">System Preferences</h3>
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Language / Lugha</label>
                <div className="bg-gray-100 p-1 rounded-xl inline-flex w-full relative">
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${locale === 'sw' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'}`}></div>
                  <button onClick={() => setLocale('en')} className={`relative z-10 w-1/2 py-2.5 text-sm font-bold text-center rounded-lg transition-colors ${locale === 'en' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>English</button>
                  <button onClick={() => setLocale('sw')} className={`relative z-10 w-1/2 py-2.5 text-sm font-bold text-center rounded-lg transition-colors ${locale === 'sw' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Kiswahili</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">WhatsApp Alerts</p>
                    <p className="text-xs text-blue-600/70">Get real-time updates</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={Boolean(settings.whatsappNotifications)} onChange={(e) => setSettings((s: any) => ({ ...s, whatsappNotifications: e.target.checked }))} />
                  <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                </label>
              </div>
            </div>
          </div>



        </div>
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Team Management</h3>
              <p className="text-gray-500 text-sm">Manage access and roles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search members..."
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={openAddMember}
              className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-black shadow-lg shadow-gray-900/20 transition-all flex items-center hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers
              .filter(
                (member) =>
                  member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.email.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((member) => (
                <div key={member.id} className="relative group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-100 transition-all duration-300">
                  <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button onClick={() => openEditMember(member)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 mb-3 shadow-inner border border-white">
                      {member.name.charAt(0)}
                    </div>
                    <h4 className="font-bold text-gray-900 text-base mb-1">{member.name}</h4>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-100 mb-4">{member.role}</span>

                    <div className="w-full space-y-2 border-t border-gray-50 pt-4 text-left">
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3.5 h-3.5 mr-2 opacity-70" /> {member.email}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 mr-2 opacity-70" /> Joined {member.joinDate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No team members found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Team Member Modal */}
      {
        memberModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingMemberId ? 'Edit Team Member' : 'Add Team Member'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingMemberId ? 'Update member information' : 'Add a new member to your team'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formMemberName}
                    onChange={(e) => setFormMemberName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role</label>
                  <input
                    type="text"
                    value={formMemberRole}
                    onChange={(e) => setFormMemberRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
                    placeholder="Technician"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={formMemberEmail}
                    onChange={(e) => setFormMemberEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formMemberPhone}
                    onChange={(e) => setFormMemberPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={formMemberStatus}
                    onChange={(e) => setFormMemberStatus(e.target.value as TeamMember['status'])}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                <button
                  onClick={() => setMemberModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMember}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                  {editingMemberId ? 'Update' : 'Add'} Member
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
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

      case 'billing':
        return <Billing />;
      case 'insights':
        return <Insights />;
      case 'bookings':
        return renderBookings();
      case 'maintenance':
        return renderMaintenance();
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <div className="w-full lg:w-[280px] flex-shrink-0">
          <nav className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sticky top-6">
            <div className="mb-6 px-3">
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 truncate">
                {settings.companyName || 'Smart Sanitation'}
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">Management Platform</p>
            </div>
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 group ${activeTab === item.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} />
                      {item.label}
                      {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                    </button>
                  </li>
                );
              })}</ul>
          </nav>
        </div>

        <div className="flex-1">{renderContent()}</div>
      </div>

      {/* Floating Assistant Widget */}
      {isAssistantOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[calc(100vh-8rem)] h-[550px] shadow-2xl z-50 rounded-lg overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
          <Assistant />
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50 flex items-center justify-center"
        aria-label="Toggle Assistant"
      >
        {isAssistantOpen ? (
          <span className="text-xl font-bold">×</span>
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default Dashboard;
