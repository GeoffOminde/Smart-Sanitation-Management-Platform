require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = parseInt(process.env.PORT, 10) || 3001;
const AI = require('./ai');
// Auth helper
function generateToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET || 'defaultsecret';
  return jwt.sign(payload, secret, { expiresIn: '2h' });
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
const Forecast = require('./forecast');

// ------------------------------
// Environment-gated safety switches and HTTP settings
// ------------------------------
const ENABLE_FORECAST_API = process.env.ENABLE_FORECAST_API !== 'false'; // default on
const ENABLE_WEATHER_CACHE = process.env.Enable_WEATHER_CACHE === 'true' || process.env.ENABLE_WEATHER_CACHE === 'true'; // default off (support typo)
const WEATHER_CACHE_TTL_S = Number(process.env.WEATHER_CACHE_TTL_S || 600); // 10 minutes default
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 8000);
const ENABLE_ANALYTICS_API = process.env.ENABLE_ANALYTICS_API === 'true'; // default off
const ENABLE_ROI_API = process.env.ENABLE_ROI_API !== 'false'; // default on
const ENABLE_WEEKLY_REPORTS = process.env.ENABLE_WEEKLY_REPORTS === 'true'; // default off
const WEEKLY_REPORT_CRON = process.env.WEEKLY_REPORT_CRON || '0 8 * * 1'; // 08:00 every Monday

// Apply axios default timeout
axios.defaults.timeout = HTTP_TIMEOUT_MS;

// In-memory caches/stores (demo only)
const _weatherCache = new Map(); // key: city -> { ts: Date.now(), data }
const _analyticsEvents = []; // basic in-memory event store when enabled

// In-memory transaction store (demo only)
// In-memory transaction store removed; using Prisma for persistence

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

    // Persist transaction using Prisma
    const record = await prisma.transaction.create({
      data: {
        provider: 'paystack',
        email,
        amount,
        raw: JSON.stringify(resp.data)
      }
    });
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

// Forecast bookings (exposes Forecast.forecastBookings) — optional
if (ENABLE_FORECAST_API) {
  /**
   * POST /api/ai/forecast-bookings
   * Body: { bookings: Array<{date: ISO}>, horizonDays?: number, capacityPerDay?: number }
   * Returns: { forecasts, summary, utilization?, recommendation }
   */
  app.post('/api/ai/forecast-bookings', (req, res) => {
    try {
      const { bookings = [], horizonDays = 30, capacityPerDay = 0 } = req.body || {};
      const result = Forecast.forecastBookings(Array.isArray(bookings) ? bookings : [], Number(horizonDays) || 30, Number(capacityPerDay) || 0);
      res.json(result);
    } catch (err) {
      console.error('[ai/forecast-bookings] error', err?.message || err);
      res.status(500).json({ error: 'Failed to forecast bookings' });
    }
  });
}

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
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
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
app.get('/api/admin/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();
    res.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Admin: seed demo transactions (for local testing only)
// Register endpoint (for demo purposes)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name, role: role || 'admin' } });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protect admin routes
app.use('/api/admin', authMiddleware);

// Admin: list transactions (protected)
app.get('/api/admin/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();
    res.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Admin: seed demo transactions (protected)
app.post('/api/admin/seed', async (req, res) => {
  try {
    const demo = [
      { provider: 'paystack', email: 'demo1@example.com', amount: 1500, raw: JSON.stringify({ demo: true }) },
      { provider: 'mpesa', phone: '+254700000000', amount: 800, raw: JSON.stringify({ demo: true }) }
    ];
    await prisma.transaction.createMany({ data: demo });
    res.json({ success: true, added: demo.length });
  } catch (err) {
    console.error('Error seeding transactions', err);
    res.status(500).json({ error: 'Failed to seed transactions' });
  }
});

// Admin: delete transaction by id (protected)
app.delete('/api/admin/transactions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const deleted = await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting transaction', err);
    res.status(404).json({ error: 'not found' });
  }
});

// Admin: delete transaction by id
app.delete('/api/admin/transactions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const deleted = await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting transaction', err);
    res.status(404).json({ error: 'not found' });
  }
});

function startServer(port) {
  const server = app.listen(port, () => console.log('Server listening on', port));
  // Setup WebSocket server using the same HTTP server
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (msg) => {
      console.log('Received WS message:', msg);
      // Echo back
      ws.send(`Echo: ${msg}`);
    });
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });
  // Simple endpoint to broadcast a message to all WS clients (protected)
  app.post('/api/ws/broadcast', authMiddleware, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    res.json({ success: true });
  });
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

    // Simple in-memory cache by city
    if (ENABLE_WEATHER_CACHE) {
      const cached = _weatherCache.get(city);
      if (cached && (Date.now() - cached.ts) / 1000 < WEATHER_CACHE_TTL_S) {
        return res.json(cached.data);
      }
    }

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

    if (ENABLE_WEATHER_CACHE) {
      _weatherCache.set(city, { ts: Date.now(), data: trimmed });
    }

    res.json(trimmed);
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('[weather/current] error', msg);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// ------------------------------
// Optional Analytics Events Endpoint (demo-only)
// ------------------------------
if (ENABLE_ANALYTICS_API) {
  /**
   * POST /api/analytics/events
   * Body: { events: Array<{ name: string, userId?: string, orgId?: string, properties?: object, ts?: number }> }
   */
  app.post('/api/analytics/events', (req, res) => {
    try {
      const { events } = req.body || {};
      if (!Array.isArray(events)) return res.status(400).json({ error: 'events array is required' });
      const normalized = events.map((e) => ({
        name: String(e?.name || ''),
        userId: e?.userId || null,
        orgId: e?.orgId || null,
        properties: e?.properties || {},
        ts: Number(e?.ts || Date.now()),
      }));
      _analyticsEvents.push(...normalized);
      // Log to stdout in demo mode for observability
      console.log('[analytics] ingested', normalized.length, 'events');
      res.json({ success: true, ingested: normalized.length });
    } catch (err) {
      console.error('[analytics/events] error', err?.message || err);
      res.status(500).json({ error: 'Failed to ingest analytics events' });
    }
  });
  // Minimal readout for debugging
  app.get('/api/analytics/events', (req, res) => {
    res.json({ count: _analyticsEvents.length });
  });
}
