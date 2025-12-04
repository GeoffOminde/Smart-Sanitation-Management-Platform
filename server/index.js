require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = parseInt(process.env.PORT, 10) || 3001;
const AI = require('./ai');
const Forecast = require('./forecast');

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

// Environment switches
const ENABLE_FORECAST_API = process.env.ENABLE_FORECAST_API !== 'false';
const ENABLE_WEATHER_CACHE = process.env.Enable_WEATHER_CACHE === 'true' || process.env.ENABLE_WEATHER_CACHE === 'true';
const WEATHER_CACHE_TTL_S = Number(process.env.WEATHER_CACHE_TTL_S || 600);
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 8000);
const ENABLE_ANALYTICS_API = process.env.ENABLE_ANALYTICS_API === 'true';
const ENABLE_ROI_API = process.env.ENABLE_ROI_API !== 'false';
const ENABLE_WEEKLY_REPORTS = process.env.ENABLE_WEEKLY_REPORTS === 'true';
const WEEKLY_REPORT_CRON = process.env.WEEKLY_REPORT_CRON || '0 8 * * 1';

axios.defaults.timeout = HTTP_TIMEOUT_MS;

const _weatherCache = new Map();
const _analyticsEvents = [];

let wss;

// Auth Routes
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

// Paystack
app.post('/api/paystack/init', async (req, res) => {
  const { email, amount } = req.body;
  if (!email || !amount) return res.status(400).json({ error: 'email and amount required' });

  try {
    const resp = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: Math.round(amount * 100)
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });

    await prisma.transaction.create({
      data: {
        provider: 'paystack',
        email,
        amount,
        raw: JSON.stringify(resp.data),
        status: 'pending'
      }
    });
    res.json(resp.data);
  } catch (err) {
    console.error(err.response && err.response.data ? err.response.data : err.message);
    res.status(500).json({ error: 'Paystack init failed' });
  }
});

// AI Endpoints
app.post('/api/ai/smart-booking/suggest', (req, res) => {
  try {
    const { date, location = '', units = 1, durationDays = 1, capacityPerDay = 80, bookingsHistory = [] } = req.body || {};
    const fc = Forecast.forecastBookings(Array.isArray(bookingsHistory) ? bookingsHistory : [], 30, capacityPerDay);
    const indexByDate = new Map(fc.forecasts.map((f) => [f.date, f.forecast]));
    const requested = date ? new Date(date) : new Date();
    if (isNaN(requested.getTime())) return res.status(400).json({ error: 'Invalid requested date' });

    const candidates = [];
    const windowDays = date ? 3 : 7;
    for (let offset = -windowDays; offset <= windowDays; offset++) {
      if (!date && offset < 1) continue;
      const d = new Date(requested);
      d.setDate(d.getDate() + offset);
      const key = d.toISOString().slice(0, 10);
      const forecast = indexByDate.get(key) ?? fc.summary?.avgDailyForecast ?? 0;
      const utilization = capacityPerDay > 0 ? Math.min(1, forecast / capacityPerDay) : 0;
      const proximity = 1 - Math.min(1, Math.abs(offset) / windowDays);
      const score = 0.7 * (1 - utilization) + 0.3 * proximity;
      candidates.push({ date: key, forecast, utilization: Number(utilization.toFixed(2)), score: Number(score.toFixed(3)) });
    }
    candidates.sort((a, b) => b.score - a.score);
    res.json({
      requested: { date: requested.toISOString().slice(0, 10), location, units, durationDays },
      suggestion: candidates[0],
      alternatives: candidates.slice(1, 4),
      capacityPerDay,
      summary: fc.summary,
      recommendation: fc.recommendation,
    });
  } catch (err) {
    console.error('[ai/smart-booking/suggest] error', err?.message || err);
    res.status(500).json({ error: 'Failed to suggest smart booking' });
  }
});

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

// Assistant endpoint
app.post('/api/assistant/message', async (req, res) => {
  try {
    const { message, locale } = req.body || {};
    if (typeof message !== 'string') return res.status(400).json({ error: 'message string required' });
    // Simple rule-based reply (could be expanded)
    const reply = locale === 'sw' ? `Nimepokea ujumbe wako: ${message}` : `Received your message: ${message}`;
    res.json({ reply });
  } catch (err) {
    console.error('[assistant/message] error', err?.message || err);
    res.status(500).json({ error: 'Assistant failed' });
  }
});

if (ENABLE_FORECAST_API) {
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

// M-Pesa
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

app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });
  try {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const tokenUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const tokenResp = await axios.get(tokenUrl, { headers: { Authorization: `Basic ${auth}` } });
    const token = tokenResp.data.access_token;

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

    // Persist via Prisma
    await prisma.transaction.create({
      data: {
        provider: 'mpesa',
        phone,
        amount,
        raw: JSON.stringify(stkResp.data),
        status: 'pending'
      }
    });

    res.json(stkResp.data);
  } catch (err) {
    console.error(err.response && err.response.data ? err.response.data : err.message);
    res.status(500).json({ error: 'STK push failed' });
  }
});

// Admin Routes (Protected)
// Temporarily disabled auth middleware for demo purposes since frontend uses mock auth
// app.use('/api/admin', authMiddleware);

app.get('/api/admin/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/admin/seed', async (req, res) => {
  try {
    const demo = [
      { provider: 'paystack', email: 'demo1@example.com', amount: 1500, raw: JSON.stringify({ demo: true }), status: 'success' },
      { provider: 'mpesa', phone: '+254700000000', amount: 800, raw: JSON.stringify({ demo: true }), status: 'success' }
    ];
    await prisma.transaction.createMany({ data: demo });
    res.json({ success: true, added: demo.length });
  } catch (err) {
    console.error('Error seeding transactions', err);
    res.status(500).json({ error: 'Failed to seed transactions' });
  }
});

app.delete('/api/admin/transactions/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const deleted = await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting transaction', err);
    res.status(404).json({ error: 'not found' });
  }
});

// WS Broadcast (Protected)
app.post('/api/ws/broadcast', authMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  res.json({ success: true });
});

// Weather
app.get('/api/weather/current', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENWEATHER_API_KEY' });
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'city query param is required' });

    if (ENABLE_WEATHER_CACHE) {
      const cached = _weatherCache.get(city);
      if (cached && (Date.now() - cached.ts) / 1000 < WEATHER_CACHE_TTL_S) {
        return res.json(cached.data);
      }
    }

    const url = 'https://api.openweathermap.org/data/2.5/weather';
    const resp = await axios.get(url, { params: { q: city, units: 'metric', appid: apiKey } });
    const data = resp.data;
    const trimmed = {
      city: data.name,
      coord: data.coord,
      weather: data.weather?.[0] || null,
      main: data.main,
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

// Analytics
if (ENABLE_ANALYTICS_API) {
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
      console.log('[analytics] ingested', normalized.length, 'events');
      res.json({ success: true, ingested: normalized.length });
    } catch (err) {
      console.error('[analytics/events] error', err?.message || err);
      res.status(500).json({ error: 'Failed to ingest analytics events' });
    }
  });
  app.get('/api/analytics/events', (req, res) => {
    res.json({ count: _analyticsEvents.length });
  });

  // Dashboard Analytics Aggregation
  app.get('/api/analytics/dashboard', async (req, res) => {
    try {
      // Aggregate data for dashboard charts
      const [bookings, revenue, maintenance] = await Promise.all([
        prisma.booking.findMany({ orderBy: { date: 'asc' } }),
        prisma.transaction.findMany({ where: { status: 'success' }, orderBy: { createdAt: 'asc' } }),
        prisma.maintenanceLog.findMany({ orderBy: { scheduledDate: 'asc' } })
      ]);

      // Process Revenue by Month
      const revenueByMonth = {};
      revenue.forEach(t => {
        const date = new Date(t.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        revenueByMonth[key] = (revenueByMonth[key] || 0) + t.amount;
      });

      // Process Bookings by Status
      const bookingsByStatus = { confirmed: 0, pending: 0, cancelled: 0 };
      bookings.forEach(b => {
        const status = b.status.toLowerCase();
        if (bookingsByStatus[status] !== undefined) bookingsByStatus[status]++;
      });

      // Process Maintenance Stats
      const maintenanceStats = { completed: 0, pending: 0, total: maintenance.length };
      maintenance.forEach(m => {
        if (m.completedDate) maintenanceStats.completed++;
        else maintenanceStats.pending++;
      });

      res.json({
        revenue: {
          labels: Object.keys(revenueByMonth).sort(),
          data: Object.keys(revenueByMonth).sort().map(k => revenueByMonth[k])
        },
        bookings: bookingsByStatus,
        maintenance: maintenanceStats
      });
    } catch (err) {
      console.error('[analytics/dashboard] error', err);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  });
}

// Maintenance Endpoints
app.get('/api/maintenance', async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      include: { unit: true },
      orderBy: { scheduledDate: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    console.error('[maintenance] fetch error', err);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

app.post('/api/maintenance', async (req, res) => {
  try {
    const { unitId, type, description, scheduledDate, technicianId } = req.body;
    if (!unitId || !type || !scheduledDate) return res.status(400).json({ error: 'Missing required fields' });

    const log = await prisma.maintenanceLog.create({
      data: {
        unitId,
        type,
        description: description || '',
        scheduledDate: new Date(scheduledDate),
        technicianId,
      }
    });

    // Update unit status to maintenance
    await prisma.unit.update({
      where: { id: unitId },
      data: { status: 'maintenance' }
    });

    res.json(log);
  } catch (err) {
    console.error('[maintenance] create error', err);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
});

app.put('/api/maintenance/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: { completedDate: new Date() }
    });

    // Update unit status back to active
    await prisma.unit.update({
      where: { id: log.unitId },
      data: { status: 'active' }
    });

    res.json(log);
  } catch (err) {
    console.error('[maintenance] complete error', err);
    res.status(500).json({ error: 'Failed to complete maintenance log' });
  }
});

app.delete('/api/maintenance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.maintenanceLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[maintenance] delete error', err);
    res.status(500).json({ error: 'Failed to delete maintenance log' });
  }
});

// Admin Endpoints
app.get('/api/admin/transactions', async (req, res) => {
  try {
    // Return mock transactions for now since Prisma might not be set up
    const mockTransactions = [
      {
        id: '1',
        provider: 'mpesa',
        email: 'customer1@example.com',
        amount: 5000,
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        reference: 'MPE' + Math.random().toString(36).substr(2, 9).toUpperCase()
      },
      {
        id: '2',
        provider: 'paystack',
        email: 'customer2@example.com',
        amount: 3500,
        status: 'completed',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        reference: 'PST' + Math.random().toString(36).substr(2, 9).toUpperCase()
      },
      {
        id: '3',
        provider: 'mpesa',
        email: 'customer3@example.com',
        amount: 7200,
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        reference: 'MPE' + Math.random().toString(36).substr(2, 9).toUpperCase()
      }
    ];
    res.json(mockTransactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/admin/seed', async (req, res) => {
  try {
    // Generate a demo transaction
    const demoTransaction = {
      id: Date.now().toString(),
      provider: Math.random() > 0.5 ? 'mpesa' : 'paystack',
      email: `demo${Math.floor(Math.random() * 1000)}@example.com`,
      amount: Math.floor(Math.random() * 10000) + 1000,
      status: Math.random() > 0.3 ? 'completed' : 'pending',
      createdAt: new Date().toISOString(),
      reference: 'DEMO' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };

    console.log('Seeded demo transaction:', demoTransaction);
    res.json({ success: true, transaction: demoTransaction });
  } catch (err) {
    console.error('Error seeding transaction:', err);
    res.status(500).json({ error: 'Failed to seed transaction' });
  }
});

function startServer(port) {
  const server = app.listen(port, () => console.log('Server listening on', port));

  // WebSocket Setup
  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (msg) => {
      console.log('Received WS message:', msg);
      ws.send(`Echo: ${msg}`);
    });
    ws.on('close', () => console.log('WebSocket client disconnected'));
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
