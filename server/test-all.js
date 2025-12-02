const axios = require('axios');
const base = 'http://localhost:3001';
let authToken = '';

async function login() {
    console.log('Logging in to obtain JWT...');
    try {
        const resp = await axios.post(`${base}/api/auth/login`, {
            email: 'admin@example.com',
            password: 'admin123'
        });
        authToken = resp.data.token;
        console.log('Obtained token');
    } catch (err) {
        console.error('Login error:', err.response?.data || err.message);
    }
}

async function testPaystack() {
    console.log('Testing Paystack init...');
    try {
        const resp = await axios.post(`${base}/api/paystack/init`, {
            email: 'test@example.com',
            amount: 10.5
        });
        console.log('Paystack init response status:', resp.status);
    } catch (err) {
        console.error('Paystack init error:', err.response?.data || err.message);
    }
}

async function listTransactions() {
    console.log('Listing transactions...');
    try {
        const resp = await axios.get(`${base}/api/admin/transactions`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Transactions count:', resp.data.transactions.length);
        return resp.data.transactions;
    } catch (err) {
        console.error('List transactions error:', err.response?.data || err.message);
        return [];
    }
}

async function seedTransactions() {
    console.log('Seeding demo transactions...');
    try {
        const resp = await axios.post(`${base}/api/admin/seed`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Seed response:', resp.data);
    } catch (err) {
        console.error('Seed error:', err.response?.data || err.message);
    }
}

async function deleteTransaction(id) {
    console.log(`Deleting transaction id=${id}...`);
    try {
        const resp = await axios.delete(`${base}/api/admin/transactions/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Delete response:', resp.data);
    } catch (err) {
        console.error('Delete error:', err.response?.data || err.message);
    }
}

async function testBroadcast() {
    console.log('Testing WS Broadcast...');
    try {
        const resp = await axios.post(`${base}/api/ws/broadcast`, {
            message: 'Hello from test script'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Broadcast response:', resp.data);
    } catch (err) {
        console.error('Broadcast error:', err.response?.data || err.message);
    }
}

async function testAnalytics() {
    console.log('Testing Analytics Ingestion...');
    try {
        const resp = await axios.post(`${base}/api/analytics/events`, {
            events: [{ name: 'test_event', ts: Date.now() }]
        });
        console.log('Analytics response:', resp.data);
    } catch (err) {
        console.error('Analytics error:', err.response?.data || err.message);
    }
}

(async () => {
    await login();
    if (authToken) {
        await testPaystack();
        await listTransactions();
        await seedTransactions();
        const txs = await listTransactions();
        if (txs.length > 0) {
            await deleteTransaction(txs[0].id);
        }
        await testBroadcast();
        await testAnalytics();
    }
})();
