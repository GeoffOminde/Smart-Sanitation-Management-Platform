import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface Settings {
    companyName: string;
    contactEmail: string;
    phone: string;
    language: string;
    sessionTimeout: string;
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    theme: string;
    currency: string;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    formatCurrency: (amount: number) => string;
    isLoading: boolean;
}

const defaultSettings: Settings = {
    companyName: 'Smart Sanitation Co.',
    contactEmail: 'admin@smartsanitation.co.ke',
    phone: '+254 700 000 000',
    language: 'en',
    sessionTimeout: '30',
    emailNotifications: true,
    whatsappNotifications: true,
    theme: 'light',
    currency: 'KES',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await apiFetch('/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateSettings = async (newSettings: Partial<Settings>) => {
        try {
            const response = await apiFetch('/api/settings', {
                method: 'PUT',
                data: { ...settings, ...newSettings },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(prev => ({ ...prev, ...data.settings }));
            } else {
                throw new Error('Failed to update settings');
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    };

    const formatCurrency = (amount: number): string => {
        const currencySymbols: Record<string, string> = {
            'KES': 'KES',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
        };
        const symbol = currencySymbols[settings.currency] || 'KES';
        return `${symbol} ${amount.toLocaleString()}`;
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, formatCurrency, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};
