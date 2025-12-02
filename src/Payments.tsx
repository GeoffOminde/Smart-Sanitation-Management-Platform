import PaystackForm from './PaystackForm';
import MpesaForm from './MpesaForm';
import AirtelMoneyForm from './AirtelMoneyForm';
import PayPalForm from './PayPalForm';
import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { useAppNotifications } from './hooks/useAppNotifications';

const Payments = () => {
  const { notifyPaymentReceived, addNotification } = useAppNotifications();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  const checkBackend = async () => {
    try {
      const resp = await apiFetch('/api/admin/transactions');
      if (!resp.ok) throw new Error('bad');
      const data = await resp.json();
      const newTxs = data.transactions || [];

      // Notify if new transactions detected
      if (txs.length > 0 && newTxs.length > txs.length) {
        const newCount = newTxs.length - txs.length;
        addNotification(
          'New Transactions',
          `${newCount} new transaction${newCount > 1 ? 's' : ''} received.`,
          'success'
        );
      }

      setTxs(newTxs);
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
            {/* Removed backend status text per request */}
          </div>
        </div>

        {/* Stats Cards (match overview style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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


        </div>

        {/* Methods Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-6">
            <PaystackForm />
            <AirtelMoneyForm />
          </div>
          <div className="space-y-6">
            <MpesaForm />
            <PayPalForm />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions (demo)</h3>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 text-sm border rounded"
                onClick={checkBackend}
              >
                Refresh
              </button>
              <button
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const resp = await apiFetch('/api/admin/seed', { method: 'POST' });
                    if (resp.ok) {
                      await checkBackend();
                    }
                  } catch { }
                }}
                disabled={!connected}
                title={!connected ? 'Backend offline' : ''}
              >
                Seed Demo
              </button>
            </div>
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
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">ID: {t.id}</div>
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={async () => {
                        try {
                          const resp = await apiFetch(`/api/admin/transactions/${t.id}`, { method: 'DELETE' });
                          if (resp.ok) {
                            setTxs(prev => prev.filter(x => x.id !== t.id));
                          }
                        } catch { }
                      }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
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
