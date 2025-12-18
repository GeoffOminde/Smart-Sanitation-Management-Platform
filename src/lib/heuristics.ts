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
  capacityPerDay = 80,
  t?: (key: string, params?: any) => string
): ForecastResult => {
  const dailyCounts: Record<string, number> = {};
  bookings.forEach((booking) => {
    const date = new Date(booking.date);
    if (!isNaN(date.getTime())) {
      const day = date.toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
  });

  const sortedDays = Object.keys(dailyCounts).sort();
  const totalDays = Math.max(1, sortedDays.length);
  const totalBookings = Object.values(dailyCounts).reduce((sum, value) => sum + value, 0);
  const historicAvg = Number((totalBookings / totalDays).toFixed(1));

  // AI: Linear Regression
  const x = Array.from({ length: totalDays }, (_, i) => i);
  const y = sortedDays.map(day => dailyCounts[day]);

  let predictedAvg = historicAvg;

  // Only apply regression if we have sufficient data points trend
  if (totalDays > 3) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict average load over the horizon
    let futureSum = 0;
    for (let i = 1; i <= horizonDays; i++) {
      futureSum += (slope * (n + i) + intercept);
    }
    predictedAvg = Math.max(0, futureSum / horizonDays);
  }

  // Weighted Model: 60% Historic, 40% Trend
  const finalAvg = (historicAvg * 0.6) + (predictedAvg * 0.4);

  const peakDay = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : 'N/A';
  const capacityGap = Math.max(0, Math.ceil(finalAvg - capacityPerDay));

  // Use t if available, otherwise fallback
  const _t = t || ((k: string, p?: any) => {
    if (k === 'cortex.forecast.horizon.multi') return `over the next ${p.days} days`;
    if (k === 'cortex.forecast.horizon.today') return 'today';
    if (k === 'cortex.forecast.deploy') return `Deploy ${p.gap} additional unit${p.plural} ahead of the ${p.peakDay} peak ${p.horizon}.`;
    if (k === 'cortex.forecast.sufficient') return `Current fleet should cover demand ${p.horizon}.`;
    return k;
  });

  const horizonText = horizonDays > 1
    ? _t('cortex.forecast.horizon.multi', { days: horizonDays })
    : _t('cortex.forecast.horizon.today', {});

  const suggestion =
    capacityGap > 0
      ? _t('cortex.forecast.deploy', { gap: capacityGap, plural: capacityGap > 1 ? 's' : '', peakDay, horizon: horizonText })
      : _t('cortex.forecast.sufficient', { horizon: horizonText });

  return { peakDay, avgDailyBookings: Number(finalAvg.toFixed(1)), capacityGap, suggestion };
};

export const generatePrescriptiveAlerts = (
  units: Unit[],
  forecast: ForecastResult,
  t?: (key: string, params?: any) => string
): string[] => {
  const alerts: string[] = [];

  // Use t if available, otherwise fallback
  const _t = t || ((k: string, p?: any) => {
    if (k === 'cortex.alerts.priority') return `Priority maintenance advised for ${p.names} (risk ${p.risk}%).`;
    if (k === 'cortex.alerts.charge') return `Charge ${p.names} soon (battery < 25%).`;
    if (k === 'cortex.alerts.surge') return `Demand surge expected on ${p.peakDay}. ${p.suggestion}`;
    if (k === 'cortex.alerts.none') return 'No alerts. System operating within expected thresholds.';
    return k;
  });

  const highRisk = rankUnitsByMaintenance(units).filter((item) => item.risk >= 70);
  if (highRisk.length > 0) {
    const names = highRisk.slice(0, 3).map((item) => item.unit.serialNo);
    alerts.push(
      _t('cortex.alerts.priority', { names: names.join(', '), risk: highRisk[0].risk })
    );
  }

  const lowBattery = units.filter((unit) => unit.batteryLevel < 25 && unit.status === 'active');
  if (lowBattery.length > 0) {
    const sample = lowBattery.slice(0, 2).map((unit) => unit.serialNo);
    alerts.push(_t('cortex.alerts.charge', { names: sample.join(', ') }));
  }

  if (forecast.capacityGap > 0) {
    alerts.push(_t('cortex.alerts.surge', { peakDay: forecast.peakDay, suggestion: forecast.suggestion }));
  }

  if (alerts.length === 0) {
    alerts.push(_t('cortex.alerts.none', {}));
  }

  return alerts;
};
