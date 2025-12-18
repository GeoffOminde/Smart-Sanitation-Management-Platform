import React, { useState, useEffect } from 'react';
import { useLocale } from './contexts/LocaleContext';
import { useAuth } from './AuthContext';
import {
    CreditCard,
    CheckCircle,
    Zap,
    Map as MapIcon,
    MessageSquare,
    TrendingUp,
    Server,
    Smartphone,
} from 'lucide-react';
import { apiFetch } from './lib/api';
import { useAppNotifications } from './hooks/useAppNotifications';

// Payment Forms
import PaystackForm from './PaystackForm';
import MpesaForm from './MpesaForm';
import AirtelMoneyForm from './AirtelMoneyForm';
import MtnMoneyForm from './MtnMoneyForm';
import PayPalForm from './PayPalForm';

const Billing: React.FC = () => {
    const { t } = useLocale();
    const { addNotification } = useAppNotifications();
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState('starter');
    const [showUpgrade, setShowUpgrade] = useState(false);

    useEffect(() => {
        if (user?.subscriptionPlan) {
            setCurrentPlan(user.subscriptionPlan.toLowerCase());
        }

        // Check for Success Params
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            const newPlan = params.get('plan');
            if (newPlan) {
                setCurrentPlan(newPlan);
                addNotification('Success', `Plan upgraded to ${newPlan.toUpperCase()}`, 'success');
                // Clean URL
                window.history.replaceState({}, '', '/billing');
            }
        }
    }, [user]);

    // Payment State
    const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'mtn' | 'airtel' | 'card' | 'paypal'>('mpesa');
    const [txs, setTxs] = useState<any[]>([]);
    const [loadingTxs, setLoadingTxs] = useState(false);

    // Fetch Transactions
    const fetchTransactions = async () => {
        setLoadingTxs(true);
        try {
            const resp = await apiFetch('/api/admin/transactions');
            if (resp.ok) {
                const data = await resp.json();
                setTxs(data.transactions || []);
            }
        } catch (err) {
            console.error('Failed to load transactions', err);
        } finally {
            setLoadingTxs(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleDeleteTx = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const resp = await apiFetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                setTxs(prev => prev.filter(x => x.id !== id));
                addNotification('Success', 'Transaction record deleted', 'success');
            }
        } catch {
            addNotification('Error', 'Failed to delete transaction', 'error');
        }
    };

    // Plans Data
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/plans')
            .then(res => res.json())
            .then(data => setPlans(data))
            .catch(console.error);
    }, []);

    // Usage Data
    const usageStats = [
        { name: t('billing.usage.mapLoads'), used: 14500, limit: 25000, cost: '$0.005/load', icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: t('billing.usage.payment'), used: 45000, limit: 'Unlimited', cost: '1.5% fee', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
        { name: t('billing.usage.sms'), used: 850, limit: 1000, cost: '$0.02/msg', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' },
        { name: t('billing.usage.ai'), used: 120, limit: 500, cost: '$0.10/run', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    const activePlan = plans.find(p => p.key === currentPlan) || plans[0] || {};

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('billing.title')}</h2>
                    <p className="text-sm text-gray-500">{t('billing.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            await fetchTransactions();
                            addNotification('Success', 'Transactions updated', 'success');
                        }}
                        disabled={loadingTxs}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loadingTxs ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Server className={`w-4 h-4 mr-2 ${loadingTxs ? 'animate-spin' : ''}`} />
                        {loadingTxs ? 'Refreshing...' : t('billing.refresh')}
                    </button>
                    <button
                        onClick={() => setShowUpgrade(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Zap className="w-4 h-4 mr-2 text-yellow-300" />
                        {t('billing.upgrade')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* LEFT COL: Current Plan & Payment Methods */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Active Plan Card */}
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('billing.activeSub')}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                            </span>
                        </div>
                        <div className="p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <CreditCard className="w-48 h-48" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-3xl font-bold text-gray-900 mb-2">{activePlan.name} {t('billing.plan')}</h3>
                                        <p className="text-gray-500 max-w-md text-sm">
                                            {activePlan.description}
                                        </p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-3xl font-bold text-gray-900">{activePlan.price}<span className="text-lg text-gray-500 font-normal">{activePlan.period}</span></div>
                                        <div className="text-sm text-gray-400 mt-1">{t('billing.nextBill')} Jan 01, 2026</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('billing.makePayment')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('billing.paymentMethodDesc')}</p>
                        </div>

                        <div className="p-6">
                            {/* Method Selection Tabs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <button
                                    onClick={() => setSelectedMethod('mpesa')}
                                    className={`p-3 rounded-md border flex flex-col items-center gap-2 transition-all ${selectedMethod === 'mpesa' ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' : 'border-gray-300 hover:border-gray-400 text-gray-700'}`}
                                >
                                    <Smartphone className="w-5 h-5" />
                                    <span className="font-medium text-sm">M-Pesa</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('mtn')}
                                    className={`p-3 rounded-md border flex flex-col items-center gap-2 transition-all ${selectedMethod === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-400' : 'border-gray-300 hover:border-gray-400 text-gray-700'}`}
                                >
                                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-[10px] text-black">M</div>
                                    <span className="font-medium text-sm">MTN MoMo</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('airtel')}
                                    className={`p-3 rounded-md border flex flex-col items-center gap-2 transition-all ${selectedMethod === 'airtel' ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500' : 'border-gray-300 hover:border-gray-400 text-gray-700'}`}
                                >
                                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center font-bold text-[10px] text-white">A</div>
                                    <span className="font-medium text-sm">Airtel</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('card')}
                                    className={`p-3 rounded-md border flex flex-col items-center gap-2 transition-all ${selectedMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400 text-gray-700'}`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    <span className="font-medium text-sm">{t('billing.card')}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('paypal')}
                                    className={`p-3 rounded-md border flex flex-col items-center gap-2 transition-all ${selectedMethod === 'paypal' ? 'border-blue-800 bg-blue-50 text-blue-900 ring-1 ring-blue-800' : 'border-gray-300 hover:border-gray-400 text-gray-700'}`}
                                >
                                    <div className="w-5 h-5 bg-blue-800 rounded-full flex items-center justify-center font-bold text-[10px] text-white">P</div>
                                    <span className="font-medium text-sm">PayPal</span>
                                </button>
                            </div>

                            {/* Selected Form Render */}
                            <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {selectedMethod === 'mpesa' && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <MpesaForm />
                                    </div>
                                )}
                                {selectedMethod === 'mtn' && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <MtnMoneyForm />
                                    </div>
                                )}
                                {selectedMethod === 'airtel' && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <AirtelMoneyForm />
                                    </div>
                                )}
                                {selectedMethod === 'card' && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <PaystackForm />
                                    </div>
                                )}
                                {selectedMethod === 'paypal' && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <PayPalForm />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Stats & History */}
                <div className="space-y-6">
                    {/* Metered Usage */}
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('billing.usage.title')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('billing.usage.subtitle')}</p>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {usageStats.map((stat, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-1.5 rounded-md ${stat.bg} ${stat.color}`}>
                                            <stat.icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-gray-900 text-sm">{stat.name}</span>
                                    </div>

                                    <div className="mb-1">
                                        <div className="flex items-end gap-1 mb-1 justify-between">
                                            <div className="text-xs font-bold text-gray-900">{stat.used.toLocaleString()} <span className="text-gray-500 font-normal">{t('billing.usage.used')}</span></div>
                                            <div className="text-xs text-gray-500">{stat.cost}</div>
                                        </div>
                                        {typeof stat.limit === 'number' && (
                                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${stat.used > stat.limit * 0.9 ? 'bg-red-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${(stat.used / stat.limit) * 100}%` }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('billing.tx.title')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('billing.tx.subtitle')}</p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {txs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <Server className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">{t('billing.tx.empty')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {txs.map(t => (
                                        <div key={t.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between group hover:border-blue-400 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${t.provider === 'mpesa' ? 'bg-green-600' :
                                                    t.provider === 'mtn' ? 'bg-yellow-500 text-black' :
                                                        t.provider === 'airtel' ? 'bg-red-600' : 'bg-blue-600'
                                                    }`}>
                                                    {t.provider?.slice(0, 2).toUpperCase() || 'TX'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">KSh {Number(t.amount).toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteTx(t.id, e)}
                                                className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal (Same as before) */}
            {
                showUpgrade && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h3 className="text-xl font-bold text-gray-900">{t('billing.upgradeModal.title')}</h3>
                                <button
                                    onClick={() => setShowUpgrade(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`rounded-xl p-6 border-2 flex flex-col relative transition-all duration-300
                                        ${plan.popular ? 'md:scale-105 z-10 shadow-lg' : ''}
                                        ${currentPlan === plan.key
                                                ? 'border-blue-600 bg-blue-50/20'
                                                : plan.popular
                                                    ? 'border-blue-200 bg-white'
                                                    : 'border-gray-200 hover:border-blue-300 bg-white'
                                            }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
                                                    {t('billing.upgradeModal.popular')}
                                                </span>
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{plan.limit}</p>
                                        </div>

                                        <div className="mb-6">
                                            <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                                            <span className="text-gray-500">{plan.period}</span>
                                        </div>

                                        <ul className="space-y-3 mb-8 flex-1">
                                            {plan.features.map((feat: string, i: number) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${currentPlan === plan.key
                                                ? 'bg-gray-100 text-gray-500 cursor-default'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                }`}
                                            onClick={async () => {
                                                if (currentPlan !== plan.key && plan.key !== 'enterprise') {
                                                    try {
                                                        // Map plan IDs to Paystack plan codes from env
                                                        const planCodes = {
                                                            starter: import.meta.env.VITE_PAYSTACK_PLAN_STARTER || 'PLN_starter_default',
                                                            growth: import.meta.env.VITE_PAYSTACK_PLAN_GROWTH || 'PLN_growth_default'
                                                        };

                                                        const response = await apiFetch('/api/billing/create-subscription', {
                                                            method: 'POST',
                                                            data: {
                                                                email: user?.email || 'user@example.com',
                                                                planCode: planCodes[plan.key as 'starter' | 'growth'],
                                                                userId: user?.id || 'current-user-id'
                                                            }
                                                        });

                                                        const data = await response.json();

                                                        if (data.authorization_url) {
                                                            // Redirect to Paystack payment page
                                                            window.location.href = data.authorization_url;
                                                        } else {
                                                            addNotification(t('billing.notes.errorTitle'), t('billing.notes.subInitFail'), 'error');
                                                        }
                                                    } catch (err: any) {
                                                        console.error('Subscription error:', err);
                                                        addNotification('Error', `Req Failed: ${err.message || String(err)}`, 'error');
                                                    }
                                                } else if (plan.key === 'enterprise') {
                                                    addNotification(t('billing.notes.infoTitle'), t('billing.notes.enterpriseInfo'), 'info');
                                                    setShowUpgrade(false);
                                                }
                                            }}
                                        >
                                            {currentPlan === plan.key ? t('billing.btn.current') : plan.key === 'enterprise' ? t('billing.btn.contact') : t('billing.btn.choose') + ' ' + plan.name}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Billing;
