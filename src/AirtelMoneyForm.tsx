import { useState } from 'react';

const AirtelMoneyForm = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !amount || Number(amount) <= 0) {
      setMessage('Please provide a valid Airtel number and amount');
      return;
    }
    setMessage('Submitting Airtel Money payment (demo)...');
    try {
      await new Promise((res) => setTimeout(res, 1000));
      setMessage('Airtel Money integration is coming soon!');
    } catch (err) {
      setMessage('Airtel Money payment failed');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
          AM
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Airtel Money</h3>
          <p className="text-xs text-gray-500">Fast mobile money</p>
        </div>
      </div>
      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
          <input
            type="tel"
            placeholder="2547XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (KES)</label>
          <input
            type="number"
            placeholder="1000"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5"
        >
          Pay with Airtel Money
        </button>
      </form>
      {message && <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{message}</div>}
    </div>
  );
};

export default AirtelMoneyForm;
