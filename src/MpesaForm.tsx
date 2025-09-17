import { useState } from 'react';

const MpesaForm = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || amount <= 0) return setMessage('Please provide valid phone number and amount');

    setMessage('Initiating STK Push (demo)...');

    // In production: call your backend endpoint which performs the Lipa na M-Pesa STK Push using Safaricom APIs
    // Example (client -> backend): POST /api/mpesa/stk with { phone, amount }
    // Backend responds with success/failure.

    try {
      // Demo: simulate delay
      await new Promise(res => setTimeout(res, 1200));
      setMessage('STK Push simulated — in production your backend would initiate the request');
    } catch (err) {
      setMessage('Failed to initiate STK Push');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">M-Pesa (STK Push Demo)</h3>
      <form onSubmit={handleStkPush} className="space-y-3">
        <input type="tel" placeholder="Phone (2547XXXXXXXX)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-2 rounded" required />
        <input type="number" placeholder="Amount (KES)" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full border p-2 rounded" required />
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Initiate STK Push</button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default MpesaForm;
