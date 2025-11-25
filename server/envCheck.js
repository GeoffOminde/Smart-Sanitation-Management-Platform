const REQUIRED_ENV = [
  {
    key: 'OPENWEATHER_API_KEY',
    description: 'Needed by /api/weather/current and the Insights weather panel',
  },
  {
    key: 'PAYSTACK_SECRET',
    description: 'Used for initializing Paystack transactions via /api/paystack/init',
  },
  {
    key: 'MPESA_CONSUMER_KEY',
    description: 'Required for Safaricom OAuth token requests',
  },
  {
    key: 'MPESA_CONSUMER_SECRET',
    description: 'Required for Safaricom OAuth token requests',
  },
  {
    key: 'MPESA_SHORTCODE',
    description: 'Shortcode used during STK push requests',
  },
  {
    key: 'MPESA_PASSKEY',
    description: 'Passkey used during STK push requests',
  },
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((item) => !process.env[item.key]);
  if (missing.length === 0) {
    console.log('[env] all required secrets are defined');
    return true;
  }

  console.warn('[env] missing required environment variables:');
  missing.forEach((item) => {
    console.warn(`  • ${item.key} – ${item.description}`);
  });
  console.warn('The server will still run, but the related features may fail until the keys are supplied.');
  return false;
}

module.exports = {
  REQUIRED_ENV,
  validateEnv,
};
