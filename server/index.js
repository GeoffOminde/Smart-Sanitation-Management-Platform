require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = parseInt(process.env.PORT, 10) || 3001;

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
// OpenWeather & Hugging Face APIs
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

/**
 * POST /api/hf/inference
 * Body: { model: string, inputs: any, options?: object }
 * Proxies to Hugging Face Inference API.
 */
app.post('/api/hf/inference', async (req, res) => {
  try {
    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) return res.status(500).json({ error: 'Missing HUGGING_FACE_TOKEN' });

    let { model, inputs, parameters, options } = req.body || {};
    // Default to a reliable sentiment model if none provided
    if (!model) {
      model = 'cardiffnlp/twitter-roberta-base-sentiment-latest';
    }
    if (!inputs && typeof inputs !== 'string') {
      return res.status(400).json({ error: 'inputs are required' });
    }

    const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
    // Build body: prefer parameters (zero-shot, etc.), else allow options for backward compat
    const body = parameters ? { inputs, parameters } : (options ? { inputs, options } : { inputs });

    const resp = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 60000,
    });

    // HF often returns 200 with {error: ...} JSON when the model is loading or not accessible
    if (resp.data && resp.data.error) {
      console.error('[hf/inference] provider error', resp.data);
      return res.status(400).json({ error: 'HF inference failed', details: resp.data });
    }

    // Optional normalization for roberta sentiment (cardiffnlp) results
    try {
      const raw = resp.data;
      const maybeArr = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw;
      if (typeof model === 'string' && model.includes('roberta') && Array.isArray(maybeArr) && maybeArr[0]?.label) {
        const labels = maybeArr.map((d) => String(d.label).toLowerCase());
        const scores = maybeArr.map((d) => Number(d.score));
        return res.json({ sequence: inputs, labels, scores });
      }
    } catch (e) {
      // Fallback to raw response if normalization fails
      console.warn('[hf/inference] normalization skipped', e?.message);
    }

    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    console.error('[hf/inference] error', data);
    res.status(status).json({ error: 'HF inference failed', details: data });
  }
});
