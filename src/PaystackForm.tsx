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
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          PS
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Paystack</h3>
          <p className="text-xs text-gray-500">Secure card payment</p>
        </div>
      </div>
      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Email</label>
          <input
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount</label>
          <input
            type="number"
            placeholder="5000"
            value={amount || ''}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
        >
          Pay with Paystack
        </button>
      </form>
      {message && <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{message}</div>}
    </div>
  );
};

export default PaystackForm;
