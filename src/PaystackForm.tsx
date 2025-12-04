import { useState } from 'react';
import { apiFetch } from './lib/api';

const PaystackForm = () => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || amount <= 0) return setMessage('Please provide valid email and amount');

    setMessage('Initializing Paystack transaction...');

    try {
      const resp = await apiFetch('/api/paystack/init', {
        method: 'POST',
        data: { email, amount }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Paystack init failed');
      }

      const data = await resp.json();
      if (data.authorization_url) {
        setMessage('Redirecting to Paystack...');
        window.location.href = data.authorization_url;
      } else {
        setMessage('Error: No authorization URL returned');
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Failed to initialize Paystack'}`);
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
