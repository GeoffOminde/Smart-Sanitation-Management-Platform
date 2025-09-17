import { useEffect, useState } from 'react';

type Transaction = {
  id: number;
  provider: string;
  email?: string;
  phone?: string;
  amount: number;
  createdAt: string;
  raw: any;
};

const AdminTransactions = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTx = async () => {
    setLoading(true);
    const resp = await fetch('/api/admin/transactions');
    const data = await resp.json();
    setTxs(data.transactions || []);
    setLoading(false);
  };

  useEffect(() => { fetchTx(); }, []);

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
    fetchTx();
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/seed', { method: 'POST' });
      await fetchTx();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Admin — Transactions</h2>
        <div>
          <button
            onClick={handleSeed}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Seeding...' : 'Seed demo transactions'}
          </button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="space-y-4">
          {txs.length === 0 && <p>No transactions yet.</p>}
          {txs.map(tx => (
            <div key={tx.id} className="bg-white p-4 rounded shadow flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">{tx.provider.toUpperCase()} • {new Date(tx.createdAt).toLocaleString()}</div>
                <div className="font-medium">{tx.email || tx.phone} — KSh {tx.amount}</div>
                <pre className="text-xs text-gray-600 mt-2 max-h-40 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(tx.raw, null, 2)}</pre>
              </div>
              <div className="ml-4 flex flex-col gap-2">
                <button onClick={() => handleDelete(tx.id)} className="text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
