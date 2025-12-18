import { useState } from 'react';
import { apiFetch } from './lib/api';
import { useLocale } from './contexts/LocaleContext';

const PaystackForm = () => {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || amount <= 0) return setMessage(t('payment.paystack.error.validation'));

    setMessage(t('payment.paystack.initializing'));

    try {
      const resp = await apiFetch('/api/paystack/init', {
        method: 'POST',
        data: { email, amount }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || t('payment.paystack.error.failed'));
      }

      const data = await resp.json();
      if (data.authorization_url) {
        setMessage(t('payment.paystack.redirecting'));
        window.location.href = data.authorization_url;
      } else {
        setMessage(t('payment.paystack.error.noUrl'));
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || t('payment.paystack.error.init')}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          PS
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('payment.paystack.title')}</h3>
          <p className="text-xs text-gray-500">{t('payment.paystack.subtitle')}</p>
        </div>
      </div>
      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('payment.paystack.emailLabel')}</label>
          <input
            type="email"
            placeholder={t('payment.paystack.emailPlaceholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('payment.paystack.amountLabel')}</label>
          <input
            type="number"
            placeholder="5000"
            value={amount || ''}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
        >
          {t('payment.paystack.submit')}
        </button>
      </form>
      {message && <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">{message}</div>}
    </div>
  );
};

export default PaystackForm;
