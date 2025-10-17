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
      setMessage('PayPal flow simulated — integrate PayPal SDK/Checkout for production');
    } catch (err) {
      setMessage('PayPal checkout failed');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">PayPal (Demo)</h3>
      <form onSubmit={handlePay} className="space-y-3">
        <input
          type="email"
          placeholder="PayPal account email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Amount (USD)"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border p-2 rounded"
          required
        />
        <button type="submit" className="px-4 py-2 rounded text-white bg-slate-800 hover:bg-slate-900">
          Pay with PayPal
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default PayPalForm;
