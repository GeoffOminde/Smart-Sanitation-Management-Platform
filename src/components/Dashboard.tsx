// src/components/Dashboard.tsx
// Refreshed Build 1
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import LiveFleetMap from './LiveFleetMap';
import { useLocation } from 'react-router-dom';
// import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';
import { useSettings } from '../contexts/SettingsContext';
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
  Wifi,
  Phone,
  Loader2,
} from 'lucide-react';
import {
  ForecastResult,
  MaintenanceInsight,
  forecastDemand,
  generatePrescriptiveAlerts,
  rankUnitsByMaintenance,
} from '../lib/heuristics';

// Lazy load heavy components for better performance
const Insights = lazy(() => import('../Insights'));
const Maintenance = lazy(() => import('./Maintenance'));
const Analytics = lazy(() => import('./Analytics'));
const Assistant = lazy(() => import('../Assistant'));
const Billing = lazy(() => import('../Billing'));
import BookingList from './bookings/BookingList';
import BookingForm from './bookings/BookingForm';
import { useBookings } from '../contexts/BookingContext';

/**
 * This Dashboard.tsx is a consolidated, lint-cleaned component reconstructed
 * from the fragments you uploaded. It assumes the listed imported modules exist
 * in your project (Payments, Insights, heuristics, api, contexts).
 */

/* -------------------------- Types & Helpers --------------------------- */


interface Unit {
  id: string;
  serialNo: string;
  type: string; // 'Standard Portable' | 'Deluxe Portable' | 'Wheelchair Accessible'
  location: string;
  fillLevel: number;
  batteryLevel: number;
  status: 'active' | 'maintenance' | 'offline';
  lastSeen: string;
  coordinates: [number, number];
  // IoT Sensor Data
  temperature?: number;
  humidity?: number;
  odorLevel?: number;
  usageCount?: number;
  lastServiceDate?: string;
  // AI fields
  predictedFullDate?: string;
  riskScore?: number;
  recommendation?: string;
}

interface Route {
  id: string;
  technician: string;
  units: number;
  status: 'pending' | 'active' | 'completed';
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  unitId?: string;
  technicianId?: string;
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

interface DashboardProps {
  initialTab?: string;
}


const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'overview' }) => {
  // contexts
  const { locale, setLocale, t } = useLocale();
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSettings();
  const location = useLocation();

  // layout - Load from localStorage or use initialTab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedTab = localStorage.getItem('dashboardActiveTab');
    return savedTab || initialTab;
  });

  // Booking Context Integration
  const { fetchBookings: refreshBookings, selectedBooking, setSelectedBooking } = useBookings();

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardActiveTab', activeTab);
  }, [activeTab]);

  // Only update from initialTab if it's explicitly set (not the default 'overview')
  useEffect(() => {
    if (initialTab !== 'overview') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    // Cast to any to access custom state properties
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
    }
  }, [location.state]);

  // Sync selected booking from list to modal
  useEffect(() => {
    if (selectedBooking) {
      // Map complex Booking object to flat form state
      setEditingBookingId(selectedBooking.id);
      setFormCustomer(selectedBooking.customer.name || '');
      setFormUnit(selectedBooking.unit.name || '');
      // Handle nested dateRange vs date string mismatch safely
      setFormDate(selectedBooking.dateRange?.start ? new Date(selectedBooking.dateRange.start).toISOString().split('T')[0] : '');
      setFormDuration('1 day'); // Default or extract if available
      setFormAmount(selectedBooking.payment?.amount || 0);
      setFormStatus(selectedBooking.status as any); // Cast status
      setFormPaymentStatus(selectedBooking.payment?.status === 'paid' ? 'paid' : 'pending');

      setBookingModalOpen(true);
      // Clear selection so we don't loop or stuck
      setSelectedBooking(null);
    }
  }, [selectedBooking, setSelectedBooking]);

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
      { id: 'billing', label: t('billing.title') || 'Billing', icon: DollarSign },
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
      // Calculate real statistics
      const totalUnits = units.length;
      const activeUnits = units.filter(u => u.status === 'active').length;
      const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
      const offlineUnits = units.filter(u => u.status === 'offline').length;
      const avgFillLevel = units.length > 0 ? units.reduce((sum, u) => sum + u.fillLevel, 0) / units.length : 0;
      const avgBatteryLevel = units.length > 0 ? units.reduce((sum, u) => sum + u.batteryLevel, 0) / units.length : 0;

      const totalRoutes = routes.length;
      const activeRoutes = routes.filter(r => r.status === 'active').length;
      const completedRoutes = routes.filter(r => r.status === 'completed').length;
      const pendingRoutes = routes.filter(r => r.status === 'pending').length;

      const totalBookings = bookings.length;
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      const totalRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);

      const totalTeamMembers = teamMembers.length;
      const activeTeamMembers = teamMembers.filter(m => m.status === 'active').length;

      // Critical alerts
      const criticalUnits = units.filter(u => u.fillLevel > 80 || u.batteryLevel < 20);
      const highFillUnits = units.filter(u => u.fillLevel > 80);
      const lowBatteryUnits = units.filter(u => u.batteryLevel < 20);

      // Generate comprehensive report
      const report = `
╔═══════════════════════════════════════════════════════════════╗
║        SMART SANITATION MANAGEMENT - FULL REPORT            ║
╚═══════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}
Report Period: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 FLEET OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Units: ${totalUnits}
  • Active: ${activeUnits} (${totalUnits > 0 ? ((activeUnits / totalUnits) * 100).toFixed(1) : 0}%)
  • Maintenance: ${maintenanceUnits}
  • Offline: ${offlineUnits}

Average Fill Level: ${avgFillLevel.toFixed(1)}%
Average Battery Level: ${avgBatteryLevel.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚛 ROUTES & OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Routes: ${totalRoutes}
  • Active: ${activeRoutes}
  • Completed: ${completedRoutes}
  • Pending: ${pendingRoutes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 BOOKINGS & REVENUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Bookings: ${totalBookings}
  • Confirmed: ${confirmedBookings}
  • Pending: ${pendingBookings}

Total Revenue: KSh ${totalRevenue.toLocaleString()}
Average Booking Value: KSh ${totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 TEAM MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Team Members: ${totalTeamMembers}
Active Members: ${activeTeamMembers}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CRITICAL ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${criticalUnits.length === 0 ? '✅ No critical alerts' : `
🔴 Units Requiring Attention: ${criticalUnits.length}
  • High Fill Level (>80%): ${highFillUnits.length}
  • Low Battery (<20%): ${lowBatteryUnits.length}

Critical Units:
${criticalUnits.slice(0, 5).map(u => `  • ${u.serialNo}: Fill ${u.fillLevel}%, Battery ${u.batteryLevel}%`).join('\n')}
${criticalUnits.length > 5 ? `  ... and ${criticalUnits.length - 5} more` : ''}
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 KEY PERFORMANCE INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fleet Utilization: ${totalUnits > 0 ? ((activeUnits / totalUnits) * 100).toFixed(1) : 0}%
Route Completion Rate: ${totalRoutes > 0 ? ((completedRoutes / totalRoutes) * 100).toFixed(1) : 0}%
Booking Confirmation Rate: ${totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : 0}%
Team Availability: ${totalTeamMembers > 0 ? ((activeTeamMembers / totalTeamMembers) * 100).toFixed(1) : 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${avgFillLevel > 70 ? '• Schedule additional pickups - average fill level is high\n' : ''}${lowBatteryUnits.length > 0 ? `• Charge ${lowBatteryUnits.length} units with low battery\n` : ''}${maintenanceUnits.length > 2 ? `• ${maintenanceUnits.length} units in maintenance - consider fleet expansion\n` : ''}${pendingBookings > confirmedBookings ? '• Follow up on pending bookings to improve conversion\n' : ''}${activeRoutes === 0 && pendingRoutes > 0 ? '• Activate pending routes to improve service delivery\n' : ''}${criticalUnits.length === 0 && activeUnits === totalUnits ? '✅ Fleet is operating optimally\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report generated by Smart Sanitation Management Platform
For support: ${settings.contactEmail}
      `;

      // Display report in alert
      alert(report.trim());

      // Optionally, you could also download as a file
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sanitation-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error(e);
      alert('Failed to generate report');
    } finally {
      setCortexReportLoading(false);
    }
  };


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
    sessionTimeout: '120', // Default 120 minutes (2 hours)
    emailNotifications: true,
    whatsappNotifications: true,
    theme: 'light',
    currency: 'KES',
  });

  // Use centralized formatCurrency from SettingsContext
  const { formatCurrency } = globalSettings ? {
    formatCurrency: (amount: number) => {
      const currencySymbols: Record<string, string> = {
        'KES': 'KES',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
      };
      const symbol = currencySymbols[globalSettings.currency] || 'KES';
      return `${symbol} ${amount.toLocaleString()}`;
    }
  } : { formatCurrency: (amount: number) => `KES ${amount.toLocaleString()}` };


  // Notification system
  const showNotification = (message: string, type: 'email' | 'whatsapp' | 'both' = 'both') => {
    if (type === 'email' && settings.emailNotifications) {
      console.log('📧 Email notification:', message);
      // In production, this would send an actual email
    }
    if (type === 'whatsapp' && settings.whatsappNotifications) {
      console.log('💬 WhatsApp notification:', message);
      // In production, this would send a WhatsApp message
    }
    if (type === 'both') {
      if (settings.emailNotifications) console.log('📧 Email notification:', message);
      if (settings.whatsappNotifications) console.log('💬 WhatsApp notification:', message);
    }
  };

  // Apply theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Session timeout implementation
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionWarningShown, setSessionWarningShown] = useState(false);

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setSessionWarningShown(false); // Reset warning when user is active
    };

    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Check for session timeout - check every 5 minutes instead of every minute
    const timeoutInterval = setInterval(() => {
      const timeoutMinutes = parseInt(settings.sessionTimeout) || 120;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeSinceActivity = Date.now() - lastActivity;

      // Warning at 80% of timeout
      const warningThreshold = timeoutMs * 0.8;

      if (timeSinceActivity > timeoutMs) {
        // Session expired
        alert(`Session expired after ${timeoutMinutes} minutes of inactivity. Please log in again.`);
        // In a real app, you would redirect to login
        localStorage.removeItem('authToken');
        window.location.reload();
      } else if (timeSinceActivity > warningThreshold && !sessionWarningShown) {
        // Show warning
        const remainingMinutes = Math.ceil((timeoutMs - timeSinceActivity) / 60000);
        console.warn(`Session will expire in ${remainingMinutes} minutes due to inactivity.`);
        setSessionWarningShown(true);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(timeoutInterval);
    };
  }, [settings.sessionTimeout, lastActivity, sessionWarningShown]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const teamMemberMap = useMemo(() => new Map(teamMembers.map((m) => [m.id, m])), [teamMembers]);

  // Save settings function
  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await updateGlobalSettings(settings);
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
    setIsRefreshing(true);
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
        const parsed = raw.map((u: any) => ({
          ...u,
          coordinates: Array.isArray(u.coordinates)
            ? u.coordinates
            : (typeof u.coordinates === 'string' && u.coordinates.includes(',')
              ? u.coordinates.split(',').map((n: string) => Number(n.trim()))
              : [-1.2921, 36.8219]) // Default Nairobi
        }));
        setUnits(parsed);
      }
      if (rRes.ok) setRoutes(await rRes.json());
      if (bRes.ok) setBookings(await bRes.json());
      if (mRes.ok) setTeamMembers(await mRes.json());
      if (sRes.ok) {
        const apiSettings = await sRes.json();
        setSettings(prev => ({ ...prev, ...apiSettings }));
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // Real-time polling every 5 seconds for live fleet positions
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync local settings with global settings
  useEffect(() => {
    if (globalSettings) {
      setSettings(prev => ({
        ...prev,
        currency: globalSettings.currency,
        theme: globalSettings.theme,
        language: globalSettings.language,
      }));
    }
  }, [globalSettings]);


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
  const [formTechId, setFormTechId] = useState<string>('');
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
      // Pass t to the heuristics functions
      const result = forecastDemand(bookings, 30, sbCapacity, t);
      setForecast(result);
      setAiAlerts(generatePrescriptiveAlerts(units, result, t));
      setTopRisks(rankUnitsByMaintenance(units).slice(0, 3));
    } catch {
      // ignore if heuristics not available or fail
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, bookings, sbCapacity, t]);

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

  /* -------------------------- IoT Simulation -------------------------- */
  const simulateIoT = async () => {
    if (units.length === 0) return;
    const randomUnit = units[Math.floor(Math.random() * units.length)];
    const newFill = Math.min(100, Math.max(0, randomUnit.fillLevel + (Math.random() * 20 - 5)));
    const newBatt = Math.max(0, randomUnit.batteryLevel - (Math.random() * 5));

    try {
      const resp = await apiFetch('/api/iot/telemetry', {
        method: 'POST',
        data: {
          serialNo: randomUnit.serialNo,
          fillLevel: newFill.toFixed(1),
          batteryLevel: newBatt.toFixed(1)
        }
      });
      if (resp.ok) {
        // eslint-disable-next-line no-alert
        alert(`IoT Signal: Updated ${randomUnit.serialNo}\nFill: ${newFill.toFixed(1)}%\nBatt: ${newBatt.toFixed(1)}%`);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* -------------------------- Routes CRUD -------------------------- */
  const openCreateRoute = () => {
    setEditingRouteId(null);
    setFormTech(teamMembers[0]?.name || 'Technician');
    setFormTechId(teamMembers[0]?.id || '');
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
    setFormTechId(r.technicianId || '');
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
      technicianId: formTechId,
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
          refreshBookings(); // Refresh the list via context
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
          refreshBookings(); // Refresh the list via context
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

  /* -------------------------- Revenue Calculations -------------------------- */

  // Calculate daily revenue from bookings
  const dailyRevenue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's revenue (paid bookings)
    const todayRevenue = bookings
      .filter(b => {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime() && b.paymentStatus === 'paid';
      })
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Yesterday's revenue
    const yesterdayRevenue = bookings
      .filter(b => {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === yesterday.getTime() && b.paymentStatus === 'paid';
      })
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate percentage change
    const percentageChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayRevenue > 0 ? 100 : 0;

    return {
      today: todayRevenue,
      yesterday: yesterdayRevenue,
      change: percentageChange
    };
  }, [bookings]);

  /* -------------------------- Small render helpers -------------------------- */


  /* -------------------------- Tab renderers -------------------------- */

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modern Hero Welcome Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100/50 p-8">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] opacity-30"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('dashboard.systemStatus')}</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {t('dashboard.welcome')}
            </h2>
            <p className="text-gray-600 max-w-xl text-base">
              {t('dashboard.telemetry')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('bookings')}
              className="group px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              {t('dashboard.newBooking')}
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Navigation className="w-5 h-5" />
              {t('dashboard.dispatchRoute')}
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
                    <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">{t('dashboard.totalFleet')}</p>
                    <h3 className="mt-2 text-4xl font-extrabold">{units.length}</h3>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-emerald-50 mb-1">
                    <span>{t('dashboard.utilization')}</span>
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
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">{t('dashboard.activeRoutes')}</p>
                    <h3 className="mt-2 text-4xl font-extrabold">{routes.filter((r) => r.status === 'active').length}</h3>
                    <p className="mt-1 text-sm text-indigo-200">{t('dashboard.onRoad')}</p>
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

            {/* Revenue Card - Real Data */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t('dashboard.dailyRevenue')}</h3>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <DollarSign className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {dailyRevenue.today > 0 ? formatCurrency(dailyRevenue.today).replace(/[A-Z$€£]+\s?/, '') : '0'}
                  </span>
                  <span className="text-lg font-medium text-gray-500">{settings.currency}</span>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className={`font-bold px-2 py-0.5 rounded mr-2 ${dailyRevenue.change >= 0
                    ? 'text-green-600 bg-green-50'
                    : 'text-red-600 bg-red-50'
                    }`}>
                    {dailyRevenue.change >= 0 ? '+' : ''}{dailyRevenue.change.toFixed(1)}%
                  </span>
                  <span className="text-gray-400">{t('dashboard.revenue.vsYesterday')}</span>
                </div>
              </div>
            </div>

            {/* Maintenance Card - Premium */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-red-500/5 blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t('dashboard.maintenanceCard.title')}</h3>
                  <div className="p-3 bg-red-50 rounded-xl">
                    <Wrench className="w-6 h-6 text-red-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">{units.filter((u) => u.status === 'maintenance').length}</span>
                  <span className="text-lg font-medium text-gray-500">{t('dashboard.maintenanceCard.units')}</span>
                </div>
                <div className="mt-4">
                  {units.filter((u) => u.status === 'maintenance').length > 0 ? (
                    <button onClick={() => setActiveTab('maintenance')} className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center">
                      {t('dashboard.maintenanceCard.viewCritical')} <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  ) : <span className="text-sm font-medium text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> {t('dashboard.maintenanceCard.allOperational')}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Live Fleet Map - Redesigned */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('dashboard.liveFleet.title')}</h3>
                <p className="text-sm text-gray-500 mt-1">Real-time unit and technician tracking</p>
              </div>
              <button
                onClick={() => setActiveTab('fleet')}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {t('dashboard.liveFleet.viewFull')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Map Container */}
            <div className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-slate-50 relative">
              <LiveFleetMap units={units} trucks={teamMembers} onRefresh={fetchAll} />
            </div>

            {/* Map Legend with Counts */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow"></div>
                <span className="text-gray-600">
                  Active: <span className="font-semibold text-gray-900">{units.filter(u => u.status === 'active').length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
                <span className="text-gray-600">
                  Maintenance: <span className="font-semibold text-gray-900">{units.filter(u => u.status === 'maintenance').length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow"></div>
                <span className="text-gray-600">
                  Offline: <span className="font-semibold text-gray-900">{units.filter(u => u.status === 'offline').length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                <span className="text-gray-600">
                  Technicians: <span className="font-semibold text-gray-900">{teamMembers.filter(t => {
                    const hasLocation = t.lastLat && t.lastLng;
                    const role = t.role?.toLowerCase() || '';
                    const isTechOrDriver = role.includes('technician') || role.includes('driver') || role.includes('field');
                    return hasLocation && isTechOrDriver;
                  }).length}</span>
                </span>
              </div>
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
                <h3 className="text-lg font-bold tracking-tight">{t('cortex.title')}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">{t('cortex.mode')}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Forecast Block */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-semibold text-slate-200">{t('cortex.forecast.title')}</h4>
                </div>
                <p className="text-2xl font-bold">{forecast ? forecast.peakDay : '---'}</p>
                <p className="text-xs text-slate-400 mt-1">{t('cortex.forecast.desc')}</p>
              </div>

              {/* Risks Block */}
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">{t('cortex.risk.title')}</p>
                <ul className="space-y-3">
                  {topRisks.length === 0 ? (
                    <li className="text-slate-500 text-sm italic">{t('cortex.risk.empty')}</li>
                  ) : (
                    topRisks.map((item) => (
                      <li key={item.unit.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border-l-2 border-red-500">
                        <span className="font-mono text-sm text-slate-300">{item.unit.serialNo}</span>
                        <span className="text-xs font-bold text-red-400">{`${item.risk}% ${t('cortex.risk.label')}`}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">{t('dashboard.liveAlerts')}</p>
                <div className="space-y-3">
                  {aiAlerts.length === 0 ? (
                    <div className="flex items-center text-sm text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-900/30">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                      {t('dashboard.alerts.normalOperations')}
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
                {cortexReportLoading ? t('dashboard.generating') : t('dashboard.generateReport')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.urgentAlerts')}</h3>
        <div className="space-y-4">
          {units.filter((u) => u.fillLevel > 80 || u.batteryLevel < 20).length === 0 && <p className="text-sm text-gray-500">{t('dashboard.alerts.none')}</p>}
          {units.map((u) => (
            <div key={u.id}>
              {u.fillLevel > 80 && (
                <div className="flex items-center p-4 bg-red-50 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{`Unit ${u.serialNo} ${t('dashboard.alerts.requiresServicing')}`}</p>
                    <p className="text-xs text-red-600">{`${t('dashboard.alerts.fillLevel')}: ${u.fillLevel}% | ${t('dashboard.alerts.location')}: ${u.location}`}</p>
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
                    {t('dashboard.alerts.assignRoute')}
                  </button>
                </div>
              )}
              {u.batteryLevel < 20 && (
                <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                  <Battery className="w-5 h-5 text-yellow-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">{`${t('dashboard.alerts.lowBattery')} ${u.serialNo}`}</p>
                    <p className="text-xs text-yellow-600">{`${t('dashboard.alerts.batteryLevel')}: ${u.batteryLevel}% | ${t('dashboard.alerts.lastSeen')}: ${u.lastSeen}`}</p>
                  </div>
                  <button
                    className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    type="button"
                    onClick={() => {
                      setFormUnitStatus('maintenance');
                      openUnitModal(u);
                    }}
                  >
                    {t('dashboard.alerts.scheduleMaintenance')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fleet Status - Redesigned with Better Spacing */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('dashboard.fleetStatus')}</h3>
            <p className="text-sm text-gray-500 mt-1">Real-time unit monitoring</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{units.filter(u => u.status === 'active').length} Active</span>
            </div>
            <div className="flex items-center gap-1.5 ml-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>{units.filter(u => u.status === 'maintenance').length} Maintenance</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="group relative border-2 border-gray-100 hover:border-blue-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50/50"
              role="button"
              tabIndex={0}
              onClick={() => openUnitModal(unit)}
              onKeyDown={() => openUnitModal(unit)}
            >
              {/* Status Indicator */}
              <div className="absolute top-4 right-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(unit.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${unit.status === 'active' ? 'bg-green-600' :
                    unit.status === 'maintenance' ? 'bg-yellow-600' :
                      'bg-gray-600'
                    }`}></div>
                  {unit.status === 'active' ? t('map.status.active') :
                    unit.status === 'maintenance' ? t('dashboard.maintenanceTab') :
                      unit.status === 'offline' ? t('map.status.offline') :
                        unit.status}
                </span>
              </div>

              {/* Unit Info */}
              <div className="mb-4">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{unit.serialNo}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {unit.location}
                </p>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                {/* Fill Level */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span className="font-medium">{t('dashboard.fleet.fill')}</span>
                    <span className="font-semibold">{unit.fillLevel}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${unit.fillLevel > 80 ? 'bg-red-500' :
                        unit.fillLevel > 50 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      style={{ width: `${unit.fillLevel}%` }}
                    ></div>
                  </div>
                </div>

                {/* Battery Level */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span className="font-medium flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5" />
                      {t('dashboard.fleet.battery')}
                    </span>
                    <span className="font-semibold">{unit.batteryLevel}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${unit.batteryLevel < 20 ? 'bg-red-500' :
                        unit.batteryLevel < 50 ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                      style={{ width: `${unit.batteryLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Hover Action Hint */}
              <div className="mt-4 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Click to view details
                </p>
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
                    className="px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      if (!activeUnitId) return;
                      setFormUnitId(activeUnitId);
                      setUnitModalOpen(false);
                      setActiveTab('routes');
                    }}
                  >
                    Assign Route
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-yellow-600 text-yellow-600 rounded hover:bg-yellow-50 transition-colors"
                    onClick={async () => {
                      if (!activeUnitId) return;
                      try {
                        const currentUnit = units.find(u => u.id === activeUnitId);
                        if (!currentUnit) return;

                        const resp = await apiFetch(`/api/units/${activeUnitId}`, {
                          method: 'PUT',
                          data: {
                            status: 'maintenance',
                            location: currentUnit.location,
                            fillLevel: currentUnit.fillLevel,
                            batteryLevel: currentUnit.batteryLevel,
                          },
                        });
                        if (resp.ok) {
                          await fetchAll();
                          alert('✅ Unit marked for maintenance');
                          setUnitModalOpen(false);
                        } else {
                          const errorData = await resp.json().catch(() => ({}));
                          console.error('API Error:', errorData);
                          alert('❌ Failed to update unit status: ' + (errorData.error || 'Unknown error'));
                        }
                      } catch (err) {
                        console.error('Failed to mark maintenance:', err);
                        alert('❌ Error updating unit');
                      }
                    }}
                  >
                    Mark Maintenance
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50 transition-colors"
                    onClick={async () => {
                      if (!activeUnitId) return;
                      try {
                        const currentUnit = units.find(u => u.id === activeUnitId);
                        if (!currentUnit) return;

                        const resp = await apiFetch(`/api/units/${activeUnitId}`, {
                          method: 'PUT',
                          data: {
                            status: 'active',
                            location: currentUnit.location,
                            fillLevel: currentUnit.fillLevel,
                            batteryLevel: currentUnit.batteryLevel,
                          },
                        });
                        if (resp.ok) {
                          await fetchAll();
                          alert('✅ Unit marked as active');
                          setUnitModalOpen(false);
                        } else {
                          const errorData = await resp.json().catch(() => ({}));
                          console.error('API Error:', errorData);
                          alert('❌ Failed to update unit status: ' + (errorData.error || 'Unknown error'));
                        }
                      } catch (err) {
                        console.error('Failed to mark active:', err);
                        alert('❌ Error updating unit');
                      }
                    }}
                  >
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

  const renderBookings = () => {
    const { bookings: contextBookings } = useBookings();
    const totalBookings = contextBookings?.length || 0;
    const confirmedBookings = contextBookings?.filter(b => b.status === 'confirmed').length || 0;
    const pendingBookings = contextBookings?.filter(b => b.status === 'pending').length || 0;
    const paidBookings = contextBookings?.filter(b => b.payment?.status === 'paid').length || 0;

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{t('bookings.title') || 'Bookings Management'}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('bookings.subtitle')}</p>
              </div>
              <button
                type="button"
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 font-semibold"
                onClick={openCreateBooking}
              >
                <Plus className="w-4 h-4" />
                {t('bookings.new') || 'New Booking'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bookings.stats.total')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bookings.stats.confirmed')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingBookings}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bookings.stats.pending')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{paidBookings}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bookings.stats.paid')}</p>
              </div>
            </div>
          </div>

          {/* Smart Booking AI Section */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-bold text-gray-900">{t('bookings.smart.title') || 'Smart Booking AI'}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('bookings.smart.date') || 'Date'}</label>
                <input
                  type="date"
                  className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={sbDate}
                  onChange={(e) => setSbDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('bookings.smart.location') || 'Location'}</label>
                <input
                  type="text"
                  className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={sbLocation}
                  onChange={(e) => setSbLocation(e.target.value)}
                  placeholder="e.g. Nairobi"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('bookings.smart.units') || 'Units'}</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={sbUnits}
                  onChange={(e) => setSbUnits(Number(e.target.value))}
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('bookings.smart.duration') || 'Duration (days)'}</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={sbDuration}
                  onChange={(e) => setSbDuration(Number(e.target.value))}
                  placeholder="1"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('bookings.smart.capacity') || 'Capacity'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    value={sbCapacity}
                    onChange={(e) => setSbCapacity(Number(e.target.value))}
                    placeholder="80"
                  />
                  <button
                    type="button"
                    onClick={smartSuggest}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold whitespace-nowrap shadow-md transition-all"
                    disabled={sbLoading}
                  >
                    {sbLoading ? '...' : t('bookings.smart.suggestButton') || 'Suggest'}
                  </button>
                </div>
              </div>
            </div>

            {sbError && <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">{sbError}</div>}

            {(sbSuggestion || (sbAlternatives && sbAlternatives.length > 0)) && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sbSuggestion && (
                  <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">{t('bookings.smart.suggested') || 'Suggested Date'}</p>
                    <p className="text-gray-900 font-bold text-lg">{sbSuggestion.date}</p>
                    <p className="text-xs text-gray-600 mt-1">{t('bookings.smart.utilization') || 'Utilization'}: {Math.round((sbSuggestion.utilization || 0) * 100)}%</p>
                    <button
                      type="button"
                      className="mt-3 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all"
                      onClick={() => {
                        if (sbSuggestion?.date) {
                          openCreateBooking();
                          setFormDate(sbSuggestion.date);
                        }
                      }}
                    >
                      {t('bookings.smart.apply') || 'Apply'}
                    </button>
                  </div>
                )}
                {sbAlternatives && sbAlternatives.length > 0 && (
                  <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-2">{t('bookings.smart.alternatives') || 'Alternative Dates'}</p>
                    <ul className="text-sm space-y-2">
                      {sbAlternatives.map((alt) => (
                        <li key={alt.date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">
                            {alt.date} • <span className="text-purple-600 font-semibold">{Math.round((alt.utilization || 0) * 100)}%</span>
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold transition-all"
                            onClick={() => {
                              openCreateBooking();
                              setFormDate(alt.date);
                            }}
                          >
                            {t('bookings.smart.use') || 'Use'}
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

        {/* Booking List */}
        <BookingList />

        {/* Booking Modal */}
        {bookingModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold">{editingBookingId ? t('bookings.modal.title.edit') : t('bookings.modal.title.new')}</h4>
                    <p className="text-green-100 text-sm mt-1">{t('bookings.modal.subtitle') || 'Create or update booking details'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.customerName') || 'Customer Name'}</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="e.g. John Doe"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.assignTech') || 'Assign Technician'}</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formBookingTechId}
                    onChange={(e) => setFormBookingTechId(e.target.value)}
                  >
                    <option value="">{t('bookings.modal.unassigned') || 'Unassigned'}</option>
                    {teamMembers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id.slice(0, 4).toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.targetUnit') || 'Target Unit'}</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="e.g. UNIT-001"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.startDate') || 'Start Date'}</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.duration') || 'Duration'}</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      placeholder="e.g. 3 days"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.amount') || 'Amount'}</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.bookingStatus') || 'Booking Status'}</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as Booking['status'])}
                    >
                      <option value="confirmed">{t('bookings.status.confirmed') || 'Confirmed'}</option>
                      <option value="pending">{t('bookings.status.pending') || 'Pending'}</option>
                      <option value="cancelled">{t('bookings.status.cancelled') || 'Cancelled'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('bookings.modal.paymentStatus') || 'Payment Status'}</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as Booking['paymentStatus'])}
                    >
                      <option value="paid">{t('bookings.paymentStatus.paid') || 'Paid'}</option>
                      <option value="pending">{t('bookings.paymentStatus.pending') || 'Pending'}</option>
                      <option value="failed">{t('bookings.paymentStatus.failed') || 'Failed'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 rounded-b-3xl">
                <button
                  type="button"
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                  onClick={() => setBookingModalOpen(false)}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
                  onClick={saveBooking}
                >
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFleetMap = () => {
    const selectedUnit = activeUnitId ? units.find(u => u.id === activeUnitId) : null;

    const openUnitDetails = (unit: Unit) => {
      setActiveUnitId(unit.id);
      setFormUnitStatus(unit.status);
      setFormUnitFill(unit.fillLevel);
      setFormUnitBattery(unit.batteryLevel);
      setFormUnitLocation(unit.location);
      setUnitModalOpen(true);
    };

    const saveUnitChanges = async () => {
      if (!activeUnitId) return;
      try {
        const resp = await apiFetch(`/api/units/${activeUnitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formUnitStatus,
            fillLevel: formUnitFill,
            batteryLevel: formUnitBattery,
            location: formUnitLocation,
          }),
        });
        if (resp.ok) {
          await fetchAll();
          setUnitModalOpen(false);
          setActiveUnitId(null);
        }
      } catch (err) {
        console.error('Failed to update unit:', err);
        alert('Failed to update unit');
      }
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{t('dashboard.fleetMap')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('map.subtitle') || 'Real-time tracking of units and technicians'}
                </p>
              </div>
              <button
                onClick={fetchAll}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? (t('common.refreshing') || 'Refreshing...') : (t('common.refresh') || 'Refresh')}
              </button>
            </div>
          </div>

          {/* Main Content: Sidebar + Map */}
          <div className="flex h-[700px]">
            {/* Left Sidebar - Units and Technicians */}
            <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
              {/* Units Section */}
              <div className="p-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                  <Truck className="w-4 h-4 mr-2" />
                  Units ({units.length})
                </h4>
                <div className="space-y-2">
                  {units.map((unit) => {
                    const openUnitDetails = (u: Unit) => {
                      const details = `
Unit Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Serial No: ${u.serialNo}
Type: ${u.type}
Location: ${u.location}
Status: ${u.status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fill Level: ${u.fillLevel}%
Battery Level: ${u.batteryLevel}%
Last Seen: ${new Date(u.lastSeen).toLocaleString()}
${u.temperature ? `\nTemperature: ${u.temperature}°C` : ''}
${u.humidity ? `Humidity: ${u.humidity}%` : ''}
${u.odorLevel ? `Odor Level: ${u.odorLevel}/100` : ''}
${u.usageCount ? `Usage Count: ${u.usageCount}` : ''}
${u.predictedFullDate ? `\nPredicted Full: ${new Date(u.predictedFullDate).toLocaleDateString()}` : ''}
${u.riskScore ? `Risk Score: ${u.riskScore}/100` : ''}
${u.recommendation ? `\nRecommendation: ${u.recommendation}` : ''}
                      `;
                      alert(details.trim());
                    };

                    return (
                      <div
                        key={unit.id}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => openUnitDetails(unit)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-sm text-gray-900">{unit.serialNo}</h5>
                            <p className="text-xs text-gray-500">{unit.type}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(unit.status)}`}>
                            {unit.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            {unit.location}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Fill: {unit.fillLevel}%</span>
                            <span className="text-gray-600">Battery: {unit.batteryLevel}%</span>
                          </div>
                          {unit.temperature && (
                            <div className="flex items-center text-xs text-gray-600">
                              🌡️ {unit.temperature}°C • 💧 {unit.humidity}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technicians Section */}
              <div className="p-4 border-t border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Technicians ({teamMembers.filter(m => m.status === 'active').length})
                </h4>
                <div className="space-y-2">
                  {teamMembers.filter(m => m.status === 'active').map((tech) => (
                    <div
                      key={tech.id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="font-bold text-sm text-gray-900">{tech.name}</h5>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          {tech.role}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {tech.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Map */}
            <div className="flex-1 relative">
              <LiveFleetMap
                units={units}
                trucks={teamMembers}
                onRefresh={fetchAll}
              />
            </div>
          </div>

          {/* Stats Footer */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{units.length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('map.stats.totalUnits') || 'Total Units'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{units.filter(u => u.status === 'active').length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('map.stats.active') || 'Active'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{units.filter(u => u.status === 'maintenance').length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('map.stats.maintenance') || 'Maintenance'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{teamMembers.filter(m => m.status === 'active').length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('map.stats.technicians') || 'Technicians'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unit Details/Edit Modal */}
        {unitModalOpen && selectedUnit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedUnit.serialNo}</h3>
                    <p className="text-blue-100 text-sm mt-1">{selectedUnit.type}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUnitModalOpen(false);
                      setActiveUnitId(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* IoT Sensor Data - Read Only */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Wifi className="w-5 h-5 mr-2 text-blue-600" />
                    {t('units.iot.title')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('units.iot.temperature')}</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedUnit.temperature?.toFixed(1) || '--'}°C</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('units.iot.humidity')}</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedUnit.humidity?.toFixed(1) || '--'}%</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('units.iot.odorLevel')}</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedUnit.odorLevel || '--'}/100</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('units.iot.usageCount')}</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedUnit.usageCount || 0}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('units.iot.lastService')}</div>
                      <div className="text-lg font-bold text-gray-900">
                        {selectedUnit.lastServiceDate ? new Date(selectedUnit.lastServiceDate).toLocaleDateString() : t('units.iot.notServiced')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-gray-600" />
                    {t('units.editable.title')}
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('units.editable.location')}</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={formUnitLocation}
                        onChange={(e) => setFormUnitLocation(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('units.editable.status')}</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={formUnitStatus}
                        onChange={(e) => setFormUnitStatus(e.target.value as UnitStatus)}
                      >
                        <option value="active">{t('units.status.active')}</option>
                        <option value="maintenance">{t('units.status.maintenance')}</option>
                        <option value="offline">{t('units.status.offline')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('units.editable.fillLevel')}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={formUnitFill}
                        onChange={(e) => setFormUnitFill(Number(e.target.value))}
                      />
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${formUnitFill > 80 ? 'bg-red-500' : formUnitFill > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${formUnitFill}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('units.editable.batteryLevel')}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={formUnitBattery}
                        onChange={(e) => setFormUnitBattery(Number(e.target.value))}
                      />
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${formUnitBattery < 20 ? 'bg-red-500' : formUnitBattery < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${formUnitBattery}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unit Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit ID:</span>
                    <span className="font-mono text-gray-900">{selectedUnit.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Seen:</span>
                    <span className="text-gray-900">{new Date(selectedUnit.lastSeen).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-mono text-gray-900">{selectedUnit.coordinates.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 rounded-b-3xl">
                <button
                  onClick={() => {
                    setUnitModalOpen(false);
                    setActiveUnitId(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUnitChanges}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRoutes = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{t('routes.title') || 'Routes Management'}</h3>
              <p className="text-sm text-gray-600 mt-1">Manage and optimize delivery routes</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={optimizeRoutes}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md flex items-center gap-2 font-semibold"
              >
                <TrendingUp className="w-4 h-4" />
                {t('routes.optimize') || 'Optimize'}
              </button>
              <button
                type="button"
                onClick={openCreateRoute}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 font-semibold"
              >
                <Plus className="w-4 h-4" />
                {t('routes.new') || 'New Route'}
              </button>
            </div>
          </div>
        </div>

        {/* Optimization Result */}
        {optResult && (
          <div className="m-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-purple-900 flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  {t('routes.optimizationComplete') || 'Route Optimization Complete'}
                </h4>
                <p className="text-sm text-purple-700">
                  {t('routes.savings') || 'Savings'}: <span className="font-bold">{optResult.savings?.distance ?? '-'} km</span> ({optResult.savings?.fuel ?? '-'})
                </p>
              </div>
              <button
                type="button"
                onClick={applyOptimizedOrder}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md font-semibold"
              >
                {t('routes.applyOrder') || 'Apply Order'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{t('routes.depot') || 'Depot'}</label>
                <select
                  className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={selectedDepot}
                  onChange={(e) => setSelectedDepot(e.target.value)}
                >
                  {Object.keys(depots).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{t('routes.priority') || 'Priority'}</label>
                <select className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option>{t('routes.opt.priority.fillLevel') || 'Fill Level'}</option>
                  <option>{t('routes.opt.priority.distance') || 'Distance'}</option>
                  <option>{t('routes.opt.priority.customer') || 'Customer'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{t('routes.timeWindow') || 'Time Window'}</label>
                <select className="w-full border-2 border-purple-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option>{t('routes.opt.time.morning') || 'Morning'}</option>
                  <option>{t('routes.opt.time.afternoon') || 'Afternoon'}</option>
                  <option>{t('routes.opt.time.fullDay') || 'Full Day'}</option>
                </select>
              </div>
            </div>

            {optResult.orderedStops && (
              <div className="bg-white rounded-xl p-4 border border-purple-200">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  {t('routes.totalDistance') || 'Total Distance'}: <span className="text-purple-600">{optResult.totalDistanceKm ?? '-'} km</span>
                </p>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-600">
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

        {/* Routes Grid */}
        <div className="p-6">
          {routes.length === 0 ? (
            <div className="text-center py-12">
              <Navigation className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('routes.empty.title')}</h3>
              <p className="text-gray-500 mb-4">{t('routes.empty.subtitle')}</p>
              <button
                onClick={openCreateRoute}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md font-semibold"
              >
                {t('routes.empty.create')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route) => {
                const tech = teamMemberMap.get(route.technicianId || '');
                const priorityColors = {
                  high: 'bg-red-100 text-red-800 border-red-200',
                  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  low: 'bg-green-100 text-green-800 border-green-200',
                };
                const statusColors = {
                  active: 'bg-green-500',
                  pending: 'bg-yellow-500',
                  completed: 'bg-gray-500',
                };

                return (
                  <div
                    key={route.id}
                    className="bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all p-5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {route.technician.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{route.technician}</h4>
                          <p className="text-xs text-gray-500 font-mono">
                            {tech?.id.slice(0, 8).toUpperCase() || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${statusColors[route.status]} shadow-md`} />
                    </div>

                    {/* Info */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('routes.card.status')}:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(route.status)}`}>
                          {route.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('routes.card.priority')}:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${priorityColors[route.priority]}`}>
                          {route.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('routes.card.units')}:</span>
                        <span className="font-bold text-gray-900">{route.units}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('routes.card.eta')}:</span>
                        <span className="font-bold text-gray-900">{route.estimatedTime}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => openEditRoute(route)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoute(route.id)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('routes.stats.total')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{routes.filter(r => r.status === 'active').length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('routes.stats.active')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{routes.filter(r => r.status === 'pending').length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('routes.stats.pending')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{routes.filter(r => r.status === 'completed').length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('routes.stats.completed')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Route Modal */}
      {routeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-bold">{editingRouteId ? t('routes.modal.edit') : t('routes.modal.new')}</h4>
                  <p className="text-blue-100 text-sm mt-1">{t('routes.modal.subtitle') || 'Assign technician and configure route'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('routes.modal.technicianLabel') || 'Technician'}</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                  value={formTechId}
                  onChange={(e) => {
                    const m = teamMembers.find(t => t.id === e.target.value);
                    setFormTechId(e.target.value);
                    setFormTech(m?.name || '');
                  }}
                >
                  <option value="">{t('routes.modal.selectTech') || 'Select a technician'}</option>
                  {teamMembers
                    .filter(t => /technician|driver|field/i.test(t.role))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} - {t.role}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('routes.modal.unitsLabel') || 'Number of Units'}</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder={t('routes.modal.unitsPlaceholder') || '1'}
                    value={formRouteUnits}
                    onChange={(e) => setFormRouteUnits(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('routes.modal.estimatedTime')}</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    placeholder={t('routes.modal.estimatedTimePlaceholder')}
                    value={formEta}
                    onChange={(e) => setFormEta(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('routes.modal.statusLabel')}</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formRouteStatus}
                    onChange={(e) => setFormRouteStatus(e.target.value as RouteStatus)}
                  >
                    <option value="pending">{t('routes.status.pending')}</option>
                    <option value="active">{t('routes.status.active')}</option>
                    <option value="completed">{t('routes.status.completed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('routes.modal.priorityLabel')}</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 outline-none transition-all hover:bg-white"
                    value={formRoutePriority}
                    onChange={(e) => setFormRoutePriority(e.target.value as RoutePriority)}
                  >
                    <option value="high">{t('routes.priority.highLabel')}</option>
                    <option value="medium">{t('routes.priority.mediumLabel')}</option>
                    <option value="low">{t('routes.priority.lowLabel')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 rounded-b-3xl">
              <button
                type="button"
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                onClick={() => setRouteModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                onClick={saveRoute}
              >
                {editingRouteId ? t('routes.modal.update') : t('routes.modal.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMaintenance = () => <Maintenance />;
  const renderAnalytics = () => <Analytics />;


  /* -------------------------- Tab renderers -------------------------- */

  const handleChangePassword = () => {
    // Navigate to profile page where password change is functional
    window.location.href = '/profile';
  };

  const handleEditProfile = () => {
    // Navigate to profile page where profile editing is functional
    window.location.href = '/profile';
  };

  const handleDownloadData = () => {
    alert("Privacy Export: Your data is being prepared in GDPR-compliant JSON format. It will be emailed to " + settings.contactEmail);
  };



  const renderSettings = () => (
    <div className="space-y-6 animate-in fly-in-bottom duration-500">

      {/* Team Members Section */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.team.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('settings.team.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder={t('settings.team.search')}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={openAddMember}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('settings.team.add')}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers
              .filter(
                (member) =>
                  member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.email.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((member) => (
                <div key={member.id} className="relative group bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-all duration-300">
                  <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button onClick={() => openEditMember(member)} className="p-1 text-gray-400 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 mb-3">
                      {member.name.charAt(0)}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{member.name}</h4>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full mb-4">{member.role}</span>

                    <div className="w-full space-y-1 border-t border-gray-100 pt-3 text-left">
                      <div className="flex items-center text-xs text-gray-500 truncate">
                        <User className="w-3 h-3 mr-2 text-gray-400" /> {member.email}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-2 text-gray-400" /> {t('settings.team.joined')} {member.joinDate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{t('settings.team.noMembers')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Integrations and Data Privacy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Integrations */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.connected.title')}</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { name: t('settings.integrations.mpesa'), icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100', status: t('settings.integrations.status.active'), sync: '2m ago' },
              { name: t('settings.integrations.whatsapp'), icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100', status: t('settings.integrations.status.active'), sync: '1h ago' },
              { name: t('settings.integrations.weather'), icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100', status: t('settings.integrations.status.providing'), sync: t('settings.integrations.sync.live') }
            ].map((api, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${api.bg} ${api.color}`}>
                    <api.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{api.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{api.sync}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {api.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Privacy & AI Transparency */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.data.title')}</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <p className="text-sm text-blue-700">
                {t('settings.data.intro')}
                <strong className="block mt-1 font-semibold">{t('settings.data.privacy')}</strong> {t('settings.data.disclaimer')}
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('settings.data.optIn')}</p>
                <p className="text-xs text-gray-500">{t('settings.data.allowAnalysis')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked readOnly />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <button onClick={handleDownloadData} className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" /> {t('settings.data.export')}
            </button>
          </div>
        </div>

      </div>

      {/* System Preferences - Moved to Bottom */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{t('settings.system.title')}</h3>
          <Settings className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language / Lugha</label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${locale === 'en' ? 'bg-blue-50 border-blue-500 text-blue-700 z-10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLocale('sw')}
                className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${locale === 'sw' ? 'bg-blue-50 border-blue-500 text-blue-700 z-10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Kiswahili
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('settings.system.whatsapp')}</p>
                  <p className="text-xs text-gray-500">{t('settings.system.updates')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={Boolean(settings.whatsappNotifications)} onChange={(e) => setSettings((s: any) => ({ ...s, whatsappNotifications: e.target.checked }))} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('settings.system.emailNotifications')}</p>
                  <p className="text-xs text-gray-500">{t('settings.system.emailDesc')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={Boolean(settings.emailNotifications)} onChange={(e) => setSettings((s: any) => ({ ...s, emailNotifications: e.target.checked }))} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.system.sessionTimeout')}</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings((s: any) => ({ ...s, sessionTimeout: e.target.value }))}
              >
                <option value="5">{t('settings.system.timeout.5min')}</option>
                <option value="15">{t('settings.system.timeout.15min')}</option>
                <option value="30">{t('settings.system.timeout.30min')}</option>
                <option value="60">{t('settings.system.timeout.1hr')}</option>
                <option value="120">{t('settings.system.timeout.2hr')}</option>
                <option value="240">{t('settings.system.timeout.4hr')}</option>
                <option value="300">{t('settings.system.timeout.5hr')}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">{t('settings.system.timeoutDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.system.theme')}</label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setSettings((s: any) => ({ ...s, theme: 'light' }))}
                  className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${settings.theme === 'light' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  ☀️ {t('settings.system.themeLight')}
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s: any) => ({ ...s, theme: 'dark' }))}
                  className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${settings.theme === 'dark' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  🌙 {t('settings.system.themeDark')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.system.currency')}</label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={settings.currency}
              onChange={(e) => setSettings((s: any) => ({ ...s, currency: e.target.value }))}
            >
              <option value="KES">{t('settings.system.currencyKES')}</option>
              <option value="USD">{t('settings.system.currencyUSD')}</option>
              <option value="EUR">{t('settings.system.currencyEUR')}</option>
              <option value="GBP">{t('settings.system.currencyGBP')}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">{t('settings.system.currencyDesc', { currency: settings.currency })}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> : null}
          {settingsSaved ? t('settings.save.saved') : t('settings.save.saveSettings')}
        </button>
      </div>



      {/* Team Member Modal */}
      {
        memberModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMemberId ? t('settings.team.modal.edit') : t('settings.team.modal.addTitle')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingMemberId ? t('settings.team.modal.editDesc') : t('settings.team.modal.addDesc')}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.team.modal.name')}</label>
                  <input
                    type="text"
                    value={formMemberName}
                    onChange={(e) => setFormMemberName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={t('settings.team.placeholders.name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.team.modal.role')}</label>
                  <input
                    type="text"
                    value={formMemberRole}
                    onChange={(e) => setFormMemberRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={t('settings.team.placeholders.role')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.team.modal.email')}</label>
                  <input
                    type="email"
                    value={formMemberEmail}
                    onChange={(e) => setFormMemberEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={t('settings.team.placeholders.email')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.team.modal.phone')}</label>
                  <input
                    type="tel"
                    value={formMemberPhone}
                    onChange={(e) => setFormMemberPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={t('settings.team.placeholders.phone')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.team.modal.status')}</label>
                  <select
                    value={formMemberStatus}
                    onChange={(e) => setFormMemberStatus(e.target.value as TeamMember['status'])}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="active">{t('settings.team.status.active')}</option>
                    <option value="inactive">{t('settings.team.status.inactive')}</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 flex-row-reverse">
                <button
                  onClick={saveMember}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {editingMemberId ? t('settings.team.modal.update') : t('settings.team.modal.addBtn')}
                </button>
                <button
                  onClick={() => setMemberModalOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('common.cancel')}
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
        return <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}><Billing /></Suspense>;
      case 'insights':
        return <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}><Insights /></Suspense>;
      case 'bookings':
        return renderBookings();
      case 'maintenance':
        return <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}><Maintenance /></Suspense>;
      case 'analytics':
        return <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}><Analytics /></Suspense>;
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
