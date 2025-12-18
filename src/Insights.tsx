import { useEffect, useState } from 'react';
import { useLocale } from './contexts/LocaleContext';
import { apiFetch } from './lib/api';
import {
  Cloud, Sun, Wind, Droplets, BarChart3, Navigation, Wrench, TrendingUp,
  AlertCircle, Brain, Sparkles
} from 'lucide-react';
import { track, trackNow } from './lib/analytics';

const defaultCity = 'Nairobi';

const Insights = () => {
  const { t } = useLocale();
  const [city, setCity] = useState(defaultCity);
  const [weather, setWeather] = useState<any | null>(null);
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState<string | null>(null);

  const fetchWeather = async (selectedCity: string, retryAttempt = 0): Promise<void> => {
    const maxRetries = 2;
    const retryDelay = 1000;

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
        } catch { }

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

      setWeather(null);
      const errorMessage = e?.message || 'Failed to fetch weather data';
      setWError(errorMessage);

      track('weather_error', {
        city: selectedCity,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

    } finally {
      setWLoading(false);
    }
  };

  // Demand Forecasting
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState<string | null>(null);
  const [fcResult, setFcResult] = useState<any | null>(null);
  const [capacity, setCapacity] = useState<number>(80);
  const [sourceBookings, setSourceBookings] = useState<{ date: string }[] | null>(null);

  const demoBookings = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (60 - i));
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
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  useEffect(() => {
    loadRealBookings();
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
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch { }
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

  const demoUnits = [
    { id: '1', serialNo: 'ST-001', location: 'Westlands', fillLevel: 85, batteryLevel: 92, lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), coordinates: [-1.2641, 36.8078] },
    { id: '2', serialNo: 'ST-002', location: 'CBD', fillLevel: 45, batteryLevel: 78, lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), coordinates: [-1.2921, 36.8219] },
    { id: '3', serialNo: 'ST-003', location: 'Karen', fillLevel: 92, batteryLevel: 15, lastSeen: new Date(Date.now() - 60 * 60 * 1000).toISOString(), coordinates: [-1.3197, 36.6859] },
    { id: '4', serialNo: 'ST-004', location: 'Kilimani', fillLevel: 23, batteryLevel: 88, lastSeen: new Date(Date.now() - 3 * 60 * 1000).toISOString(), coordinates: [-1.2906, 36.7820] },
  ];

  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [pmResults, setPmResults] = useState<any[] | null>(null);
  const [pmExpanded, setPmExpanded] = useState(false);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<any | null>(null);
  const [routeExpanded, setRouteExpanded] = useState(false);

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
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch { }
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
      const depot: [number, number] = [-1.286389, 36.817223];
      const stopsSource = (pmResults && pmResults.length ? pmResults : demoUnits).map((r: any) => ({
        id: r.id,
        serialNo: r.serialNo,
        location: r.location,
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
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch { }
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

  useEffect(() => {
    trackNow('view_insights');
    fetchWeather(city);
    loadRealBookings();
  }, []);

  const temperature = weather?.main?.temp ? Math.round(weather.main.temp) : null;
  const humidity = weather?.main?.humidity || null;
  const wind = weather?.wind?.speed || null;
  const condition = weather?.weather?.[0]?.description || weather?.weather?.[0]?.main || '—';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              <Brain className="w-8 h-8 text-white relative z-10" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {t('insights.header.title')}
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
              </h2>
              <p className="text-base text-gray-500 font-medium mt-1">{t('insights.header.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Weather Card */}
          <div className="group bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-indigo-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>

            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" /> {t('insights.weather.title')}
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('insights.weather.placeholder')}
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-32 md:w-48 bg-gray-50"
                  />
                  <button
                    onClick={() => fetchWeather(city)}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-900/20"
                    disabled={wLoading}
                  >
                    {wLoading ? '...' : t('insights.weather.refresh')}
                  </button>
                </div>
              </div>

              {wError && <div className="p-3 mb-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{wError}</div>}

              {weather ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 hover:scale-[1.02] transition-transform">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">{t('insights.weather.temp')}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-gray-900">{typeof temperature === 'number' ? `${temperature}°C` : '—'}</p>
                      <Sun className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 hover:scale-[1.02] transition-transform">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{t('insights.weather.humidity')}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-gray-900">{typeof humidity === 'number' ? `${humidity}%` : '—'}</p>
                      <Droplets className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 hover:scale-[1.02] transition-transform">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">{t('insights.weather.wind')}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-gray-900">{typeof wind === 'number' ? `${wind}` : '—'} <span className="text-lg text-gray-500 font-medium">{t('insights.weather.ms')}</span></p>
                      <Wind className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 hover:scale-[1.02] transition-transform">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{t('insights.weather.condition')}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-xl font-bold text-gray-900 capitalize leading-tight">{condition}</p>
                      <Cloud className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                </div>
              ) : (
                !wLoading && <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">{t('insights.weather.empty')}</div>
              )}
            </div>
          </div>

          {/* Artificial Intelligence Section */}
          <div className="space-y-6">

            {/* Predictive Maintenance Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{t('insights.pm.title')}</h3>
                    <p className="text-xs text-gray-500">{t('insights.pm.subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={runPredictiveMaintenance}
                  disabled={pmLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-green-500/20"
                >
                  {pmLoading ? t('insights.pm.loading') : t('insights.pm.run')}
                </button>
              </div>

              <div className="p-6">
                {pmError && <div className="text-red-500 text-sm mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{pmError}</div>}

                {pmResults ? (
                  <div className="space-y-3">
                    {(pmExpanded ? pmResults : pmResults.slice(0, 3)).map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${r.risk === 'high' ? 'bg-red-500 animate-pulse' : r.risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                          <span className="font-semibold text-sm text-gray-900">{r.serialNo || r.id}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="font-medium">{t('insights.pm.score')}: {r.riskScore}</span>
                          <span className={`px-3 py-1 rounded-lg font-bold capitalize ${r.risk === 'high' ? 'bg-red-100 text-red-700' : r.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {r.risk}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pmResults.length > 3 && (
                      <button
                        onClick={() => setPmExpanded(!pmExpanded)}
                        className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {pmExpanded ? '− Show Less' : `+ Show ${pmResults.length - 3} More Units`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400">{t('insights.pm.empty')}</div>
                )}
              </div>
            </div>

            {/* Route & Demand Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t('insights.route.title')}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runRouteOptimization}
                    disabled={routeLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <Navigation className={`w-4 h-4 ${routeLoading ? 'animate-spin' : ''}`} />
                    {routeLoading ? t('insights.route.loading') : t('insights.route.optimize')}
                  </button>
                  <button
                    onClick={runForecast}
                    disabled={fcLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    <BarChart3 className={`w-4 h-4 ${fcLoading ? 'animate-spin' : ''}`} />
                    {fcLoading ? t('insights.forecast.loading') : t('insights.forecast.run')}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Route Result */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 transition-all hover:bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{t('insights.route.resultTitle')}</p>
                    {routeResult && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">{t('insights.route.tag')}</span>}
                  </div>

                  {routeResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.route.distance')}</p>
                          <p className="text-lg font-bold text-gray-900">{routeResult.totalDistanceKm} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.route.duration')}</p>
                          <p className="text-lg font-bold text-gray-900">{Math.ceil(routeResult.totalDistanceKm / 25)} hrs</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.route.stops')}</p>
                          <p className="text-lg font-bold text-gray-900">{routeResult.orderedStops?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.route.fuel')}</p>
                          <p className="text-lg font-bold text-gray-900">{(routeResult.totalDistanceKm * 0.12).toFixed(1)} L</p>
                        </div>
                      </div>

                      {routeResult.orderedStops && (
                        <div className="mt-3 pt-3 border-t border-blue-100">
                          <p className="text-xs text-gray-500 mb-2">{t('insights.route.path')}</p>
                          <div className="flex flex-wrap gap-2">
                            {(routeExpanded ? routeResult.orderedStops : routeResult.orderedStops.slice(0, 3)).map((s: any, i: number) => (
                              <div key={i} className="text-[10px] bg-white border border-blue-100 px-2 py-1 rounded-md text-gray-600 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                {s.location || s.serialNo || 'Unit'}
                              </div>
                            ))}
                          </div>
                          {routeResult.orderedStops.length > 3 && (
                            <button
                              onClick={() => setRouteExpanded(!routeExpanded)}
                              className="mt-2 text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                            >
                              {routeExpanded ? '− Show Less' : `+ Show ${routeResult.orderedStops.length - 3} More Stops`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">{t('insights.route.empty')}</p>
                  )}
                </div>

                {/* Demand Result */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 transition-all hover:bg-indigo-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{t('insights.forecast.title')}</p>
                    {fcResult && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">{t('insights.forecast.tag')}</span>}
                  </div>

                  {fcResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.forecast.utilization')}</p>
                          <p className="text-lg font-bold text-gray-900">{fcResult.utilization != null ? Math.round(Number(fcResult.utilization) * 100) : 0}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('insights.forecast.avgJobs')}</p>
                          <p className="text-lg font-bold text-gray-900">{Math.round(Number(fcResult.summary?.avgDailyForecast) || 0)}</p>
                        </div>
                      </div>

                      {fcResult.summary?.peakDay?.date && (
                        <div className="bg-white/50 p-2 rounded-lg border border-indigo-100 flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-indigo-900">{t('insights.forecast.peakAlert')}</p>
                            <p className="text-[10px] text-indigo-700 leading-tight mt-0.5">
                              {t('insights.forecast.peakDesc', {
                                date: new Date(fcResult.summary.peakDay.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">{t('insights.forecast.empty')}</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
