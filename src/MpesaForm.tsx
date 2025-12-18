import { useState } from 'react';
import { apiFetch } from './lib/api';
import { useLocale } from './contexts/LocaleContext';

const MpesaForm = () => {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || amount <= 0) return setMessage(t('payment.mpesa.error.validation'));

    setMessage(t('payment.mpesa.initiating'));

    try {
      const resp = await apiFetch('/api/mpesa/stk', {
        method: 'POST',
        data: { phone, amount }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || t('payment.mpesa.error.failed'));
      }

      const data = await resp.json();
      setMessage(t('payment.mpesa.success', { id: data.CheckoutRequestID || 'N/A' }));
    } catch (err: any) {
      setMessage(`Error: ${err.message || t('payment.mpesa.error.init')}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20">
          MP
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('payment.mpesa.title')}</h3>
          <p className="text-xs text-gray-500">{t('payment.mpesa.subtitle')}</p>
        </div>
      </div>
      <form onSubmit={handleStkPush} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('payment.mpesa.phoneLabel')}</label>
          <input
            type="tel"
            placeholder={t('payment.mpesa.phonePlaceholder')}
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('payment.mpesa.amountLabel')}</label>
          <input
            type="number"
            placeholder="1000"
            value={amount || ''}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
        >
          {t('payment.mpesa.submit')}
        </button>
      </form>
      {message && <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{message}</div>}
    </div>
  );
};

export default MpesaForm;
