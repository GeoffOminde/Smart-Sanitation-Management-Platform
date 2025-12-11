import { useState } from 'react';

const PayPalForm = () => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !amount || Number(amount) <= 0) {
      setMessage('Please provide a valid email and amount');
      return;
    }
    setMessage('Redirecting to PayPal (demo)...');
    try {
      await new Promise((res) => setTimeout(res, 800));
      setMessage('PayPal integration is coming soon!');
    } catch (err) {
      setMessage('PayPal checkout failed');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-slate-500/20">
          PP
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">PayPal</h3>
          <p className="text-xs text-gray-500">Global payment solution</p>
        </div>
      </div>
      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">PayPal Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (USD)</label>
          <input
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-500/30 transition-all hover:-translate-y-0.5"
        >
          Pay with PayPal
        </button>
      </form>
      {message && <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{message}</div>}
    </div>
  );
};

export default PayPalForm;
