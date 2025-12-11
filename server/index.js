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
const { routeOptimize, predictMaintenance } = require('./ai');

const ROI_CONSTANTS = {
  AVOIDED_RATE: 0.35,
  BASE_AVOIDED: 120,
  BASE_MILES: 12,
  FUEL_RATE: 1.5
};

// Validate critical environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

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

// Weather API
app.get('/api/weather/current', async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'city parameter required' });

  const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!WEATHER_API_KEY) {
    return res.status(500).json({
      error: 'Weather API key not configured. Please add OPENWEATHER_API_KEY to environment variables.'
    });
  }

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: WEATHER_API_KEY,
        units: 'metric'
      },
      timeout: 5000
    });

    res.json(response.data);
  } catch (err) {
    console.error('Weather API error:', err.message);
    res.status(502).json({
      error: 'Failed to fetch weather data',
      details: err.response?.data?.message || err.message
    });
  }
});

// Paystack Init (One-time payment)
app.post('/api/paystack/init', async (req, res) => {
  const { email, amount } = req.body;
  if (!email || !amount) return res.status(400).json({ error: 'email and amount required' });

  try {
    console.log('[Paystack] Init request:', { email, amount });
    const resp = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: Math.round(amount * 100)
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });

    console.log('[Paystack] Init response:', resp.data);

    await prisma.transaction.create({
      data: {
        provider: 'paystack',
        email,
        amount: Number(amount),
        raw: JSON.stringify(resp.data),
        status: 'pending'
      }
    });
    res.json(resp.data);
  } catch (err) {
    console.error('[Paystack] Init failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Paystack init failed', details: err.response?.data?.message });
  }
});

// Paystack Subscriptions
app.post('/api/billing/create-subscription', async (req, res) => {
  const { email, planCode, userId } = req.body;
  if (!email || !planCode) return res.status(400).json({ error: 'email and planCode required' });

  try {
    console.log('Creating subscription for:', { email, planCode, userId });

    // Step 1: Create customer if doesn't exist
    let customer;
    try {
      const customerResp = await axios.post('https://api.paystack.co/customer', {
        email,
        metadata: { userId }
      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      });
      customer = customerResp.data.data;
      console.log('Customer created/found:', customer.customer_code);
    } catch (err) {
      // Customer might already exist, that's okay
      console.log('Customer creation note:', err.response?.data?.message);
    }

    // Step 2: Create subscription
    const subscriptionResp = await axios.post('https://api.paystack.co/subscription', {
      customer: email,
      plan: planCode,
      metadata: { userId, planCode }
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });

    if (subscriptionResp.data.status) {
      const subData = subscriptionResp.data.data;
      // Return the email token URL for payment
      res.json({
        authorization_url: subData.authorization?.authorization_url || `https://paystack.com/pay/${subData.email_token}`,
        access_code: subData.email_token,
        reference: subData.subscription_code
      });
    } else {
      throw new Error('Invalid response from Paystack');
    }
  } catch (err) {
    console.error('Paystack subscription error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// M-Pesa STK Push
app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  const formattedPhone = phone.replace('+', '').replace(/^0/, '254');
  console.log('[M-Pesa] STK Request:', { phone: formattedPhone, amount });

  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const passkey = process.env.MPESA_PASSKEY;
    const shortCode = process.env.MPESA_SHORTCODE || '174379';
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 'http://localhost:3001/api/mpesa/callback';

    if (!consumerKey || !consumerSecret || !passkey) {
      throw new Error('M-Pesa credentials not configured');
    }

    // 1. Get Token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResp = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const accessToken = tokenResp.data.access_token;

    // 2. Generate Password
    // 2. Generate Password
    // M-Pesa requires YYYYMMDDHHMMSS in GMT+3 (Nairobi)
    const now = new Date();
    // 3 hours offset in milliseconds
    const nairobiTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));

    const timestamp = nairobiTime.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    // 3. Initiate Push
    const stkData = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.floor(Number(amount)),
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: "SmartSanitation",
      TransactionDesc: "Service Payment"
    };

    const stkResp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', stkData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('[M-Pesa] STK Response:', stkResp.data);

    // Save transaction
    await prisma.transaction.create({
      data: {
        provider: 'mpesa',
        phone: formattedPhone,
        amount: Number(amount),
        raw: JSON.stringify(stkResp.data),
        status: 'pending'
      }
    });

    res.json(stkResp.data);
  } catch (err) {
    console.error('[M-Pesa] Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'M-Pesa STK failed',
      details: err.response?.data?.errorMessage || err.message
    });
  }
});

// M-Pesa Callback
app.post('/api/mpesa/callback', (req, res) => {
  console.log('--- M-PESA CALLBACK ---');
  console.log(JSON.stringify(req.body, null, 2));
  // In a real app, update transaction status here
  res.json({ result: 'success' });
});

// Verify subscription payment
app.get('/api/billing/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });

    const data = resp.data.data;

    if (data.status === 'success') {
      // Update user subscription in database
      const userId = data.metadata?.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan: data.plan_object?.name || 'growth',
            subscriptionStatus: 'active',
            subscriptionReference: reference
          }
        });
      }
    }

    res.json({
      status: data.status,
      amount: data.amount / 100
    });
  } catch (err) {
    console.error('Verification error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
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
// Assistant endpoint - Enhanced Rule-Based RAG
app.post('/api/assistant/message', async (req, res) => {
  try {
    const { message, locale } = req.body || {};
    if (typeof message !== 'string') return res.status(400).json({ error: 'message string required' });

    const lowerMsg = message.toLowerCase();
    let reply = '';

    // --- Intent Detection Logic (Simple Heuristics) ---

    // 1. Booking / Reservation Query
    if (lowerMsg.includes('book') || lowerMsg.includes('order') || lowerMsg.includes('reserve')) {
      const pendingBookings = await prisma.booking.count({ where: { status: 'pending' } });
      const confirmedBookings = await prisma.booking.count({ where: { status: 'confirmed' } });

      if (locale === 'sw') {
        reply = `Tuna nafasi! Kwa sasa tuna oda ${pendingBookings} zinazosubiri na ${confirmedBookings} zimethibitishwa. Unaweza kuweka oda mpya kupitia tab ya 'Bookings'.`;
      } else {
        reply = `We can help with that! Currently, we have ${pendingBookings} pending and ${confirmedBookings} confirmed bookings. You can create a new booking directly from the 'Bookings' tab.`;
      }
    }
    // 2. Pricing / Cost Query
    else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('much')) {
      if (locale === 'sw') {
        reply = "Bei zetu zinaanza KES 2,500 kwa siku kwa kila unit. Tunatoa punguzo kwa oda za muda mrefu (zaidi ya siku 7).";
      } else {
        reply = "Our standard pricing starts at KES 2,500 per day per unit. We offer discounts for long-term rentals (7+ days).";
      }
    }
    // 3. Maintenance / Status Query
    else if (lowerMsg.includes('maintenance') || lowerMsg.includes('repair') || lowerMsg.includes('broken') || lowerMsg.includes('status')) {
      const unitsInMaintenance = await prisma.unit.count({ where: { status: 'maintenance' } });
      const unitsActive = await prisma.unit.count({ where: { status: 'active' } });

      if (locale === 'sw') {
        reply = `Hali ya sasa: Tuna units ${unitsInMaintenance} kwenye ukarabati na ${unitsActive} zipo tayari kufanya kazi.`;
      } else {
        reply = `System Status: ${unitsInMaintenance} units are currently in maintenance, while ${unitsActive} are active and deployed.`;
      }
    }
    // 4. Revenue / Earnings (Admin Query)
    else if (lowerMsg.includes('money') || lowerMsg.includes('revenue') || lowerMsg.includes('earned') || lowerMsg.includes('sales')) {
      // Quickly sum up successful transactions
      const aggregations = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'success' }
      });
      const total = aggregations._sum.amount || 0;

      if (locale === 'sw') {
        reply = `Jumla ya mapato hadi sasa ni KES ${total.toLocaleString()}.`;
      } else {
        reply = `Total revenue generated to date is KES ${total.toLocaleString()}.`;
      }
    }
    // Default / Greeting
    else {
      if (locale === 'sw') {
        reply = "Habari! Mimi ni msaidizi wako wa AI. Naweza kukusaidia na maswala ya oda, bei, au hali ya units. Tafadhali uliza chote!";
      } else {
        reply = "Hello! I am your AI sanitation assistant. I can help you with bookings, pricing enquiries, system status, or revenue reports. Ask me anything!";
      }
    }

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

// ==================== Weather API ====================
// Duplicate weather route removed


// ==================== AI Endpoints ====================
// Predictive Maintenance
app.post('/api/ai/predict-maintenance', (req, res) => {
  try {
    const { units = [] } = req.body;
    // Use shared AI logic
    const results = predictMaintenance(units);
    res.json({ results });
  } catch (err) {
    console.error('[Predictive Maintenance] Error:', err);
    res.status(500).json({ error: 'Failed to analyze maintenance risks' });
  }
});

// Route Optimization
app.post('/api/ai/route-optimize', (req, res) => {
  try {
    const { depot, stops = [] } = req.body;

    if (!depot || stops.length === 0) {
      return res.status(400).json({ error: 'Depot and stops required' });
    }

    // Use shared Haversine-based logic
    const result = routeOptimize({ depot, stops });

    res.json({
      orderedStops: result.orderedStops,
      totalDistanceKm: result.totalDistanceKm,
      estimatedTimeHours: (result.totalDistanceKm / 40).toFixed(1), // Assuming 40 km/h average
      savings: {
        distance: '15%',
        fuel: 'KSh 450'
      }
    });
  } catch (err) {
    console.error('[Route Optimization] Error:', err);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});


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

  // ROI & Value Analytics
  app.get('/api/analytics/roi', async (req, res) => {
    try {
      const [units, logs, transactions] = await Promise.all([
        prisma.unit.findMany(),
        prisma.maintenanceLog.findMany(),
        prisma.transaction.findMany({ where: { status: 'success' } })
      ]);

      const totalServicings = logs.length || 1;
      const pickupsAvoided = Math.floor(totalServicings * ROI_CONSTANTS.AVOIDED_RATE) + ROI_CONSTANTS.BASE_AVOIDED;
      const routeMilesReduced = pickupsAvoided * ROI_CONSTANTS.BASE_MILES;
      const fuelSavings = routeMilesReduced * ROI_CONSTANTS.FUEL_RATE;

      const activeUnits = units.filter(u => u.status === 'active').length;
      const totalUnits = units.length || 1;
      const uptime = ((activeUnits / totalUnits) * 100).toFixed(1);

      const monthlyRevenue = {};
      transactions.forEach(t => {
        const d = new Date(t.createdAt);
        const month = d.toLocaleString('default', { month: 'short' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + t.amount;
      });

      res.json({
        pickupsAvoided,
        routeMilesReduced,
        fuelSavings,
        uptime,
        monthlyRevenue
      });
    } catch (err) {
      console.error('[analytics/roi] error', err);
      res.status(500).json({ error: 'Failed to fetch ROI metrics' });
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

// Units (Fleet)
app.get('/api/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany();
    // Convert 'coordinates' string "[lat,lon]" back to array if needed, or frontend handles it?
    // Frontend expects [number, number]. Prisma stores String?.
    // Let's parse it here.
    const formatted = units.map(u => ({
      ...u,
      coordinates: u.coordinates ? JSON.parse(u.coordinates) : [-1.2921, 36.8219]
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching units', err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

app.post('/api/units', async (req, res) => {
  try {
    const { serialNo, location, fillLevel, batteryLevel, status, coordinates } = req.body;
    const unit = await prisma.unit.create({
      data: {
        serialNo,
        location,
        fillLevel: Number(fillLevel),
        batteryLevel: Number(batteryLevel),
        status,
        coordinates: JSON.stringify(coordinates),
      }
    });
    res.json(unit);
  } catch (err) {
    console.error('Error creating unit', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

app.put('/api/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { location, fillLevel, batteryLevel, status } = req.body;
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        location,
        fillLevel: Number(fillLevel),
        batteryLevel: Number(batteryLevel),
        status,
        lastSeen: new Date(),
      }
    });
    res.json(unit);
  } catch (err) {
    console.error('Error updating unit', err);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// Routes
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await prisma.route.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(routes);
  } catch (err) {
    console.error('Error fetching routes', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

app.post('/api/routes', async (req, res) => {
  try {
    const route = await prisma.route.create({ data: req.body });
    res.json(route);
  } catch (err) {
    console.error('Error creating route', err);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.put('/api/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const route = await prisma.route.update({ where: { id }, data: req.body });
    res.json(route);
  } catch (err) {
    console.error('Error updating route', err);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

app.delete('/api/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.route.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting route', err);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

// Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { date: 'desc' } });
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    // Ensure date is properly formatted
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const booking = await prisma.booking.create({ data });
    res.json(booking);
  } catch (err) {
    console.error('Error creating booking', err);
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const booking = await prisma.booking.update({ where: { id }, data });
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.booking.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting booking', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Team Members
app.get('/api/team-members', async (req, res) => {
  try {
    const members = await prisma.teamMember.findMany();
    res.json(members);
  } catch (err) {
    console.error('Error fetching team members', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

app.post('/api/team-members', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.joinDate) data.joinDate = new Date();
    const member = await prisma.teamMember.create({ data });
    res.json(member);
  } catch (err) {
    console.error('Error creating team member', err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

app.put('/api/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.teamMember.update({ where: { id }, data: req.body });
    res.json(member);
  } catch (err) {
    console.error('Error updating team member', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

app.delete('/api/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.teamMember.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting team member', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// Settings
// Duplicate settings endpoints removed (use authenticated versions)

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


// Notifications (WhatsApp/Email Mock)
app.get('/api/notifications', async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching notifications', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications/send', async (req, res) => {
  const { channel, recipient, message } = req.body;
  if (!channel || !recipient || !message) return res.status(400).json({ error: 'Missing fields' });

  // Simulate external API call (e.g. Twilio/Meta)
  console.log(`[${channel.toUpperCase()}] Sending to ${recipient}: "${message}"`);

  // Artificial delay to feel real
  await new Promise(r => setTimeout(r, 800));

  try {
    const log = await prisma.notificationLog.create({
      data: {
        channel,
        recipient,
        message,
        status: 'sent' // Assume success for demo
      }
    });
    res.json({ success: true, log });
  } catch (err) {
    console.error('Error logging notification', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ==================== Settings API ====================
// GET company settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    // Try to get settings from database
    let settings = await prisma.settings.findFirst({
      where: { userId: req.user.sub }
    });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: req.user.sub,
          companyName: 'Smart Sanitation Co.',
          contactEmail: req.user.email || 'admin@smartsanitation.co.ke',
          phone: '+254 700 000 000',
          language: 'en',
          whatsappNotifications: true,
          emailNotifications: true
        }
      });
    }

    res.json(settings);
  } catch (err) {
    console.error('[GET /api/settings] Error:', err);
    // Return default settings if database fails
    res.json({
      companyName: 'Smart Sanitation Co.',
      contactEmail: req.user?.email || 'admin@smartsanitation.co.ke',
      phone: '+254 700 000 000',
      language: 'en',
      whatsappNotifications: true,
      emailNotifications: true
    });
  }
});

// PUT/Update company settings
app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const {
      companyName,
      contactEmail,
      phone,
      language,
      whatsappNotifications,
      emailNotifications
    } = req.body;

    // Validation
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if settings exist
    let settings = await prisma.settings.findFirst({
      where: { userId: req.user.sub }
    });

    if (settings) {
      // Update existing settings
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          companyName: companyName || settings.companyName,
          contactEmail: contactEmail || settings.contactEmail,
          phone: phone || settings.phone,
          language: language || settings.language,
          whatsappNotifications: whatsappNotifications !== undefined ? whatsappNotifications : settings.whatsappNotifications,
          emailNotifications: emailNotifications !== undefined ? emailNotifications : settings.emailNotifications,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new settings
      settings = await prisma.settings.create({
        data: {
          userId: req.user.sub,
          companyName: companyName || 'Smart Sanitation Co.',
          contactEmail: contactEmail || req.user.email,
          phone: phone || '+254 700 000 000',
          language: language || 'en',
          whatsappNotifications: whatsappNotifications !== undefined ? whatsappNotifications : true,
          emailNotifications: emailNotifications !== undefined ? emailNotifications : true
        }
      });
    }

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings
    });
  } catch (err) {
    console.error('[PUT /api/settings] Error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
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
