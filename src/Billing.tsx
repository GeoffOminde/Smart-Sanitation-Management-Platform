import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    CheckCircle,
    Zap,
    Map as MapIcon,
    MessageSquare,
    TrendingUp,
    Shield,
    Server,
    DollarSign,
    Smartphone,
    Globe,
    ExternalLink
} from 'lucide-react';
import { apiFetch } from './lib/api';
import { useAppNotifications } from './hooks/useAppNotifications';

// Payment Forms
import PaystackForm from './PaystackForm';
import MpesaForm from './MpesaForm';
import AirtelMoneyForm from './AirtelMoneyForm';
import MtnMoneyForm from './MtnMoneyForm';

const Billing: React.FC = () => {
    const { addNotification } = useAppNotifications();
    const [currentPlan, setCurrentPlan] = useState('growth');
    const [showUpgrade, setShowUpgrade] = useState(false);

    // Payment State
    const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'mtn' | 'airtel' | 'card'>('mpesa');
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
    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: '$49',
            period: '/mo',
            features: ['Up to 5 Vehicles', 'Basic Route Planning', 'Standard Support'],
            limit: 'Ideal for small fleets'
        },
        {
            id: 'growth',
            name: 'Growth',
            price: '$149',
            period: '/mo',
            features: ['Up to 20 Vehicles', 'Advanced AI Routes', 'Priority Support', 'API Access'],
            popular: true,
            limit: 'Best for growing companies'
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            features: ['Unlimited Vehicles', 'White-labeling', 'Dedicated Account Manager', 'On-premise Deployment'],
            limit: 'For large organizations'
        }
    ];

    // Usage Data
    const usageStats = [
        { name: 'Map Loads', used: 14500, limit: 25000, cost: '$0.005/load', icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: 'Payment Processing', used: 45000, limit: 'Unlimited', cost: '1.5% fee', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
        { name: 'SMS Notifications', used: 850, limit: 1000, cost: '$0.02/msg', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' },
        { name: 'AI Forecasts', used: 120, limit: 500, cost: '$0.10/run', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Billing & Payments</h2>
                    <p className="text-gray-500">Manage subscriptions, make payments, and view history</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchTransactions}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Refresh History
                    </button>
                    <button
                        onClick={() => setShowUpgrade(true)}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <Zap className="w-4 h-4 text-yellow-300" />
                        Upgrade Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* LEFT COL: Current Plan & Payment Methods */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Active Plan Card */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CreditCard className="w-48 h-48" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full">Active Subscription</span>
                                    </div>
                                    <h3 className="text-4xl font-bold text-gray-900 mb-2">Growth Plan</h3>
                                    <p className="text-gray-600 max-w-md">
                                        Includes advanced AI routing and API access for up to 20 vehicles.
                                    </p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <div className="text-3xl font-bold text-gray-900">$149<span className="text-lg text-gray-500 font-normal">/mo</span></div>
                                    <div className="text-sm text-gray-400 mt-1">Next bill: Jan 01, 2026</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Make a Payment</h3>
                            <p className="text-sm text-gray-500">Select your preferred payment method</p>
                        </div>

                        <div className="p-6">
                            {/* Method Selection Tabs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <button
                                    onClick={() => setSelectedMethod('mpesa')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedMethod === 'mpesa' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                >
                                    <Smartphone className="w-6 h-6" />
                                    <span className="font-bold text-sm">M-Pesa</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('mtn')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedMethod === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                >
                                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-[10px] text-black">M</div>
                                    <span className="font-bold text-sm">MTN MoMo</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('airtel')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedMethod === 'airtel' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                >
                                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center font-bold text-[10px] text-white">A</div>
                                    <span className="font-bold text-sm">Airtel</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod('card')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="font-bold text-sm">Card</span>
                                </button>
                            </div>

                            {/* Selected Form Render */}
                            <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {selectedMethod === 'mpesa' && (
                                    <div className="border border-green-100 rounded-2xl p-1 bg-green-50/50">
                                        <MpesaForm />
                                    </div>
                                )}
                                {selectedMethod === 'mtn' && (
                                    <div className="border border-yellow-100 rounded-2xl p-1 bg-yellow-50/50">
                                        <MtnMoneyForm />
                                    </div>
                                )}
                                {selectedMethod === 'airtel' && (
                                    <div className="border border-red-100 rounded-2xl p-1 bg-red-50/50">
                                        <AirtelMoneyForm />
                                    </div>
                                )}
                                {selectedMethod === 'card' && (
                                    <div className="border border-blue-100 rounded-2xl p-1 bg-blue-50/50">
                                        <PaystackForm />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Stats & History */}
                <div className="space-y-8">
                    {/* Metered Usage */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Usage Costs</h3>
                                <p className="text-xs text-gray-500">Metered API fees</p>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {usageStats.map((stat, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                            <stat.icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-gray-700 text-sm">{stat.name}</span>
                                    </div>

                                    <div className="mb-1">
                                        <div className="flex items-end gap-1 mb-1 justify-between">
                                            <div className="text-xs font-bold text-gray-900">{stat.used.toLocaleString()} <span className="text-gray-400 font-normal">used</span></div>
                                            <div className="text-xs text-gray-400">{stat.cost}</div>
                                        </div>
                                        {typeof stat.limit === 'number' && (
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${stat.used > stat.limit * 0.9 ? 'bg-red-500' : 'bg-blue-500'}`}
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
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
                            <p className="text-xs text-gray-500">Recent payments & invoices</p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {txs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <Server className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">No transactions found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {txs.map(t => (
                                        <div key={t.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group hover:bg-blue-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${t.provider === 'mpesa' ? 'bg-green-600' :
                                                    t.provider === 'mtn' ? 'bg-yellow-500 text-black' :
                                                        t.provider === 'airtel' ? 'bg-red-600' : 'bg-blue-600'
                                                    }`}>
                                                    {t.provider?.slice(0, 2).toUpperCase() || 'TX'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">KSh {Number(t.amount).toLocaleString()}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteTx(t.id, e)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
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
            {showUpgrade && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-gray-900">Upgrade Your Plan</h3>
                            <button
                                onClick={() => setShowUpgrade(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`rounded-2xl p-6 border-2 flex flex-col relative transition-all duration-300 ${currentPlan === plan.id
                                        ? 'border-blue-600 bg-blue-50/10'
                                        : plan.popular
                                            ? 'border-blue-200 shadow-xl md:scale-105 z-10 bg-white'
                                            : 'border-gray-100 hover:border-blue-100 bg-white'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg tracking-wide uppercase">
                                                Most Popular
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
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${currentPlan === plan.id
                                            ? 'bg-gray-100 text-gray-500 cursor-default'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                                            }`}
                                        onClick={async () => {
                                            if (currentPlan !== plan.id && plan.id !== 'enterprise') {
                                                try {
                                                    // Map plan IDs to Paystack plan codes
                                                    const planCodes = {
                                                        starter: 'PLN_zyw0cp8ccd5xpcy',  // KES 6,400/month
                                                        growth: 'PLN_exoh57kbtfo8hwi'    // KES 20,000/month
                                                    };

                                                    const response = await fetch('http://localhost:3001/api/billing/create-subscription', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            email: 'user@example.com', // TODO: Get from auth context
                                                            planCode: planCodes[plan.id as 'starter' | 'growth'],
                                                            userId: 'current-user-id' // TODO: Get from auth context
                                                        })
                                                    });

                                                    const data = await response.json();

                                                    if (data.authorization_url) {
                                                        // Redirect to Paystack payment page
                                                        window.location.href = data.authorization_url;
                                                    } else {
                                                        addNotification('Error', 'Failed to initiate subscription', 'error');
                                                    }
                                                } catch (err) {
                                                    console.error('Subscription error:', err);
                                                    addNotification('Error', 'Failed to start subscription. Please try again.', 'error');
                                                }
                                            } else if (plan.id === 'enterprise') {
                                                addNotification('Info', 'Please contact sales@smartsanitation.co.ke for Enterprise pricing', 'info');
                                                setShowUpgrade(false);
                                            }
                                        }}
                                    >
                                        {currentPlan === plan.id ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : 'Choose ' + plan.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Billing;
