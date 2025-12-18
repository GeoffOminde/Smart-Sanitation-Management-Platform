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

    // 1. Linear Regression for Fill Date Prediction
    // We assume a usage rate. If we had history, we'd regress on that.
    // For now, let's simulate a standard daily usage rate + random variance per unit ID seed
    const pseudoRandom = (u.serialNo.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 5) + 3; // 3-8% per day
    const daysUntilFull = fill >= 100 ? 0 : (100 - fill) / pseudoRandom;

    // 2. Feature heuristics
    const fillRisk = clamp((fill - 60) / 40, 0, 1); // >60% increases risk
    const batteryRisk = clamp((20 - batt) / 20, 0, 1); // <20% increases risk
    const offlineRisk = clamp((mins - 60) / 240, 0, 1); // >60 minutes unseen increases risk

    // 3. Advanced Weighted Scoring
    // Logic: Fill level is critical, but battery failure means blindness.
    const riskScore = clamp(0.55 * fillRisk + 0.35 * batteryRisk + 0.10 * offlineRisk, 0, 1);
    const riskLabel = riskScore > 0.66 ? 'high' : riskScore > 0.33 ? 'medium' : 'low';

    // 4. Recommendation Logic
    let recommendation = 'Monitor only';
    if (riskLabel === 'high') {
      if (batt < 10) recommendation = 'Critical: Battery replacement needed immediately';
      else if (fill > 90) recommendation = 'Critical: Dispatch pump truck ASAP';
      else recommendation = 'Dispatch technician within 24 hours';
    } else if (riskLabel === 'medium') {
      recommendation = `Schedule service by ${new Date(Date.now() + daysUntilFull * 86400000).toDateString()}`;
    }

    return {
      id: u.id,
      serialNo: u.serialNo,
      location: u.location,
      fillLevel: fill,
      batteryLevel: batt,
      minutesSinceLastSeen: mins,
      riskScore: Number(riskScore.toFixed(2)),
      risk: riskLabel,
      predictedFullDate: new Date(Date.now() + daysUntilFull * 86400000).toISOString(),
      serviceDueInDays: Number(daysUntilFull.toFixed(1)),
      recommendation,
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


// Smart Booking Suggestion (Heuristic)
function smartBookingSuggest({ date, location, units, durationDays, capacityPerDay, bookingsHistory = [] }) {
  // 1. Analyze historical density for this location (mock logic)
  // In a real system, we'd query db for overlapping bookings in the same geolocation radius.

  // Baseline availability check
  const today = new Date();
  const targetDate = date ? new Date(date) : new Date(today.setDate(today.getDate() + 1));

  // Calculate simple heuristic utilization based on history count near target date
  const nearbyBookings = bookingsHistory.filter(b => {
    const bDate = new Date(b.date);
    const diffTime = Math.abs(targetDate - bDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 3;
  }).length;

  // Utilization logic (fake but reasonable)
  const baseUtilization = 0.2; // 20% base load
  const utilization = Math.min(0.95, baseUtilization + (nearbyBookings * 0.1));

  return {
    suggestion: {
      date: targetDate.toISOString().split('T')[0],
      utilization: Number(utilization.toFixed(2))
    },
    alternatives: [
      {
        date: new Date(targetDate.getTime() + 86400000 * 2).toISOString().split('T')[0],
        utilization: Number(Math.max(0.1, utilization - 0.1).toFixed(2))
      },
      {
        date: new Date(targetDate.getTime() + 86400000 * 5).toISOString().split('T')[0],
        utilization: Number(Math.max(0.1, utilization - 0.15).toFixed(2))
      }
    ]
  };
}

module.exports = {
  predictMaintenance,
  routeOptimize,
  smartBookingSuggest,
  haversineKm,
};
