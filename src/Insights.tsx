import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { Cloud, Sun, Wind, Droplets, BarChart3, Navigation, Wrench } from 'lucide-react';
import { track, trackNow } from './lib/analytics';

const defaultCity = 'Nairobi';

const Insights = () => {
  const [city, setCity] = useState(defaultCity);
  const [weather, setWeather] = useState<any | null>(null);
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState<string | null>(null);
  // Removed unused retryCount state as it's not being used

  // Mock weather data for fallback
  const mockWeatherData = {
    main: {
      temp: 25,
      humidity: 65,
      feels_like: 26,
      pressure: 1012,
    },
    wind: {
      speed: 3.6,
      deg: 230,
    },
    weather: [
      {
        main: 'Clouds',
        description: 'scattered clouds',
        icon: '03d',
      },
    ],
    name: 'Demo City',
    isMock: true,
  };

  const fetchWeather = async (selectedCity: string, retryAttempt = 0): Promise<void> => {
    const maxRetries = 2;
    const retryDelay = 1000; // 1 second
    
    setWLoading(true);
    setWError(null);

    try {
      track('weather_refresh_clicked', { 
        city: selectedCity, 
        attempt: retryAttempt,
        timestamp: new Date().toISOString()
      });
      
      const resp = await apiFetch(`/api/weather/current?city=${encodeURIComponent(selectedCity)}`);
      
      if (!resp.ok) {
        if (resp.status === 502 && retryAttempt < maxRetries) {
          await new Promise<void>(resolve => setTimeout(resolve, retryDelay * (retryAttempt + 1)));
          return fetchWeather(selectedCity, retryAttempt + 1);
        }
        
        let detail = '';
        try { 
          const j = await resp.json(); 
          detail = (j as { error?: string })?.error || JSON.stringify(j);
        } catch {}
        
        throw new Error(`Weather service unavailable (${resp.status}${detail ? ` - ${detail}` : ''})`);
      }
      
      const data = await resp.json();
      setWeather(data);
      track('weather_loaded', { 
        city: selectedCity,
        temperature: data?.main?.temp,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const e = error as Error;
      console.error('[Insights] Weather API error:', e);
      
      if (retryAttempt < maxRetries) {
        await new Promise<void>(resolve => setTimeout(resolve, retryDelay * (retryAttempt + 1)));
        return fetchWeather(selectedCity, retryAttempt + 1);
      }
      
      console.warn('Using mock weather data as fallback');
      setWeather({
        ...mockWeatherData,
        name: selectedCity,
        isMock: true
      });
      
      const errorMessage = e?.message || 'Failed to fetch live weather data';
      setWError(`Using demo data: ${errorMessage}`);
      
      track('weather_fallback', { 
        city: selectedCity, 
        error: errorMessage,
        isMock: true,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      setWLoading(false);
    }
  };

  // Demand Forecasting (bookings/utilization)
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState<string | null>(null);
  const [fcResult, setFcResult] = useState<any | null>(null);
  const [capacity, setCapacity] = useState<number>(80); // units/day capacity (demo)
  const [sourceBookings, setSourceBookings] = useState<{ date: string }[] | null>(null);

  // Generate demo bookings: last 60 days random-ish counts
  const demoBookings = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (60 - i));
    // base demand with weekly seasonality
    const dow = d.getDay();
    const base = 30 + (dow === 3 || dow === 4 ? 8 : 0) - (dow === 0 || dow === 6 ? 6 : 0);
    const noise = Math.round((Math.random() - 0.5) * 8);
    const count = Math.max(0, base + noise);
    return Array.from({ length: count }, () => ({ date: d.toISOString() }));
  }).flat();

  const loadRealBookings = async () => {
    try {
      const resp = await apiFetch('/api/bookings');
      if (!resp.ok) throw new Error('not ok');
      const data = await resp.json();
      // Expecting shape: [{ date: ISO, ... }]
      if (Array.isArray(data)) {
        const mapped = data
          .map((b: any) => ({
            date: b?.date ? new Date(b.date).toISOString() : undefined
          }))
          .filter((b): b is { date: string } => typeof b.date === 'string');
        
        if (mapped.length) {
          setSourceBookings(mapped);
          return;
        }
      }
      // fallthrough -> keep null to use demo
    } catch (error) {
      console.error('Failed to load bookings:', error);
      // ignore, fallback to demo
    }
  };

  useEffect(() => {
    loadRealBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runForecast = async () => {
    setFcLoading(true);
    setFcError(null);
    setFcResult(null);
    try {
      track('forecast_run_clicked', { capacity });
      const resp = await apiFetch('/api/ai/forecast-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings: sourceBookings ?? demoBookings, horizonDays: 30, capacityPerDay: capacity })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Forecast failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setFcResult(data);
      track('forecast_run_success', { utilization: data?.utilization, avg: data?.summary?.avgDailyForecast });
    } catch (e: any) {
      setFcError(e?.message || 'Failed to forecast demand');
      console.error('[Insights] forecast error', e);
      track('forecast_run_error');
    } finally {
      setFcLoading(false);
    }
  };

  // Text analysis removed

  useEffect(() => {
    trackNow('view_insights');
    fetchWeather(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temperature = weather?.main?.temp;
  const humidity = weather?.main?.humidity;
  const wind = weather?.wind?.speed;
  const condition = weather?.weather?.description || weather?.weather?.main || '—';

  // --- Demo AI: Predictive maintenance and route optimization ---
  const demoUnits = [
    { id: '1', serialNo: 'ST-001', location: 'Westlands', fillLevel: 85, batteryLevel: 92, lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), coordinates: [-1.2641, 36.8078] },
    { id: '2', serialNo: 'ST-002', location: 'CBD',       fillLevel: 45, batteryLevel: 78, lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), coordinates: [-1.2921, 36.8219] },
    { id: '3', serialNo: 'ST-003', location: 'Karen',     fillLevel: 92, batteryLevel: 15, lastSeen: new Date(Date.now() - 60 * 60 * 1000).toISOString(), coordinates: [-1.3197, 36.6859] },
    { id: '4', serialNo: 'ST-004', location: 'Kilimani',  fillLevel: 23, batteryLevel: 88, lastSeen: new Date(Date.now() - 3 * 60 * 1000).toISOString(), coordinates: [-1.2906, 36.7820] },
  ];

  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [pmResults, setPmResults] = useState<any[] | null>(null);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<any | null>(null);

  const runPredictiveMaintenance = async () => {
    setPmLoading(true);
    setPmError(null);
    setPmResults(null);
    try {
      track('pm_run_clicked');
      const resp = await apiFetch('/api/ai/predict-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: demoUnits })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Predictive maintenance failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setPmResults(data?.results || []);
      track('pm_run_success', { count: (data?.results || []).length });
    } catch (e: any) {
      setPmError(e?.message || 'Failed to run predictive maintenance');
      console.error('[Insights] pm error', e);
      track('pm_run_error');
    } finally {
      setPmLoading(false);
    }
  };

  const runRouteOptimization = async () => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    try {
      const depot: [number, number] = [-1.286389, 36.817223]; // Nairobi CBD
      // Use top risky units (or all if not run yet)
      const stopsSource = (pmResults && pmResults.length ? pmResults : demoUnits).map((r: any) => ({
        id: r.id,
        serialNo: r.serialNo,
        coordinates: r.coordinates || demoUnits.find(u => u.id === r.id)?.coordinates,
        priority: r.risk || 'medium',
      }));

      track('route_optimize_clicked', { stops: stopsSource.length });
      const resp = await apiFetch('/api/ai/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depot, stops: stopsSource })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Route optimization failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setRouteResult(data);
      track('route_optimize_success', { totalKm: data?.totalDistanceKm, stops: data?.orderedStops?.length });
    } catch (e: any) {
      setRouteError(e?.message || 'Failed to optimize route');
      console.error('[Insights] route error', e);
      track('route_optimize_error');
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-2xl font-semibold text-gray-900">Insights</h2>
                <p className="text-sm text-gray-500">Weather insights powered by OpenWeather</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weather + AI section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weather</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  className="border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={() => fetchWeather(city)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={wLoading}
                >
                  {wLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {wError && <div className="text-red-600 text-sm mb-3">{wError}</div>}

            {weather ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="text-2xl font-semibold">{typeof temperature === 'number' ? `${temperature}°C` : '—'}</p>
                  </div>
                  <Sun className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Humidity</p>
                    <p className="text-2xl font-semibold">{typeof humidity === 'number' ? `${humidity}%` : '—'}</p>
                  </div>
                  <Droplets className="w-8 h-8 text-blue-500" />
                </div>
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Wind</p>
                    <p className="text-2xl font-semibold">{typeof wind === 'number' ? `${wind} m/s` : '—'}</p>
                  </div>
                  <Wind className="w-8 h-8 text-green-600" />
                </div>
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="text-2xl font-semibold capitalize">{condition}</p>
                  </div>
                  <Cloud className="w-8 h-8 text-gray-500" />
                </div>
              </div>
            ) : (
              !wLoading && <p className="text-sm text-gray-500">Enter a city and tap Refresh to load weather.</p>
            )}
          </div>

          {/* AI Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            </div>

            {/* Predictive Maintenance */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                    <Wrench className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Predictive Maintenance</p>
                    <p className="text-xs text-gray-500">Rank units by service risk and due date</p>
                  </div>
                </div>
                <button
                  onClick={runPredictiveMaintenance}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={pmLoading}
                >
                  {pmLoading ? 'Analyzing...' : 'Run' }
                </button>
              </div>

              {pmError && <div className="text-red-600 text-sm mt-3">{pmError}</div>}

              {pmResults && (
                <div className="mt-4 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Unit</th>
                        <th className="px-3 py-2 text-left text-gray-500">Risk</th>
                        <th className="px-3 py-2 text-left text-gray-500">Score</th>
                        <th className="px-3 py-2 text-left text-gray-500">Due (days)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pmResults.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{r.serialNo || r.id}</td>
                          <td className="px-3 py-2 capitalize">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.risk === 'high' ? 'text-red-700 bg-red-100' : r.risk === 'medium' ? 'text-yellow-700 bg-yellow-100' : 'text-green-700 bg-green-100'}`}>{r.risk}</span>
                          </td>
                          <td className="px-3 py-2">{r.riskScore}</td>
                          <td className="px-3 py-2">{r.serviceDueInDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Route Optimization */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                    <Navigation className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Route Optimization</p>
                    <p className="text-xs text-gray-500">Order stops by urgency and distance</p>
                  </div>
                </div>
                <button
                  onClick={runRouteOptimization}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={routeLoading}
                >
                  {routeLoading ? 'Optimizing...' : 'Optimize' }
                </button>
              </div>

              {routeError && <div className="text-red-600 text-sm mt-3">{routeError}</div>}

              {routeResult && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Total Distance: <span className="font-medium">{routeResult.totalDistanceKm} km</span></p>
                  <ol className="list-decimal ml-5 space-y-1 text-sm">
                    {routeResult.orderedStops?.map((s: any) => (
                      <li key={s.id}>
                        {(s.serialNo || s.id)} — {s.legDistanceKm} km
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Demand Forecasting */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Demand Forecasting</p>
                  <p className="text-xs text-gray-500">30-day forecast and utilization</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-28 border rounded px-3 py-2 text-sm"
                    placeholder="Capacity/day"
                    title="Capacity per day"
                  />
                  <button
                    onClick={runForecast}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={fcLoading}
                  >
                    {fcLoading ? 'Forecasting...' : 'Forecast'}
                  </button>
                </div>
              </div>

              {fcError && <div className="text-red-600 text-sm mt-3">{fcError}</div>}

              {fcResult && (
                <div className="mt-4 space-y-2 text-sm">
                  <p>Avg Daily Forecast: <span className="font-medium">{fcResult.summary?.avgDailyForecast}</span></p>
                  {typeof fcResult.utilization === 'number' && (
                    <p>Projected Utilization: <span className="font-medium">{Math.round(fcResult.utilization * 100)}%</span></p>
                  )}
                  {fcResult.summary?.peakDay && (
                    <p>Peak Day: <span className="font-medium">{fcResult.summary.peakDay.date}</span> with {fcResult.summary.peakDay.forecast} bookings</p>
                  )}
                  {fcResult.recommendation && (
                    <div className="p-3 bg-yellow-50 border rounded text-yellow-800">{fcResult.recommendation}</div>
                  )}
                  {/* Simple textual display of first 7 days */}
                  <div className="mt-2">
                    <p className="text-gray-600 mb-1">Next 7 days:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      {fcResult.forecasts?.slice(0,7).map((f: any) => (
                        <li key={f.date}>{f.date}: {f.forecast}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
