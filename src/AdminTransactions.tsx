import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';

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
  const [error, setError] = useState<string | null>(null);

  const fetchTx = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch('/api/admin/transactions');
      if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
      const data = await resp.json();
      setTxs(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (e: any) {
      console.error('[AdminTransactions] fetchTx failed', e);
      setError('Failed to load transactions');
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTx(); }, []);

  const handleDelete = async (id: number) => {
    try {
      const resp = await apiFetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
      fetchTx();
    } catch (e) {
      console.error('[AdminTransactions] delete failed', e);
      alert('Failed to delete transaction');
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/api/admin/seed', { method: 'POST' });
      if (!resp.ok) throw new Error(`Seed failed: ${resp.status}`);
      await fetchTx();
    } catch (err) {
      console.error(err);
      setError('Failed to seed demo transactions');
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
      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}
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
