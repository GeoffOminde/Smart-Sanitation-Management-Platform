Payments integration notes

This project contains a simple frontend for accepting payments via Paystack and M-Pesa (STK Push demo).

Paystack (client demo)
- To use Paystack inline demo you can include the Paystack script tag in `index.html`:

  <script src="https://js.paystack.co/v1/inline.js"></script>

- The `PaystackForm` component expects a `publicKey` prop (defaults to a placeholder). For production use, you should:
  1. Create a transaction on your backend using Paystack secret key and order details.
  2. Return the `authorization_url` or the transaction reference to the client.
  3. Verify the payment on the backend using Paystack Webhook / verify endpoint.

M-Pesa (STK Push)
- The `MpesaForm` in this repo is a demo that simulates STK Push flow. To integrate with Safaricom Lipa na M-Pesa (production):
  1. Register your application with Safaricom to obtain Consumer Key/Secret and get access to the API.
  2. Implement a backend endpoint (e.g., POST /api/mpesa/stk) that uses your credentials to call the STK Push API.
  3. Handle the callback/confirmation on your backend and update transaction records.

Sample backend (Node/Express) for STK Push (high-level):

// server.js (illustrative only - do not use as-is)

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount } = req.body;
  // Acquire OAuth token from Safaricom
  // Build STK Push request body with encoded password and timestamp
  // Post to Safaricom STK endpoint and forward response
  res.json({ success: true });
});

app.listen(3000);

Security notes
- Never expose secret keys in client-side code. Always call payment provider APIs from a secure backend.
- Validate and verify payments server-side before fulfilling orders.

If you want, I can:
- Add Playwright tests for the payments page (requires installing Playwright locally).
- Add example backend code for Paystack transaction creation and verification.
- Add a sample Express endpoint for M-Pesa STK Push with a mocked flow.
