const axios = require('axios');
const base = 'http://localhost:3001';

async function main() {
    try {
        const loginResp = await axios.post(`${base}/api/auth/login`, {
            email: 'admin@example.com',
            password: 'admin123'
        });
        const token = loginResp.data.token;

        const resp = await axios.post(`${base}/api/ws/broadcast`, {
            message: 'Test WS'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('WS Broadcast:', resp.data);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
main();
