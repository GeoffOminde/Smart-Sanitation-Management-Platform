require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = parseInt(process.env.PORT, 10) || 3001;
const AI = require('./ai');
const Forecast = require('./forecast');

// In-memory transaction store (demo only)
const transactions = [];
let txIdCounter = 1;

// Paystack: initialize transaction
app.post('/api/paystack/init', async (req, res) => {
  const { email, amount } = req.body;
  if (!email || !amount) return res.status(400).json({ error: 'email and amount required' });

  try {
    const resp = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: Math.round(amount * 100)
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
      }
    });

    // record minimal transaction info in-memory
    const record = {
      id: txIdCounter++,
      provider: 'paystack',
      email,
      amount,
      createdAt: new Date().toISOString(),
      raw: resp.data
    };
    transactions.unshift(record);
    res.json(resp.data);
  } catch (err) {
    console.error(err.response && err.response.data ? err.response.data : err.message);
    res.status(500).json({ error: 'Paystack init failed' });
  }
});

/**
 * POST /api/ai/smart-booking/suggest
 * Body: {
 *   date?: ISO string (requested),
 *   location?: string,
 *   units?: number,
 *   durationDays?: number,
 *   capacityPerDay?: number,
 *   bookingsHistory?: Array<{ date: ISO }>
 * }
 * Returns: { requested, suggestion, alternatives }
 */
app.post('/api/ai/smart-booking/suggest', (req, res) => {
  try {
    const {
      date,
      location = '',
      units = 1,
      durationDays = 1,
      capacityPerDay = 80,
      bookingsHistory = [],
    } = req.body || {};

    // Forecast next 30 days using provided history (if any)
    const fc = Forecast.forecastBookings(Array.isArray(bookingsHistory) ? bookingsHistory : [], 30, capacityPerDay);
    const indexByDate = new Map(fc.forecasts.map((f) => [f.date, f.forecast]));

    // Build candidate window: requested date +/- 3 days; if no requested, take next 7 days
    const requested = date ? new Date(date) : new Date();
    if (isNaN(requested.getTime())) return res.status(400).json({ error: 'Invalid requested date' });

    const candidates = [];
    const windowDays = date ? 3 : 7;
    for (let offset = -windowDays; offset <= windowDays; offset++) {
      if (!date && offset < 1) continue; // when no requested, only look forward
      const d = new Date(requested);
      d.setDate(d.getDate() + offset);
      const key = d.toISOString().slice(0, 10);
      const forecast = indexByDate.get(key) ?? fc.summary?.avgDailyForecast ?? 0;
      const utilization = capacityPerDay > 0 ? Math.min(1, forecast / capacityPerDay) : 0;
      const proximity = 1 - Math.min(1, Math.abs(offset) / windowDays); // closer to requested is better
      // Lower utilization better; combine with proximity
      const score = 0.7 * (1 - utilization) + 0.3 * proximity;
      candidates.push({ date: key, forecast, utilization: Number(utilization.toFixed(2)), score: Number(score.toFixed(3)) });
    }

    // Sort best first
    candidates.sort((a, b) => b.score - a.score);
    const suggestion = candidates[0];
    const alternatives = candidates.slice(1, 4);

    return res.json({
      requested: {
        date: requested.toISOString().slice(0, 10),
        location,
        units,
        durationDays,
      },
      suggestion,
      alternatives,
      capacityPerDay,
      summary: fc.summary,
      recommendation: fc.recommendation,
    });
  } catch (err) {
    console.error('[ai/smart-booking/suggest] error', err?.message || err);
    res.status(500).json({ error: 'Failed to suggest smart booking' });
  }
});

// ------------------------------
// Lightweight AI Endpoints
// ------------------------------

/**
 * POST /api/ai/predict-maintenance
 * Body: { units: Array<{ id, serialNo, location, fillLevel, batteryLevel, lastSeen, coordinates:[lat,lon] }> }
 * Returns ranked maintenance risk predictions per unit.
 */
app.post('/api/ai/predict-maintenance', (req, res) => {
  try {
    const { units } = req.body || {};
    if (!Array.isArray(units)) return res.status(400).json({ error: 'units array is required' });
    const results = AI.predictMaintenance(units);
    res.json({ results });
  } catch (err) {
    console.error('[ai/predict-maintenance] error', err?.message || err);
    res.status(500).json({ error: 'Failed to predict maintenance' });
  }
});

/**
 * POST /api/ai/route-optimize
 * Body: { depot:[lat,lon], stops: Array<{ id, serialNo?, coordinates:[lat,lon], priority?, urgencyScore? }> }
 * Returns an ordered route with total distance.
 */
app.post('/api/ai/route-optimize', (req, res) => {
  try {
    const { depot, stops } = req.body || {};
    if (!Array.isArray(depot) || depot.length !== 2) return res.status(400).json({ error: 'depot must be [lat, lon]' });
    if (!Array.isArray(stops)) return res.status(400).json({ error: 'stops array is required' });
    const route = AI.routeOptimize({ depot, stops });
    res.json(route);
  } catch (err) {
    console.error('[ai/route-optimize] error', err?.message || err);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});

// M-Pesa: Get OAuth token (sandbox)
app.get('/api/mpesa/token', async (req, res) => {
  try {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const resp = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
    res.json(resp.data);
  } catch (err) {
    console.error(err.response && err.response.data ? err.response.data : err.message);
    res.status(500).json({ error: 'Mpesa token request failed' });
  }
});

// M-Pesa: STK Push (example for sandbox)
app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  try {
    // Get token
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const tokenUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const tokenResp = await axios.get(tokenUrl, { headers: { Authorization: `Basic ${auth}` } });
    const token = tokenResp.data.access_token;

    // Build STK Push request
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0,14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const stkUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://example.com/mpesa/callback',
      AccountReference: 'SmartSanitation',
      TransactionDesc: 'Payment'
    };

    const stkResp = await axios.post(stkUrl, body, { headers: { Authorization: `Bearer ${token}` } });
    // record minimal mpesa transaction in-memory
    const record = {
      id: txIdCounter++,
      provider: 'mpesa',
      phone,
      amount,
      createdAt: new Date().toISOString(),
      raw: stkResp.data
    };
    transactions.unshift(record);
    res.json(stkResp.data);
  } catch (err) {
    console.error(err.response && err.response.data ? err.response.data : err.message);
    res.status(500).json({ error: 'STK push failed' });
  }
});

// Admin: list transactions (in-memory)
app.get('/api/admin/transactions', (req, res) => {
  res.json({ transactions });
});

// Admin: seed demo transactions (for local testing only)
app.post('/api/admin/seed', (req, res) => {
  const demo = [
    { id: txIdCounter++, provider: 'paystack', email: 'demo1@example.com', amount: 1500, createdAt: new Date().toISOString(), raw: { demo: true } },
    { id: txIdCounter++, provider: 'mpesa', phone: '+254700000000', amount: 800, createdAt: new Date().toISOString(), raw: { demo: true } },
  ];
  transactions.unshift(...demo);
  res.json({ success: true, added: demo.length });
});

// Admin: delete transaction by id
app.delete('/api/admin/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  transactions.splice(idx, 1);
  res.json({ success: true });
});

function startServer(port) {
  const server = app.listen(port, () => console.log('Server listening on', port));
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);

// ------------------------------
// OpenWeather API
// ------------------------------

/**
 * GET /api/weather/current?city=Nairobi
 * Proxies to OpenWeather Current Weather API and returns a trimmed payload.
 */
app.get('/api/weather/current', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENWEATHER_API_KEY' });

    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'city query param is required' });

    const url = 'https://api.openweathermap.org/data/2.5/weather';
    const resp = await axios.get(url, {
      params: { q: city, units: 'metric', appid: apiKey },
    });

    const data = resp.data;
    const trimmed = {
      city: data.name,
      coord: data.coord,
      weather: data.weather?.[0] || null,
      main: data.main, // temp, humidity, etc.
      wind: data.wind,
      clouds: data.clouds,
      dt: data.dt,
      sys: { country: data.sys?.country, sunrise: data.sys?.sunrise, sunset: data.sys?.sunset },
    };

    res.json(trimmed);
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('[weather/current] error', msg);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});
