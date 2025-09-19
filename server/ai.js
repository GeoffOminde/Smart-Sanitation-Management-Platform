// Lightweight AI utilities (heuristic-based) for Predictive Maintenance and Route Optimization
// No external ML dependencies, designed to run anywhere.

function minutesSince(lastSeenIso) {
  try {
    const d = new Date(lastSeenIso);
    const diffMs = Date.now() - d.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  } catch {
    return 0;
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Haversine distance in kilometers
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Predictive maintenance scoring
// Input unit shape expected:
// { id, serialNo, location, fillLevel (0-100), batteryLevel (0-100), lastSeen (ISO string), coordinates: [lat, lon] }
function predictMaintenance(units = []) {
  return units.map((u) => {
    const fill = Number(u.fillLevel) || 0;
    const batt = Number(u.batteryLevel) || 0;
    const mins = minutesSince(u.lastSeen || new Date().toISOString());

    // Feature heuristics
    const fillRisk = clamp((fill - 60) / 40, 0, 1); // >60% increases risk
    const batteryRisk = clamp((20 - batt) / 20, 0, 1); // <20% increases risk
    const offlineRisk = clamp((mins - 60) / 240, 0, 1); // >60 minutes unseen increases risk

    // Weighted risk score (0..1)
    const riskScore = clamp(0.55 * fillRisk + 0.30 * batteryRisk + 0.15 * offlineRisk, 0, 1);
    const riskLabel = riskScore > 0.66 ? 'high' : riskScore > 0.33 ? 'medium' : 'low';

    // Simple service due estimate in days
    // Higher fill -> sooner service; critically low battery also accelerates
    const dueDays = clamp(7 - (fill / 12) - (batt < 20 ? (20 - batt) / 10 : 0), 0, 14);

    return {
      id: u.id,
      serialNo: u.serialNo,
      location: u.location,
      fillLevel: fill,
      batteryLevel: batt,
      minutesSinceLastSeen: mins,
      riskScore: Number(riskScore.toFixed(2)),
      risk: riskLabel,
      serviceDueInDays: Number(dueDays.toFixed(1)),
      recommendation:
        riskLabel === 'high'
          ? 'Dispatch technician within 24 hours'
          : riskLabel === 'medium'
          ? 'Schedule service this week'
          : 'Monitor only',
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

// Greedy nearest-neighbor route optimizer with urgency weighting
// Body: { depot: [lat, lon], stops: [{ id, serialNo?, coordinates: [lat, lon], priority?: 'high'|'medium'|'low', urgencyScore?: number }] }
function routeOptimize({ depot, stops = [] }) {
  if (!depot || !Array.isArray(depot) || depot.length !== 2) {
    throw new Error('Invalid depot coordinates');
  }
  const remaining = stops.map((s) => ({
    ...s,
    urgencyScore: typeof s.urgencyScore === 'number' ? s.urgencyScore : priorityToUrgency(s.priority),
  }));

  const path = [];
  let totalDistanceKm = 0;
  let current = depot;

  while (remaining.length > 0) {
    // Score by distance and urgency (higher urgency preferred). We pick argmax of composite score.
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      const dist = haversineKm(current, r.coordinates);
      // Normalize distance penalty and combine with urgency
      const distancePenalty = -dist; // closer -> less negative -> better
      const score = 0.7 * r.urgencyScore + 0.3 * (distancePenalty / 10); // scale distance
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    const legKm = haversineKm(current, next.coordinates);
    totalDistanceKm += legKm;
    path.push({ ...next, legDistanceKm: Number(legKm.toFixed(2)) });
    current = next.coordinates;
  }

  return { orderedStops: path, totalDistanceKm: Number(totalDistanceKm.toFixed(2)) };
}

function priorityToUrgency(p) {
  switch ((p || '').toLowerCase()) {
    case 'high':
      return 1.0;
    case 'medium':
      return 0.6;
    case 'low':
      return 0.2;
    default:
      return 0.4;
  }
}

module.exports = {
  predictMaintenance,
  routeOptimize,
  haversineKm,
};
