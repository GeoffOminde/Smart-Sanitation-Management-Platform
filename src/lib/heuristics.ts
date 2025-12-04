import { Booking, Unit } from '../types';

export interface ForecastResult {
  peakDay: string;
  avgDailyBookings: number;
  capacityGap: number;
  suggestion: string;
}

/**
 * Predicts relative maintenance risk for a unit using fill and battery data.
 */
export const predictMaintenanceRisk = (unit: Unit): number => {
  const fillFactor = unit.fillLevel / 100;
  const batteryFactor = (100 - unit.batteryLevel) / 100;
  const statusPenalty = unit.status === 'maintenance' ? 0.15 : unit.status === 'offline' ? 0.1 : 0;
  const riskScore = Math.min(1, fillFactor * 0.6 + batteryFactor * 0.3 + statusPenalty);
  return Math.round(riskScore * 100);
};

export interface MaintenanceInsight {
  unit: Unit;
  risk: number;
}

export const rankUnitsByMaintenance = (units: Unit[]): MaintenanceInsight[] => {
  return [...units]
    .map((unit) => ({ unit, risk: predictMaintenanceRisk(unit) }))
    .sort((a, b) => b.risk - a.risk);
};

export const forecastDemand = (
  bookings: Booking[],
  horizonDays = 14,
  capacityPerDay = 80
): ForecastResult => {
  const dailyCounts: Record<string, number> = {};
  bookings.forEach((booking) => {
    const date = new Date(booking.date);
    if (Number.isNaN(date.getTime())) return;
    const day = date.toISOString().split('T')[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });

  const totalDays = Math.max(1, Object.keys(dailyCounts).length);
  const totalBookings = Object.values(dailyCounts).reduce((sum, value) => sum + value, 0);
  const avgDailyBookings = Number((totalBookings / totalDays).toFixed(1));
  const peakDay = Object.entries(dailyCounts)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])[0] || 'N/A';
  const capacityGap = Math.max(0, Math.ceil(avgDailyBookings - capacityPerDay));
  const horizonText = horizonDays > 1 ? `over the next ${horizonDays} days` : 'today';
  const suggestion =
    capacityGap > 0
      ? `Deploy ${capacityGap} additional unit${capacityGap > 1 ? 's' : ''} ahead of the ${peakDay} peak ${horizonText}.`
      : `Current fleet should cover demand ${horizonText}.`;

  return { peakDay, avgDailyBookings, capacityGap, suggestion };
};

export const generatePrescriptiveAlerts = (
  units: Unit[],
  forecast: ForecastResult
): string[] => {
  const alerts: string[] = [];
  const highRisk = rankUnitsByMaintenance(units).filter((item) => item.risk >= 70);
  if (highRisk.length > 0) {
    const names = highRisk.slice(0, 3).map((item) => item.unit.serialNo);
    alerts.push(
      `Priority maintenance advised for ${names.join(', ')} (risk ${highRisk[0].risk}%).`
    );
  }

  const lowBattery = units.filter((unit) => unit.batteryLevel < 25 && unit.status === 'active');
  if (lowBattery.length > 0) {
    const sample = lowBattery.slice(0, 2).map((unit) => unit.serialNo);
    alerts.push(`Charge ${sample.join(', ')} soon (battery < 25%).`);
  }

  if (forecast.capacityGap > 0) {
    alerts.push(`Demand surge expected on ${forecast.peakDay}. ${forecast.suggestion}`);
  }

  if (alerts.length === 0) {
    alerts.push('No alerts. System operating within expected thresholds.');
  }

  return alerts;
};
