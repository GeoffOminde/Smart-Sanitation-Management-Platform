import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { Cloud, Sun, Wind, Droplets, BarChart3, MessageSquare } from 'lucide-react';

const defaultCity = 'Nairobi';

const Insights = () => {
  const [city, setCity] = useState(defaultCity);
  const [weather, setWeather] = useState<any | null>(null);
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState<string | null>(null);

  const [text, setText] = useState('Great service and fast response!');
  const [model, setModel] = useState('distilbert-base-uncased-finetuned-sst-2-english');
  const [hfResult, setHfResult] = useState<any | null>(null);
  const [hfLoading, setHfLoading] = useState(false);
  const [hfError, setHfError] = useState<string | null>(null);

  const fetchWeather = async (selectedCity: string) => {
    setWLoading(true);
    setWError(null);
    try {
      const resp = await apiFetch(`/api/weather/current?city=${encodeURIComponent(selectedCity)}`);
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Weather failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setWeather(data);
    } catch (e: any) {
      setWError(e?.message || 'Failed to fetch weather');
      setWeather(null);
      console.error('[Insights] weather error', e);
    } finally {
      setWLoading(false);
    }
  };

  const runInference = async () => {
    setHfLoading(true);
    setHfError(null);
    setHfResult(null);
    try {
      // Build payload: zero-shot models expect `parameters.candidate_labels`
      const isZeroShot = model === 'facebook/bart-large-mnli';
      const payload: any = {
        model,
        inputs: text,
      };
      if (isZeroShot) {
        payload.parameters = { candidate_labels: ['positive', 'negative', 'neutral'] };
      }

      const resp = await apiFetch('/api/hf/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || j?.details?.error || JSON.stringify(j); } catch {}
        // Common cause: Missing HUGGING_FACE_TOKEN on the server
        throw new Error(`HF failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      setHfResult(data);
    } catch (e: any) {
      setHfError(e?.message || 'Failed to run inference');
      console.error('[Insights] hf error', e);
    } finally {
      setHfLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temperature = weather?.main?.temp;
  const humidity = weather?.main?.humidity;
  const wind = weather?.wind?.speed;
  const condition = weather?.weather?.description || weather?.weather?.main || '—';

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
                <p className="text-sm text-gray-500">Weather and text analysis powered by OpenWeather and Hugging Face</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weather + HF sections */}
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

          {/* Hugging Face */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Text Analysis</h3>
            </div>

            <div className="space-y-3 mb-4">
              <textarea
                className="w-full border rounded p-3 text-sm"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type text to analyze"
              />
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="distilbert-base-uncased-finetuned-sst-2-english">Sentiment (distilbert)</option>
                  <option value="facebook/bart-large-mnli">Zero-shot classification (BART MNLI)</option>
                </select>
                <button
                  onClick={runInference}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={hfLoading || !text.trim()}
                >
                  {hfLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              {model === 'facebook/bart-large-mnli' && (
                <div className="text-xs text-gray-500">Using candidate labels: positive, negative, neutral</div>
              )}
              {hfError && (
                <div className="text-red-600 text-sm">
                  {hfError}
                  {/HUGGING_FACE_TOKEN/i.test(hfError) && (
                    <>
                      {' '}
                      — Configure HUGGING_FACE_TOKEN in server/.env and restart the backend.
                    </>
                  )}
                </div>
              )}
            </div>

            {hfResult ? (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  <p className="text-sm text-gray-600">Result</p>
                </div>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded p-3 overflow-auto max-h-64">{JSON.stringify(hfResult, null, 2)}</pre>
              </div>
            ) : (
              !hfLoading && <p className="text-sm text-gray-500">Select a model and analyze the text above.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
