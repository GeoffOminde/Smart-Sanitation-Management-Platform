import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'sw';

type TranslationKey =
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.quickActions'
  | 'dashboard.overviewTab'
  | 'dashboard.fleetMap'
  | 'dashboard.routesTab'
  | 'dashboard.bookingsTab'
  | 'dashboard.maintenanceTab'
  | 'dashboard.analyticsTab'
  | 'dashboard.unitsTab'
  | 'dashboard.insightsTab'
  | 'dashboard.paymentsTab'
  | 'dashboard.settingsTab'
  | 'dashboard.alertHeading'
  | 'dashboard.alertDescription'
  | 'dashboard.localeLabel'
  | 'dashboard.topRisks'
  | 'dashboard.predictions'
  | 'payments.heading'
  | 'payments.description'
  | 'payments.providersTitle'
  | 'payments.provider.mpesa'
  | 'payments.provider.paystack'
  | 'payments.provider.airtel'
  | 'payments.provider.paypal'
  | 'insights.heading'
  | 'insights.weather'
  | 'insights.ai'
  | 'assistant.title'
  | 'assistant.subtitle';

const baseTranslations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'dashboard.title': 'Smart Sanitation Dashboard',
    'dashboard.subtitle': 'Manage your mobile toilets, routes, bookings, and teams in one place',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.overviewTab': 'Overview',
    'dashboard.fleetMap': 'Fleet Map',
    'dashboard.routesTab': 'Routes',
    'dashboard.bookingsTab': 'Bookings',
    'dashboard.maintenanceTab': 'Maintenance',
    'dashboard.analyticsTab': 'Analytics',
    'dashboard.unitsTab': 'Sanitation Units',
    'dashboard.insightsTab': 'AI Insights',
    'dashboard.paymentsTab': 'Payments',
    'dashboard.settingsTab': 'Settings',
    'dashboard.alertHeading': 'Demand Forecast & Alerts',
    'dashboard.alertDescription': 'AI heuristics warn when battery, fill levels, or demand thresholds need attention.',
    'dashboard.localeLabel': 'Display language',
    'dashboard.topRisks': 'Highest priority units',
    'dashboard.predictions': 'Predicted peak demand',
    'insights.heading': 'Insights',
    'insights.weather': 'Weather intelligence',
    'insights.ai': 'AI forecasts and alerts',
    'payments.heading': 'Payments',
    'payments.description': 'Collect payments, monitor transactions, and keep the pipelines live with regional providers.',
    'payments.providersTitle': 'Regional Payment Providers',
    'payments.provider.mpesa': 'M-Pesa: Widely used mobile money in Kenya and East Africa.',
    'payments.provider.paystack': 'Paystack: Reliable card and bank payments across Africa.',
    'payments.provider.airtel': 'Airtel Money: Backup mobile wallet for coverage gaps.',
    'payments.provider.paypal': 'PayPal: For international corporate settlements.',
    'assistant.title': 'Assistant',
    'assistant.subtitle': 'Rule-based assistant (English / Swahili)',
  },
  sw: {
    'dashboard.title': 'Dashibodi ya Usafi Mahiri',
    'dashboard.subtitle': 'Simamia vyoo vya kubebea, njia, uhifadhi, na timu katika sehemu moja',
    'dashboard.quickActions': 'Vitendo vya Haraka',
    'dashboard.overviewTab': 'Muhtasari',
    'dashboard.fleetMap': 'Ramani ya Baiskeli',
    'dashboard.routesTab': 'Njia',
    'dashboard.bookingsTab': 'Uhifadhi',
    'dashboard.maintenanceTab': 'Matengenezo',
    'dashboard.analyticsTab': 'Tathmini',
    'dashboard.unitsTab': 'Vyoo vya Kusafisha',
    'dashboard.insightsTab': 'Uchambuzi wa AI',
    'dashboard.paymentsTab': 'Malipo',
    'dashboard.settingsTab': 'Mipangilio',
    'dashboard.alertHeading': 'Utabiri wa Mahitaji & Tahadhari',
    'dashboard.alertDescription': 'Uchambuzi wa AI unatayarisha tahadhari kwa betri, kiwango cha kujaza, au mahitaji ya juu.',
    'dashboard.localeLabel': 'Lugha ya kuonyesha',
    'dashboard.topRisks': 'Vyoo vya kipaumbele cha juu',
    'dashboard.predictions': 'Mahitaji yanayotabirika',
    'insights.heading': 'Uchambuzi',
    'insights.weather': 'Habari za Hali ya Hewa',
    'insights.ai': 'Utabiri na tahadhari za AI',
    'payments.heading': 'Malipo',
    'payments.description': 'Pokea malipo, fuatilia miamala, na endelea huduma kupitia watoa huduma wa kikanda.',
    'payments.providersTitle': 'Watoa Huduma za Malipo',
    'payments.provider.mpesa': 'M-Pesa: Fedha za simu maarufu Kenya na Afrika Mashariki.',
    'payments.provider.paystack': 'Paystack: Malipo ya kadi na benki kote Afrika.',
    'payments.provider.airtel': 'Airtel Money: Mfumo wa akiba kwa maeneo ya mipaka.',
    'payments.provider.paypal': 'PayPal: Kwa malipo ya wadau wa kimataifa.',
    'assistant.title': 'Msaidizi',
    'assistant.subtitle': 'Msaidizi wa sheria (Kiingereza / Kiswahili)',
  },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    return stored && (stored === 'en' || stored === 'sw') ? stored : 'en';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = (value: Locale) => setLocaleState(value);

  const t = useMemo(
    () => (key: TranslationKey, replacements?: Record<string, string | number>) => {
      const text = baseTranslations[locale][key] ?? key;
      if (!replacements) return text;
      return Object.entries(replacements).reduce(
        (current, [placeholder, value]) => current.replace(`{${placeholder}}`, String(value)),
        text
      );
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
