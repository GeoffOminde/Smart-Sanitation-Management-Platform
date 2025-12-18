import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { useLocale } from './contexts/LocaleContext';

type Transaction = {
  id: string;
  provider: string;
  email?: string;
  phone?: string;
  amount: number;
  createdAt: string;
  raw: any;
};

const AdminTransactions = () => {
  const { t } = useLocale();
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

  const handleDelete = async (id: string) => {
    try {
      const resp = await apiFetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
      fetchTx();
    } catch (e) {
      console.error('[AdminTransactions] delete failed', e);
      alert('Failed to delete transaction');
    }
  };



  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20">
              <div className="text-white font-bold text-xl">Tb</div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{t('admin.transactions.title')}</h2>
              <p className="text-base text-gray-500 font-medium mt-1">{t('admin.transactions.subtitle')}</p>
            </div>
          </div>

          {/* Seed button removed for production - no fake data in production DB */}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">{t('admin.transactions.registry')}</h3>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider">
              {txs.length} {t('admin.transactions.records')}
            </span>
          </div>

          {loading && txs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">{t('admin.transactions.loading')}</div>
          ) : txs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">{t('admin.transactions.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.table.provider')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.table.user')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('admin.table.amount')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.table.status')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.table.date')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('admin.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txs.map(tx => {
                    // Determine status color based on raw data or fallback
                    const status = tx.raw?.data?.status || tx.raw?.status || 'completed';
                    const statusColor =
                      status === 'success' || status === 'completed' ? 'bg-green-100 text-green-700' :
                        status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700';

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${tx.provider === 'mpesa' ? 'bg-green-500' :
                              tx.provider === 'paystack' ? 'bg-blue-500' : 'bg-gray-400'
                              }`}></div>
                            <span className="text-sm font-semibold capitalize text-gray-700">{tx.provider}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{tx.email || tx.phone || 'Unknown'}</div>
                          <div className="text-xs text-gray-400">{tx.provider === 'mpesa' ? 'Mobile Money' : 'Card Payment'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-gray-900">KSh {tx.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{new Date(tx.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-3">
                            <details className="relative group/menu">
                              <summary className="list-none cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                                <span className="sr-only">View Details</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </summary>
                              <div className="absolute right-0 bottom-full mb-2 w-80 max-h-96 overflow-y-auto bg-gray-900 text-gray-100 rounded-xl shadow-xl p-4 text-xs font-mono z-50 hidden group-open/menu:block">
                                <div className="font-bold text-gray-400 mb-2 border-b border-gray-700 pb-1">Raw Payload</div>
                                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(tx.raw, null, 2)}</pre>
                              </div>
                            </details>

                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              title="Delete Transaction"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default AdminTransactions;
