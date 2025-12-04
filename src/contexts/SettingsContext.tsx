import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    joinDate: string;
}

export interface AppSettings {
    user: {
        name: string;
        email: string;
        phone: string;
        role: string;
        avatar?: string;
    };
    company: {
        companyName: string;
        contactEmail: string;
        phone: string;
        businessLicense: string;
    };
    notifications: {
        enabled: boolean;
        sound: boolean;
        desktop: boolean;
        email: boolean;
        whatsappNotifications: boolean;
        types: {
            payments: boolean;
            bookings: boolean;
            maintenance: boolean;
            system: boolean;
        };
    };
    display: {
        theme: 'light' | 'dark' | 'auto';
        language: 'en' | 'sw';
        dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY';
        currency: 'KES' | 'USD';
        timezone: string;
    };
    app: {
        autoRefresh: boolean;
        refreshInterval: number; // seconds
        defaultView: 'overview' | 'map' | 'bookings';
        unitsPerPage: number;
    };
    system: {
        apiUrl: string;
        enableAnalytics: boolean;
        debugMode: boolean;
        sessionTimeout: string;
    };
    teamMembers: TeamMember[];
}

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
    updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
    deleteTeamMember: (id: string) => void;
    resetToDefaults: () => void;
    isLoading: boolean;
}

const defaultSettings: AppSettings = {
    user: {
        name: 'Admin User',
        email: 'admin@smartsanitation.co.ke',
        phone: '+254 712 345 678',
        role: 'Administrator',
    },
    company: {
        companyName: 'Smart Sanitation Ltd',
        contactEmail: 'contact@smartsanitation.co.ke',
        phone: '+254 700 123 456',
        businessLicense: 'BL-2023-001234',
    },
    notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        email: false,
        whatsappNotifications: true,
        types: {
            payments: true,
            bookings: true,
            maintenance: true,
            system: true,
        },
    },
    display: {
        theme: 'light',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
    },
    app: {
        autoRefresh: true,
        refreshInterval: 30,
        defaultView: 'overview',
        unitsPerPage: 10,
    },
    system: {
        apiUrl: 'http://localhost:3001',
        enableAnalytics: true,
        debugMode: false,
        sessionTimeout: '60',
    },
    teamMembers: [
        {
            id: '1',
            name: 'John Kamau',
            role: 'Fleet Manager',
            email: 'john.kamau@smartsanitation.co.ke',
            phone: '+254 712 345 678',
            status: 'active',
            joinDate: '2023-01-15',
        },
        {
            id: '2',
            name: 'Mary Wanjiku',
            role: 'Operations Coordinator',
            email: 'mary.wanjiku@smartsanitation.co.ke',
            phone: '+254 723 456 789',
            status: 'active',
            joinDate: '2023-02-20',
        },
        {
            id: '3',
            name: 'Peter Omondi',
            role: 'Maintenance Technician',
            email: 'peter.omondi@smartsanitation.co.ke',
            phone: '+254 734 567 890',
            status: 'active',
            joinDate: '2023-03-10',
        },
    ],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('app_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new settings are included
                setSettings({ ...defaultSettings, ...parsed });
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('app_settings', JSON.stringify(settings));
            } catch (e) {
                console.error('Failed to save settings', e);
            }
        }
    }, [settings, isLoading]);

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        if (settings.display.theme === 'dark') {
            root.classList.add('dark');
        } else if (settings.display.theme === 'light') {
            root.classList.remove('dark');
        } else {
            // Auto mode - check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [settings.display.theme]);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => {
            // Deep merge for nested objects
            const merged = { ...prev };

            if (updates.user) merged.user = { ...prev.user, ...updates.user };
            if (updates.company) merged.company = { ...prev.company, ...updates.company };
            if (updates.notifications) {
                merged.notifications = { ...prev.notifications, ...updates.notifications };
                if (updates.notifications.types) {
                    merged.notifications.types = { ...prev.notifications.types, ...updates.notifications.types };
                }
            }
            if (updates.display) merged.display = { ...prev.display, ...updates.display };
            if (updates.app) merged.app = { ...prev.app, ...updates.app };
            if (updates.system) merged.system = { ...prev.system, ...updates.system };
            if (updates.teamMembers) merged.teamMembers = updates.teamMembers;

            return merged;
        });
    };

    const addTeamMember = (member: Omit<TeamMember, 'id'>) => {
        const newMember: TeamMember = {
            ...member,
            id: Date.now().toString(),
        };
        setSettings(prev => ({
            ...prev,
            teamMembers: [...prev.teamMembers, newMember],
        }));
    };

    const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
        setSettings(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.map(member =>
                member.id === id ? { ...member, ...updates } : member
            ),
        }));
    };

    const deleteTeamMember = (id: string) => {
        setSettings(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.filter(member => member.id !== id),
        }));
    };

    const resetToDefaults = () => {
        setSettings(defaultSettings);
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            addTeamMember,
            updateTeamMember,
            deleteTeamMember,
            resetToDefaults,
            isLoading
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
