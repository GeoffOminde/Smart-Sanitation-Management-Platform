// Lightweight demand forecasting utilities (classical heuristics)
// No external ML dependencies.

function parseDate(d) {
  const t = new Date(d);
  return isNaN(t.getTime()) ? new Date() : t;
}

// Group historical bookings by day and return an array of { date: 'YYYY-MM-DD', count }
function dailyCounts(bookings = []) {
  const byDay = new Map();
  for (const b of bookings) {
    const dt = parseDate(b.date);
    const key = dt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  const arr = Array.from(byDay.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  return arr;
}

function movingAverage(arr, window) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= window) sum -= arr[i - window];
    out.push(i >= window - 1 ? sum / window : arr[i]);
  }
  return out;
}

// Very simple seasonal naive + moving average blend for daily demand
// Input: bookings [{ date: ISO, ... }], horizonDays number, capacityPerDay optional
function forecastBookings(bookings = [], horizonDays = 30, capacityPerDay = 0) {
  const daily = dailyCounts(bookings);
  const counts = daily.map((d) => d.count);
  const dates = daily.map((d) => d.date);

  // Moving average smoothing (7-day window)
  const ma = movingAverage(counts, 7);

  // Seasonal naive (weekly): use value from 7 days ago if exists
  const seasonal = counts.map((_, i) => (i >= 7 ? counts[i - 7] : counts[i]));

  // Blend
  const blend = counts.map((_, i) => 0.6 * (ma[i] || counts[i]) + 0.4 * (seasonal[i] || counts[i]));

  const lastDate = dates.length ? new Date(dates[dates.length - 1]) : new Date();

  // Forecast next horizon days using last 7-day average as baseline
  const lastWeek = blend.slice(-7);
  const baseline = lastWeek.length ? lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length : (counts[counts.length - 1] || 1);

  const forecasts = [];
  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    const dowAdj = dayOfWeekAdjustment(d.getDay());
    const y = Math.max(0, baseline * dowAdj);
    forecasts.push({ date: d.toISOString().slice(0, 10), forecast: Number(y.toFixed(2)) });
  }

  // Utilization estimate if capacity provided
  let utilization = null;
  if (capacityPerDay && capacityPerDay > 0) {
    const avgForecast = forecasts.reduce((a, b) => a + b.forecast, 0) / forecasts.length;
    utilization = Number(Math.min(1, avgForecast / capacityPerDay).toFixed(2));
  }

  const summary = {
    avgDailyForecast: Number((forecasts.reduce((a, b) => a + b.forecast, 0) / forecasts.length).toFixed(2)),
    peakDay: forecasts.reduce((max, curr) => (curr.forecast > max.forecast ? curr : max), forecasts[0] || { date: null, forecast: 0 }),
  };

  const recommendation = buildRecommendation(utilization, forecasts);

  return { forecasts, summary, utilization, recommendation };
}

function dayOfWeekAdjustment(dow) {
  // Simple weekly pattern: weekends lower demand, mid-week slightly higher
  // 0=Sun, 6=Sat
  switch (dow) {
    case 0:
    case 6:
      return 0.85; // weekend dip
    case 3:
    case 4:
      return 1.1; // Wed/Thu slight bump
    default:
      return 1.0;
  }
}

function buildRecommendation(utilization, forecasts) {
  if (utilization == null) return 'Provide capacity to estimate utilization and deployment needs.';

  // If utilization > 0.85, recommend additional units
  if (utilization > 0.85) {
    const next30 = forecasts.reduce((a, b) => a + b.forecast, 0);
    // Heuristic: recommend extra units to bring utilization near 0.75
    const desiredUtil = 0.75;
    const scale = utilization / desiredUtil;
    const extraUnitsPct = Math.max(0, scale - 1); // percentage more units needed
    const approxUnits = Math.ceil(extraUnitsPct * 100) / 5 * 5; // round to nearest 5%
    return `High demand expected. Deploy ~${Math.round(extraUnitsPct * 100)}% more units over the next month to avoid service degradation.`;
  }

  // If utilization < 0.5, suggest rebalancing
  if (utilization < 0.5) {
    return 'Demand is light. Consider rebalancing units from low-demand areas or running promos.';
  }

  return 'Capacity is adequate. Maintain current deployment with routine monitoring.';
}

module.exports = {
  dailyCounts,
  forecastBookings,
};
