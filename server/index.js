require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
const { routeOptimize, predictMaintenance, smartBookingSuggest } = require('./ai');

// Import custom modules
const logger = require('./logger');
const { validate } = require('./validation');
const {
  rateLimiters,
  helmetConfig,
  getCorsOptions,
  sanitizeRequest,
  securityHeaders,
  logRequest,
  logError
} = require('./security');
const {
  healthCheck,
  readinessCheck,
  livenessCheck,
  metrics
} = require('./health');

const ROI_CONSTANTS = {
  AVOIDED_RATE: 0.35,
  BASE_AVOIDED: 120,
  BASE_MILES: 12,
  FUEL_RATE: 1.5
};

// Validate critical environment variables at startup
if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  logger.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const prisma = new PrismaClient();
const app = express();

// ==================== SECURITY MIDDLEWARE ====================
// Apply security headers first
app.use(helmetConfig);
app.use(securityHeaders);

// Enable compression for all responses
app.use(compression());

// CORS configuration
app.use(cors(getCorsOptions()));

// Request logging (Morgan + Winston)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: logger.stream }));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Custom request logging
app.use(logRequest);

// ==================== HEALTH CHECK ENDPOINTS ====================
// These should be before rate limiting to allow monitoring tools unrestricted access
app.get('/health', healthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/live', livenessCheck);
app.get('/health/metrics', metrics);

// Database diagnostic endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    const isSet = !!dbUrl;
    const maskedUrl = isSet ? dbUrl.replace(/:[^:@]*@/, ':****@') : 'not set';

    console.log('Diagnosing DB connection...');
    console.log('DATABASE_URL set:', isSet);
    console.log('Masked URL:', maskedUrl);

    // Attempt raw query
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - startTime;

    res.json({
      status: 'connected',
      latency: `${duration}ms`,
      config: {
        url_set: isSet,
        url_masked: maskedUrl
      }
    });
  } catch (error) {
    console.error('DB Diagnosis failed:', error);
    res.status(500).json({
      status: 'disconnected',
      error: error.message,
      code: error.code,
      meta: error.meta,
      config: {
        url_set: !!process.env.DATABASE_URL,
        // Safe to show protocol and host if possible
        protocol: process.env.DATABASE_URL?.split(':')[0]
      }
    });
  }
});

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
app.post('/api/auth/register', rateLimiters.auth, validate('register'), async (req, res) => {
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

app.post('/api/auth/login', rateLimiters.auth, validate('login'), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan || 'starter'
      }
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot Password - Generate reset token
app.post('/api/auth/forgot-password', rateLimiters.auth, validate('forgotPassword'), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database (you'll need to add these fields to User model)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // In production, send email with reset link
    // For now, we'll log it to console
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    console.log('🔐 Password Reset Link:', resetLink);
    console.log('📧 Send this link to:', email);

    // TODO: Send email using nodemailer
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   to: email,
    //   subject: 'Password Reset Request',
    //   html: `Click here to reset your password: <a href="${resetLink}">${resetLink}</a>`
    // });

    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - Verify token and update password
app.post('/api/auth/reset-password', rateLimiters.auth, validate('resetPassword'), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
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
app.post('/api/paystack/init', rateLimiters.payment, validate('paystackInit'), async (req, res) => {
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
// [Removed legacy Paystack-only create-subscription route to avoid conflict with new dynamic route]

// M-Pesa STK Push
app.post('/api/mpesa/stk', rateLimiters.payment, validate('mpesaSTK'), async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  const formattedPhone = phone.replace('+', '').replace(/^0/, '254');
  console.log('[M-Pesa] STK Request:', { phone: formattedPhone, amount });

  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const passkey = process.env.MPESA_PASSKEY;
    const shortCode = process.env.MPESA_SHORTCODE || '174379';
    // Use a valid HTTPS URL for callback (required by M-Pesa)
    // For local development, use a dummy URL or ngrok
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/api/mpesa/callback';
    const baseUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // Validate credentials
    if (!consumerKey || !consumerSecret || !passkey) {
      console.error('[M-Pesa] Missing credentials:', {
        hasConsumerKey: !!consumerKey,
        hasConsumerSecret: !!consumerSecret,
        hasPasskey: !!passkey
      });

      return res.status(503).json({
        error: 'M-Pesa not configured',
        message: 'M-Pesa credentials are not set. Please configure MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY in your environment variables.',
        documentation: 'See server/.env.mpesa.template for setup instructions'
      });
    }

    // 1. Get Token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    let tokenResp;
    try {
      tokenResp = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
      });
    } catch (authError) {
      console.error('[M-Pesa] Authentication failed:', authError.response?.data || authError.message);
      return res.status(401).json({
        error: 'M-Pesa authentication failed',
        message: 'Invalid M-Pesa credentials. Please check your MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET.',
        details: authError.response?.data?.errorMessage || authError.message
      });
    }

    const accessToken = tokenResp.data.access_token;

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

    const stkResp = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, stkData, {
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
      message: err.response?.data?.errorMessage || err.message,
      details: err.response?.data
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

// Duplicate AI endpoints removed (see shared implementation)

// Assistant endpoint
// OLD ENDPOINT - DISABLED (replaced by enhanced version below)
app.post('/api/assistant/message-OLD-DISABLED', async (req, res) => {
  try {
    const { message, locale } = req.body || {};
    if (typeof message !== 'string') return res.status(400).json({ error: 'message string required' });

    const lowerMsg = message.toLowerCase();
    let reply = '';

    // --- Enhanced Intent Detection Logic ---

    // 1. Booking / Reservation Query
    if (lowerMsg.includes('book') || lowerMsg.includes('order') || lowerMsg.includes('reserve') || lowerMsg.includes('rent')) {
      const pendingBookings = await prisma.booking.count({ where: { status: 'pending' } });
      const confirmedBookings = await prisma.booking.count({ where: { status: 'confirmed' } });
      const availableUnits = await prisma.unit.count({ where: { status: 'active' } });

      if (lowerMsg.includes('how') || lowerMsg.includes('process')) {
        if (locale === 'sw') {
          reply = `Mchakato wa kuweka oda ni rahisi! 1) Nenda kwenye tab ya 'Bookings' 2) Bonyeza 'New Booking' 3) Jaza maelezo ya mteja, chagua unit, na tarehe 4) Thibitisha malipo. Tuna units ${availableUnits} zinazopatikana sasa hivi!`;
        } else {
          reply = `Booking is easy! 1) Go to the 'Bookings' tab 2) Click 'New Booking' 3) Fill in customer details, select a unit, and choose dates 4) Confirm payment. We have ${availableUnits} units available right now!`;
        }
      } else {
        if (locale === 'sw') {
          reply = `Tuna nafasi! Kwa sasa tuna oda ${pendingBookings} zinazosubiri na ${confirmedBookings} zimethibitishwa. Units ${availableUnits} zipo tayari. Unaweza kuweka oda mpya kupitia tab ya 'Bookings'.`;
        } else {
          reply = `We can help with that! Currently, we have ${pendingBookings} pending and ${confirmedBookings} confirmed bookings. ${availableUnits} units are available. You can create a new booking directly from the 'Bookings' tab.`;
        }
      }
    }
    // 2. Pricing / Cost Query
    else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('much') || lowerMsg.includes('rate')) {
      if (lowerMsg.includes('type') || lowerMsg.includes('different') || lowerMsg.includes('unit')) {
        if (locale === 'sw') {
          reply = "Bei zetu ni: **Standard Portable**: KES 2,500/siku, **Deluxe Portable**: KES 3,500/siku, **Wheelchair Accessible**: KES 4,000/siku. Punguzo za 15% kwa oda za wiki 1+, 25% kwa mwezi 1+.";
        } else {
          reply = "Our pricing: **Standard Portable**: KES 2,500/day, **Deluxe Portable**: KES 3,500/day, **Wheelchair Accessible**: KES 4,000/day. Discounts: 15% for 1+ week, 25% for 1+ month.";
        }
      } else {
        if (locale === 'sw') {
          reply = "Bei zetu zinaanza KES 2,500 kwa siku kwa kila unit. Tunatoa punguzo kwa oda za muda mrefu (zaidi ya siku 7). Tuna aina tatu: Standard, Deluxe, na Wheelchair Accessible.";
        } else {
          reply = "Our standard pricing starts at KES 2,500 per day per unit. We offer discounts for long-term rentals (7+ days). We have 3 types: Standard, Deluxe, and Wheelchair Accessible units.";
        }
      }
    }
    // 3. Payment Query
    else if (lowerMsg.includes('pay') || lowerMsg.includes('payment') || lowerMsg.includes('mpesa') || lowerMsg.includes('card')) {
      const paidBookings = await prisma.booking.count({ where: { paymentStatus: 'paid' } });
      const pendingPayments = await prisma.booking.count({ where: { paymentStatus: 'pending' } });

      if (lowerMsg.includes('method') || lowerMsg.includes('how')) {
        if (locale === 'sw') {
          reply = "Tunakubali malipo kupitia: M-Pesa (Paybill 123456), Kadi za Benki (Visa/Mastercard), na Malipo ya Moja kwa Moja kwa Benki. Malipo yote ni salama na yanalindwa. Unaweza kulipa wakati wa kuweka oda au baadaye.";
        } else {
          reply = "We accept payments via: M-Pesa (Paybill 123456), Credit/Debit Cards (Visa/Mastercard), and Direct Bank Transfer. All payments are secure and encrypted. You can pay during booking or later.";
        }
      } else {
        if (locale === 'sw') {
          reply = `Hali ya malipo: ${paidBookings} oda zimelipwa, ${pendingPayments} zinasubiri malipo. Tunakubali M-Pesa, kadi za benki, na uhamisho wa benki.`;
        } else {
          reply = `Payment status: ${paidBookings} bookings paid, ${pendingPayments} pending payment. We accept M-Pesa, credit cards, and bank transfers.`;
        }
      }
    }
    // 4. Maintenance / Status Query
    else if (lowerMsg.includes('maintenance') || lowerMsg.includes('repair') || lowerMsg.includes('broken') || lowerMsg.includes('status') || lowerMsg.includes('service')) {
      const unitsInMaintenance = await prisma.unit.count({ where: { status: 'maintenance' } });
      const unitsActive = await prisma.unit.count({ where: { status: 'active' } });

      if (lowerMsg.includes('schedule') || lowerMsg.includes('when') || lowerMsg.includes('how often')) {
        if (locale === 'sw') {
          reply = "Ratiba ya ukarabati: Units zinahudumishwa kila wiki 2, au wakati fill level inafikia 90%, au wakati IoT sensors zinaonyesha tatizo. Tunafuatilia kiotomatiki hali, joto, na unyevu wa kila unit.";
        } else {
          reply = "Maintenance schedule: Units are serviced every 2 weeks, when fill level reaches 90%, or when IoT sensors detect issues. We automatically monitor temperature, humidity, and odor levels for each unit.";
        }
      } else {
        if (locale === 'sw') {
          reply = `Hali ya sasa: Tuna units ${unitsInMaintenance} kwenye ukarabati na ${unitsActive} zipo tayari kufanya kazi. Tunafuatilia kila unit kwa kutumia IoT sensors kwa joto, unyevu, na harufu.`;
        } else {
          reply = `System Status: ${unitsInMaintenance} units are currently in maintenance, while ${unitsActive} are active and deployed. We monitor each unit with IoT sensors for temperature, humidity, and odor levels.`;
        }
      }
    }
    // 5. IoT / Monitoring Query
    else if (lowerMsg.includes('iot') || lowerMsg.includes('sensor') || lowerMsg.includes('monitor') || lowerMsg.includes('track') || lowerMsg.includes('temperature')) {
      if (locale === 'sw') {
        reply = "Kila unit ina sensors za IoT zinazofuatilia: 🌡️ Joto (27-30°C), 💧 Unyevu (60-70%), 👃 Kiwango cha harufu (0-100), 📊 Idadi ya matumizi, na 🔋 Betri. Data inapatikana wakati halisi kwenye Fleet Map!";
      } else {
        reply = "Each unit has IoT sensors tracking: 🌡️ Temperature (27-30°C), 💧 Humidity (60-70%), 👃 Odor level (0-100), 📊 Usage count, and 🔋 Battery. Real-time data is available on the Fleet Map!";
      }
    }
    // 6. Unit Types Query
    else if (lowerMsg.includes('type') || lowerMsg.includes('kind') || lowerMsg.includes('wheelchair') || lowerMsg.includes('accessible')) {
      if (locale === 'sw') {
        reply = "Tuna aina 3 za units: **Standard Portable** (KES 2,500/siku) - kawaida, **Deluxe Portable** (KES 3,500/siku) - ina vipengele vya ziada, **Wheelchair Accessible** (KES 4,000/siku) - inafaa kwa wenye ulemavu. Zote zina IoT monitoring!";
      } else {
        reply = "We have 3 unit types: **Standard Portable** (KES 2,500/day) - basic model, **Deluxe Portable** (KES 3,500/day) - premium features, **Wheelchair Accessible** (KES 4,000/day) - ADA compliant. All include IoT monitoring!";
      }
    }
    // 7. Revenue / Earnings (Admin Query)
    else if (lowerMsg.includes('money') || lowerMsg.includes('revenue') || lowerMsg.includes('earned') || lowerMsg.includes('sales') || lowerMsg.includes('income')) {
      const aggregations = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'success' }
      });
      const total = aggregations._sum.amount || 0;
      const bookingCount = await prisma.booking.count({ where: { status: 'confirmed' } });

      if (locale === 'sw') {
        reply = `Jumla ya mapato hadi sasa ni KES ${total.toLocaleString()} kutoka kwa oda ${bookingCount} zilizothibitishwa. Unaweza kuona ripoti kamili kwenye tab ya 'Analytics'.`;
      } else {
        reply = `Total revenue generated to date is KES ${total.toLocaleString()} from ${bookingCount} confirmed bookings. View detailed reports in the 'Analytics' tab.`;
      }
    }
    // 8. Location / Availability Query
    else if (lowerMsg.includes('where') || lowerMsg.includes('location') || lowerMsg.includes('area') || lowerMsg.includes('available')) {
      const units = await prisma.unit.findMany({ where: { status: 'active' }, select: { location: true } });
      const locations = [...new Set(units.map(u => u.location))].slice(0, 5).join(', ');

      if (locale === 'sw') {
        reply = `Tuna units katika maeneo mengi ya Nairobi ikiwemo: ${locations}. Angalia Fleet Map kuona mahali halisi pa kila unit!`;
      } else {
        reply = `We have units deployed across Nairobi including: ${locations}. Check the Fleet Map to see exact locations of all units!`;
      }
    }
    // Default / Greeting
    else {
      if (locale === 'sw') {
        reply = "Habari! 👋 Mimi ni Cortex AI, msaidizi wako wa Smart Sanitation. Naweza kukusaidia na:\n\n📅 **Oda** - Jinsi ya kuweka oda\n💰 **Bei** - Aina za units na bei\n💳 **Malipo** - Njia za kulipa\n🔧 **Ukarabati** - Hali ya units\n📡 **IoT** - Ufuatiliaji wa wakati halisi\n\nUliza chochote!";
      } else {
        reply = "Hello! 👋 I'm Cortex AI, your Smart Sanitation assistant. I can help you with:\n\n📅 **Bookings** - How to make reservations\n💰 **Pricing** - Unit types and rates\n💳 **Payments** - Payment methods\n🔧 **Maintenance** - Unit status and service\n📡 **IoT** - Real-time monitoring\n\nAsk me anything!";
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

// ==================== ENHANCED AI ASSISTANT ====================
const { handleAssistantMessage } = require('./assistant-enhanced');

app.post('/api/assistant/message', rateLimiters.api, async (req, res) => {
  try {
    const { message, locale, sessionId } = req.body || {};
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'message string required' });
    }

    const reply = await handleAssistantMessage(message, locale, sessionId);
    res.json({ reply });
  } catch (err) {
    logger.error('[assistant/message] error', { error: err?.message || err });
    res.status(500).json({ error: 'Assistant failed' });
  }
});

// ==================== ROI Analytics ====================
app.get('/api/analytics/roi', async (req, res) => {
  try {
    // Fetch real data from database
    const units = await prisma.unit.findMany();
    const routes = await prisma.route.findMany();
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Calculate KPIs from real data
    const totalUnits = units.length;
    const activeUnits = units.filter(u => u.status === 'active').length;
    const avgFillLevel = units.length > 0
      ? units.reduce((sum, u) => sum + u.fillLevel, 0) / units.length
      : 0;

    // Pickups Avoided: Based on smart routing (units with <80% fill)
    const pickupsAvoided = units.filter(u => u.fillLevel < 80).length;

    // Route Miles Reduced: Estimate based on optimized routes
    const completedRoutes = routes.filter(r => r.status === 'completed');
    const routeMilesReduced = completedRoutes.length * 15; // Avg 15 miles saved per optimized route

    // Fuel Savings: $3.50 per gallon, 8 MPG average truck
    const fuelSavings = (routeMilesReduced / 8) * 3.50;

    // Uptime: Percentage of active units
    const uptime = totalUnits > 0 ? ((activeUnits / totalUnits) * 100).toFixed(1) : 0;

    // Monthly Revenue from bookings
    const monthlyRevenue = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      last6Months.push(monthKey);
      monthlyRevenue[monthKey] = 0;
    }

    bookings.forEach(booking => {
      const bookingDate = new Date(booking.createdAt);
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        monthlyRevenue[monthKey] += booking.amount || 0;
      }
    });

    // Cohort Analysis - Real data based on booking patterns
    const cohorts = [];
    const now = new Date();

    // Analyze last 3 months
    for (let i = 0; i < 3; i++) {
      const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortName = cohortDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Get bookings from this cohort month
      const cohortBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === cohortDate.getMonth() &&
          bookingDate.getFullYear() === cohortDate.getFullYear();
      });

      const cohortSize = cohortBookings.length;

      if (cohortSize > 0) {
        // Calculate retention (simplified - based on repeat bookings)
        const uniqueCustomers = new Set(cohortBookings.map(b => b.customerName)).size;
        const repeatCustomers = cohortBookings.length - uniqueCustomers;

        // Estimate retention rates
        const d7 = Math.min(95, 70 + (repeatCustomers / cohortSize) * 30);
        const d30 = Math.min(85, 50 + (repeatCustomers / cohortSize) * 35);
        const d90 = Math.min(75, 35 + (repeatCustomers / cohortSize) * 40);

        cohorts.push({
          cohort: cohortName,
          d7: Math.round(d7),
          d30: Math.round(d30),
          d90: Math.round(d90)
        });
      }
    }

    // If no real cohort data, return empty array instead of mock data
    if (cohorts.length === 0) {
      cohorts.push({
        cohort: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        d7: 0,
        d30: 0,
        d90: 0
      });
    }


    // Engagement Metrics
    const totalBookings = bookings.length;
    const recentBookings = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return bookingDate >= weekAgo;
    }).length;

    const engagement = {
      wau: recentBookings, // Weekly active (recent bookings)
      mau: Math.min(totalBookings, 50), // Monthly active (capped for display)
      stickiness: recentBookings > 0 && totalBookings > 0
        ? ((recentBookings / Math.min(totalBookings, 50)) * 100).toFixed(0)
        : 0,
      activeRatio: totalUnits > 0 ? ((activeUnits / totalUnits) * 100).toFixed(0) : 0
    };

    res.json({
      pickupsAvoided,
      routeMilesReduced,
      fuelSavings: Math.round(fuelSavings),
      uptime: parseFloat(uptime),
      monthlyRevenue,
      cohorts,
      engagement
    });

  } catch (err) {
    console.error('Error calculating ROI:', err);
    res.status(500).json({ error: 'Failed to calculate ROI metrics' });
  }
});


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

// Duplicate M-Pesa endpoints removed


// Admin Routes (Protected)
// Temporarily disabled auth middleware for demo purposes since frontend uses mock auth
// app.use('/api/admin', authMiddleware);

app.get('/api/admin/transactions', authMiddleware, async (req, res) => {
  try {
    console.log('[/api/admin/transactions] Fetching transactions...');
    const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(`[/api/admin/transactions] Found ${transactions.length} transactions`);
    res.json({ transactions });
  } catch (err) {
    console.error('[/api/admin/transactions] Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
});

app.post('/api/admin/seed', authMiddleware, async (req, res) => {
  // PRODUCTION SAFETY: Only allow seeding in development/staging environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Seeding is disabled in production',
      message: 'Cannot add demo data to production database'
    });
  }

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

app.delete('/api/admin/transactions/:id', authMiddleware, async (req, res) => {
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
      // Fetch data including timestamps for cohort analysis
      const [units, logs, transactions] = await Promise.all([
        prisma.unit.findMany(),
        prisma.maintenanceLog.findMany(),
        prisma.transaction.findMany({ where: { status: 'success' }, orderBy: { createdAt: 'asc' } })
      ]);

      // --- Operational ROI Metrics ---
      const totalServicings = logs.length || 1;
      const pickupsAvoided = Math.floor(totalServicings * ROI_CONSTANTS.AVOIDED_RATE) + ROI_CONSTANTS.BASE_AVOIDED;
      const routeMilesReduced = pickupsAvoided * ROI_CONSTANTS.BASE_MILES;
      const fuelSavings = routeMilesReduced * ROI_CONSTANTS.FUEL_RATE;

      const activeUnits = units.filter(u => u.status === 'active').length;
      const totalUnits = units.length || 1;
      const uptime = ((activeUnits / totalUnits) * 100).toFixed(1);

      // --- Revenue Trend ---
      const monthlyRevenue = {};
      transactions.forEach(t => {
        const d = new Date(t.createdAt);
        const month = d.toLocaleString('default', { month: 'short' }); // e.g., "Oct", "Nov"
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + t.amount;
      });

      // --- Cohort Analysis (Retention) ---
      // Goal: Group users by their first transaction month, then track if they transact in subsequent months.
      const userFirstMonth = new Map(); // email -> "YYYY-MM"
      const monthlyActiveUsers = new Map(); // "YYYY-MM" -> Set(email)

      transactions.forEach(t => {
        const userId = t.email || t.phone; // Use email or phone as ID
        if (!userId) return;

        const d = new Date(t.createdAt);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (!userFirstMonth.has(userId)) {
          userFirstMonth.set(userId, monthKey);
        }

        if (!monthlyActiveUsers.has(monthKey)) {
          monthlyActiveUsers.set(monthKey, new Set());
        }
        monthlyActiveUsers.get(monthKey).add(userId);
      });

      // Generate last 5 months of cohorts
      const availableMonths = Array.from(monthlyActiveUsers.keys()).sort();
      const recentMonths = availableMonths.slice(-5);

      const cohorts = recentMonths.map(cohortMonthKey => {
        // Find all users whose first transaction was in this month
        const cohortUsers = Array.from(userFirstMonth.entries())
          .filter(([uid, startMonth]) => startMonth === cohortMonthKey)
          .map(([uid]) => uid);

        const size = cohortUsers.length;
        if (size === 0) return null;

        // Helper to check retention at month offset X
        const getRetention = (offsetMonths) => {
          const [y, m] = cohortMonthKey.split('-').map(Number);
          const targetDate = new Date(y, m - 1 + offsetMonths, 1);
          const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyActiveUsers.has(targetKey)) return 0;

          // Count how many of the original cohort users are present in the target month
          const retained = cohortUsers.filter(u => monthlyActiveUsers.get(targetKey).has(u)).length;
          return Math.round((retained / size) * 100);
        };

        const monthLabel = new Date(`${cohortMonthKey}-01`).toLocaleString('default', { month: 'short' });

        return {
          cohort: monthLabel,
          size, // For debugging/display if needed
          d7: getRetention(0),  // Month 0 (Activation/First Month)
          d30: getRetention(1), // Month 1
          d90: getRetention(3)  // Month 3
        };
      }).filter(Boolean);


      // --- Engagement Metrics (WAU / MAU) ---
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const users7d = new Set();
      const users30d = new Set();

      transactions.forEach(t => {
        const d = new Date(t.createdAt);
        const userId = t.email || t.phone;
        if (!userId) return;

        if (d >= oneWeekAgo) users7d.add(userId);
        if (d >= oneMonthAgo) users30d.add(userId);
      });

      const wau = users7d.size;
      const mau = users30d.size; // Simple MAU (active in last 30d) based on transactions
      const stickiness = mau > 0 ? ((wau / mau) * 100).toFixed(1) : 0;

      // If no data, provide sensible empty/default returns to avoid client crashes
      res.json({
        pickupsAvoided,
        routeMilesReduced,
        fuelSavings,
        uptime,
        monthlyRevenue,
        cohorts: cohorts.length ? cohorts : [],
        engagement: {
          wau,
          mau,
          stickiness: Number(stickiness),
          activeRatio: 94.2 // Placeholder active ratio 
        }
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

app.post('/api/maintenance', authMiddleware, async (req, res) => {
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

app.put('/api/maintenance/:id/complete', authMiddleware, async (req, res) => {
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

app.delete('/api/maintenance/:id', authMiddleware, async (req, res) => {
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
    // Convert 'coordinates' string to array
    // Handle both formats: "-1.2921,36.8219" or "[-1.2921,36.8219]"
    const formatted = units.map(u => {
      let coords = [-1.2921, 36.8219]; // Default Nairobi coordinates

      if (u.coordinates) {
        try {
          // Try parsing as JSON first
          coords = JSON.parse(u.coordinates);
        } catch (e) {
          // If not JSON, try splitting comma-separated string
          const parts = u.coordinates.split(',').map(s => parseFloat(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coords = parts;
          }
        }
      }

      return {
        ...u,
        coordinates: coords
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching units', err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

app.post('/api/units', authMiddleware, async (req, res) => {
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

app.put('/api/units/:id', authMiddleware, async (req, res) => {
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

app.post('/api/routes', authMiddleware, async (req, res) => {
  try {
    const route = await prisma.route.create({ data: req.body });
    res.json(route);
  } catch (err) {
    console.error('Error creating route', err);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.put('/api/routes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const route = await prisma.route.update({ where: { id }, data: req.body });
    res.json(route);
  } catch (err) {
    console.error('Error updating route', err);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

app.delete('/api/routes/:id', authMiddleware, async (req, res) => {
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

app.post('/api/bookings', authMiddleware, async (req, res) => {
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

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

app.patch('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    // remove id if present in body
    delete data.id;
    if (data.date) data.date = new Date(data.date);

    const booking = await prisma.booking.update({
      where: { id },
      data
    });
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
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

app.post('/api/team-members', authMiddleware, async (req, res) => {
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

app.put('/api/team-members/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.teamMember.update({ where: { id }, data: req.body });
    res.json(member);
  } catch (err) {
    console.error('Error updating team member', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

app.delete('/api/team-members/:id', authMiddleware, async (req, res) => {
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

// Duplicate mock admin endpoints removed


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
          sessionTimeout: '30',
          theme: 'light',
          currency: 'KES',
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
      sessionTimeout: '30',
      theme: 'light',
      currency: 'KES',
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
      emailNotifications,
      theme,
      currency,
      sessionTimeout
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
          sessionTimeout: sessionTimeout || settings.sessionTimeout,
          theme: theme || settings.theme,
          currency: currency || settings.currency,
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
          sessionTimeout: sessionTimeout || '30',
          theme: theme || 'light',
          currency: currency || 'KES',
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

// Notifications
// Notifications
app.post('/api/notifications/send', authMiddleware, async (req, res) => {
  try {
    const { channel, recipient, message } = req.body;
    if (!channel || !recipient || !message) return res.status(400).json({ error: 'Missing fields' });

    console.log(`[Notification Mock] Sending ${channel} to ${recipient}: ${message}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Persist log
    const log = await prisma.notificationLog.create({
      data: {
        channel: channel || 'unknown',
        recipient: recipient || 'unknown',
        message: message || '',
        status: 'sent' // Simulating success
      }
    });

    res.json({ success: true, logId: log.id });
  } catch (err) {
    console.error('Error sending notification', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});


// IoT Telemetry Endpoint (Simulated Ingest)
app.post('/api/iot/telemetry', authMiddleware, async (req, res) => {
  try {
    const { serialNo, fillLevel, batteryLevel, lat, lng } = req.body;

    // Find unit
    const unit = await prisma.unit.findUnique({ where: { serialNo } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    // Update unit
    const updated = await prisma.unit.update({
      where: { id: unit.id },
      data: {
        fillLevel: Number(fillLevel),
        batteryLevel: Number(batteryLevel),
        coordinates: (lat && lng) ? JSON.stringify([lat, lng]) : undefined,
        lastSeen: new Date()
      }
    });

    console.log(`[IoT] Telemetry received for ${serialNo}: Fill ${fillLevel}%, Batt ${batteryLevel}%`);
    res.json({ success: true, unit: updated });
  } catch (err) {
    console.error('IoT Ingest Error:', err);
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

// ==================== Plans API ====================
app.get('/api/plans', async (req, res) => {
  try {
    let plans = await prisma.plan.findMany();
    if (plans.length === 0) {
      // Seed default plans
      await prisma.plan.createMany({
        data: [
          { key: 'starter', name: 'Starter', price: '$49', period: '/month', features: JSON.stringify(['Up to 5 vehicles', 'Basic routing', 'Standard support']) },
          { key: 'growth', name: 'Growth', price: '$149', period: '/month', features: JSON.stringify(['Up to 20 vehicles', 'AI Route Optimization', 'Priority Support']) },
          { key: 'enterprise', name: 'Enterprise', price: '$499', period: '/month', features: JSON.stringify(['Unlimited vehicles', 'Custom Integrations', 'Dedicated Manager']) }
        ]
      });
      plans = await prisma.plan.findMany();
    }
    // Parse features
    const formatted = plans.map(p => ({ ...p, features: JSON.parse(p.features) }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching plans', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});


// ==================== Billing API ====================
app.post('/api/billing/create-subscription', async (req, res) => {
  try {
    const { email, planCode, userId } = req.body;
    console.log('Init Subscription:', email, planCode);

    // DYNAMIC PLAN MAPPING
    let newPlan = 'starter';
    if (planCode && planCode.toLowerCase().includes('growth')) newPlan = 'growth';
    if (planCode && planCode.toLowerCase().includes('enterprise')) newPlan = 'enterprise';

    // SIMULATION: Directly update the user for the demo
    if (userId && userId !== 'current-user-id') {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionPlan: newPlan }
        });
      } catch (e) { console.warn('User update failed (likely mock ID):', e.message); }
    }

    // For Docker/Proxy environments, the origin/referer might differ.
    // We want to redirect back to the billing page.
    // If running on localhost:80 via Docker, origin might be correct.
    let baseUrl = 'http://localhost';
    if (req.get('origin')) baseUrl = req.get('origin');
    else if (req.get('referer')) {
      try {
        const refUrl = new URL(req.get('referer'));
        baseUrl = refUrl.origin;
      } catch (e) { }
    }

    res.json({
      status: true,
      message: 'Subscription initialized',
      authorization_url: `${baseUrl}/billing?success=true&plan=${newPlan}&ref=${Date.now()}`
    });

  } catch (err) {
    console.error('Subscription Error', err);
    res.status(500).json({ error: 'Failed to initialize subscription' });
  }
});

// ==================== ERROR HANDLING MIDDLEWARE ====================
// 404 handler - must be after all routes
app.use((req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Global error handler - must be last
app.use(logError);
app.use((err, req, res, next) => {
  // Don't log 404s as errors
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }

  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  // Send error response
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: 'Server Error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

function startServer(port) {

  const server = app.listen(port, () => {
    logger.info(`🚀 Server started successfully`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
    logger.info(`📊 Health check available at: http://localhost:${port}/health`);
    logger.info(`📈 Metrics available at: http://localhost:${port}/health/metrics`);
  });

  // WebSocket Setup
  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    ws.on('message', (msg) => {
      logger.debug('Received WS message:', { message: msg.toString() });
      ws.send(`Echo: ${msg}`);
    });
    ws.on('close', () => logger.info('WebSocket client disconnected'));
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} in use, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      logger.error('Server error:', { error: err.message, stack: err.stack });
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
      prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
      prisma.$disconnect();
      process.exit(0);
    });
  });
}

startServer(PORT);

