import { useState } from 'react';

type PaystackFormProps = {
  publicKey?: string; // provide your Paystack public key (demo/test by default)
};

const PaystackForm = ({ publicKey = 'pk_test_xxxxxxxxxxxxxxxxxxxxx' }: PaystackFormProps) => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    // For production, you should generate a transaction on the server and return an authorization_url
    // Here we simulate client-side integration using Paystack inline (demo)
    if (!email || amount <= 0) return setMessage('Please provide valid email and amount');

    // Create a new Paystack inline transaction
    const handler = (window as any).PaystackPop && (window as any).PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100),
      onClose: () => setMessage('Payment cancelled'),
      callback: (response: any) => {
        setMessage('Payment successful. Reference: ' + response.reference);
      }
    });

    if (handler && typeof handler.openIframe === 'function') {
      handler.openIframe();
    } else {
      setMessage('Paystack inline not available. Make sure you include Paystack script in index.html for demo.');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">Paystack (Demo)</h3>
      <form onSubmit={handlePay} className="space-y-3">
        <input type="email" placeholder="Customer email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
        <input type="number" placeholder="Amount (KES)" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full border p-2 rounded" required />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Pay with Paystack</button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default PaystackForm;
