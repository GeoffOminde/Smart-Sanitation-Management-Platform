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
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">Airtel Money (Demo)</h3>
      <form onSubmit={handlePay} className="space-y-3">
        <input
          type="tel"
          placeholder="Phone (2547XXXXXXXX)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Amount (KES)"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border p-2 rounded"
          required
        />
        <button type="submit" className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700">
          Pay with Airtel Money
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default AirtelMoneyForm;
