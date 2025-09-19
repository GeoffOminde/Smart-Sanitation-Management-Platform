import { useState } from 'react';

type PaystackFormProps = {
  publicKey?: string; // optional override; otherwise falls back to VITE_PAYSTACK_PUBLIC
};

const PaystackForm = ({ publicKey }: PaystackFormProps) => {
  const ENV_KEY = (import.meta as any)?.env?.VITE_PAYSTACK_PUBLIC as string | undefined;
  const effectiveKey = publicKey || ENV_KEY || '';
  const isKeyValid = typeof effectiveKey === 'string' && /^pk_(test|live)_/i.test(effectiveKey);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    // For production, you should generate a transaction on the server and return an authorization_url
    // Here we simulate client-side integration using Paystack inline (demo)
    if (!effectiveKey || !isKeyValid) {
      // Silently no-op when key is absent
      return;
    }
    if (!email || amount <= 0) return setMessage('Please provide valid email and amount');

    // Create a new Paystack inline transaction
    const handler = (window as any).PaystackPop && (window as any).PaystackPop.setup({
      key: effectiveKey,
      email,
      // Paystack expects amount in kobo (minor units). Ensure you convert appropriately.
      amount: Math.round(amount * 100),
      onClose: () => setMessage('Payment cancelled'),
      callback: (response: any) => {
        setMessage('Payment successful. Reference: ' + response.reference);
      }
    });

    if (handler && typeof handler.openIframe === 'function') {
      handler.openIframe();
    } else {
      // Silently no-op if inline handler is unavailable
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">Paystack (Demo)</h3>
      {/* Intentionally no visible warning when key is missing */}
      <form onSubmit={handlePay} className="space-y-3">
        <input type="email" placeholder="Customer email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
        <input type="number" placeholder="Amount" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full border p-2 rounded" required />
        <button
          type="submit"
          className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
        >
          Pay with Paystack
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default PaystackForm;
