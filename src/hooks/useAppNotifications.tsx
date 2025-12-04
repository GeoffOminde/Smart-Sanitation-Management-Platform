import { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Hook to generate notifications based on app events
 * This demonstrates how to trigger notifications from various parts of the app
 */
export function useAppNotifications() {
    const { addNotification } = useNotifications();

    // Example: Monitor units and generate notifications for critical states
    const notifyLowBattery = (unitId: string, batteryLevel: number) => {
        if (batteryLevel < 20) {
            addNotification(
                `Low Battery Alert`,
                `Unit ${unitId} battery at ${batteryLevel}%. Immediate attention required.`,
                'warning'
            );
        }
    };

    const notifyHighFillLevel = (unitId: string, fillLevel: number) => {
        if (fillLevel > 80) {
            addNotification(
                `High Fill Level`,
                `Unit ${unitId} is ${fillLevel}% full. Service recommended soon.`,
                'warning'
            );
        }
    };

    const notifyUnitOffline = (unitId: string, lastSeen: string) => {
        addNotification(
            `Unit Offline`,
            `Unit ${unitId} has been offline since ${lastSeen}. Check connection.`,
            'error'
        );
    };

    const notifyBookingConfirmed = (bookingId: string, customer: string) => {
        addNotification(
            `Booking Confirmed`,
            `New booking #${bookingId} from ${customer} has been confirmed.`,
            'success'
        );
    };

    const notifyPaymentReceived = (bookingId: string, amount: number) => {
        addNotification(
            `Payment Received`,
            `Payment of KES ${amount.toLocaleString()} received for booking #${bookingId}.`,
            'success'
        );
    };

    const notifyMaintenanceScheduled = (unitId: string, date: string) => {
        addNotification(
            `Maintenance Scheduled`,
            `Maintenance for Unit ${unitId} scheduled for ${date}.`,
            'info'
        );
    };

    const notifyRouteCompleted = (routeId: string, technician: string) => {
        addNotification(
            `Route Completed`,
            `${technician} has completed route #${routeId}.`,
            'success'
        );
    };

    return {
        notifyLowBattery,
        notifyHighFillLevel,
        notifyUnitOffline,
        notifyBookingConfirmed,
        notifyPaymentReceived,
        notifyMaintenanceScheduled,
        notifyRouteCompleted,
        // Direct access to addNotification for custom notifications
        addNotification,
    };
}

/**
 * Component that monitors units and generates notifications automatically
 * Add this to your Dashboard or main app component
 */
export function NotificationMonitor({ units }: { units: any[] }) {
    const { notifyLowBattery, notifyHighFillLevel, notifyUnitOffline } = useAppNotifications();

    useEffect(() => {
        if (!units || units.length === 0) return;

        units.forEach(unit => {
            // Check battery level
            if (unit.batteryLevel < 20) {
                notifyLowBattery(unit.serialNo, unit.batteryLevel);
            }

            // Check fill level
            if (unit.fillLevel > 80) {
                notifyHighFillLevel(unit.serialNo, unit.fillLevel);
            }

            // Check if offline (more than 1 hour)
            if (unit.status === 'offline') {
                const lastSeenDate = new Date(unit.lastSeen);
                const now = new Date();
                const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);

                if (hoursSinceLastSeen > 1) {
                    notifyUnitOffline(unit.serialNo, lastSeenDate.toLocaleString());
                }
            }
        });
    }, [units, notifyLowBattery, notifyHighFillLevel, notifyUnitOffline]);

    return null; // This component doesn't render anything
}
