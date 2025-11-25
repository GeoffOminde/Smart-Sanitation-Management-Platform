import { useState } from 'react';
import { apiFetch } from './lib/api';

const MpesaForm = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || amount <= 0) return setMessage('Please provide valid phone number and amount');

    setMessage('Initiating STK Push...');

    try {
      const resp = await apiFetch('/api/mpesa/stk', {
        method: 'POST',
        data: { phone, amount }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'STK Push failed');
      }

      const data = await resp.json();
      setMessage(`STK Push initiated! Check your phone. CheckoutRequestID: ${data.CheckoutRequestID || 'N/A'}`);
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Failed to initiate STK Push'}`);
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
