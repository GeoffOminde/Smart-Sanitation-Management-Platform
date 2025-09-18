import PaystackForm from './PaystackForm';
import MpesaForm from './MpesaForm';
import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { CreditCard, DollarSign, TrendingUp } from 'lucide-react';

const Payments = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  const checkBackend = async () => {
    try {
      const resp = await apiFetch('/api/admin/transactions');
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

  const totalCount = txs.length;
  const totalAmount = txs.reduce((sum, t: any) => sum + (Number(t.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-2xl font-semibold text-gray-900">Payments</h2>
                <p className="text-sm text-gray-500">Collect payments and monitor recent transactions</p>
              </div>
            </div>
            <div>
              {connected === null && <span className="text-sm text-gray-500">Checking backend...</span>}
              {connected === true && <span className="text-sm text-green-600">Backend connected</span>}
              {connected === false && <span className="text-sm text-red-600">Backend unavailable</span>}
            </div>
          </div>
        </div>

        {/* Stats Cards (match overview style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">KSh {totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Backend Status</p>
                <p className={`text-2xl font-bold ${connected ? 'text-green-700' : 'text-red-700'}`}>{connected ? 'Online' : 'Offline'}</p>
              </div>
              <div className={`p-3 rounded-full ${connected ? 'bg-green-100' : 'bg-red-100'}`}>
                <CreditCard className={`w-6 h-6 ${connected ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <PaystackForm />
          <MpesaForm />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions (demo)</h3>
          </div>
          {txs.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {txs.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <div className="text-sm text-gray-600">{t.provider.toUpperCase()} • {new Date(t.createdAt).toLocaleString()}</div>
                    <div className="font-medium">{t.email || t.phone} — KSh {Number(t.amount || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-500">ID: {t.id}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;
