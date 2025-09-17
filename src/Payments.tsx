import PaystackForm from './PaystackForm';
import MpesaForm from './MpesaForm';
import { useEffect, useState } from 'react';

const Payments = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  const checkBackend = async () => {
    try {
      const resp = await fetch('/api/admin/transactions');
      if (!resp.ok) throw new Error('bad');
      const data = await resp.json();
      setTxs(data.transactions || []);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setTxs([]);
    }
  };

  useEffect(() => { checkBackend(); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Payments</h2>
        <div>
          {connected === null && <span className="text-sm text-gray-500">Checking backend...</span>}
          {connected === true && <span className="text-sm text-green-600">Backend connected</span>}
          {connected === false && <span className="text-sm text-red-600">Backend unavailable</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaystackForm />
        <MpesaForm />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Recent Transactions (demo)</h3>
        {txs.length === 0 ? <p className="text-sm text-gray-500">No transactions yet.</p> : (
          <ul className="space-y-2">
            {txs.slice(0,6).map(t => (
              <li key={t.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="text-sm text-gray-600">{t.provider.toUpperCase()} • {new Date(t.createdAt).toLocaleString()}</div>
                  <div className="font-medium">{t.email || t.phone} — KSh {t.amount}</div>
                </div>
                <div className="text-xs text-gray-500">ID: {t.id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Payments;
