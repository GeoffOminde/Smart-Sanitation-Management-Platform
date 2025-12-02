import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Notification {
    id: number;
    title: string;
    body?: string;
    read: boolean;
    time: string;
    timestamp: number;
    type: 'info' | 'warning' | 'error' | 'success';
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (title: string, body?: string, type?: Notification['type']) => void;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

let nextId = 1;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        try {
            const stored = localStorage.getItem('app_notifications');
            if (stored) {
                const parsed = JSON.parse(stored);
                nextId = Math.max(...parsed.map((n: Notification) => n.id), 0) + 1;
                return parsed;
            }
        } catch (e) {
            console.error('Failed to load notifications', e);
        }
        return [];
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('Failed to save notifications', e);
        }
    }, [notifications]);

    const addNotification = (title: string, body?: string, type: Notification['type'] = 'info') => {
        const now = Date.now();
        const newNotification: Notification = {
            id: nextId++,
            title,
            body,
            read: false,
            time: formatRelativeTime(now),
            timestamp: now,
            type,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    };

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    // Update relative times every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setNotifications(prev =>
                prev.map(n => ({
                    ...n,
                    time: formatRelativeTime(n.timestamp),
                }))
            );
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <NotificationContext.Provider
            value={{ notifications, addNotification, markAsRead, markAllAsRead, clearAll, unreadCount }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}
