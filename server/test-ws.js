const axios = require('axios');
const base = 'http://localhost:3001';

async function main() {
    try {
        const email = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
        const password = process.env.TEST_ADMIN_PASSWORD;

        if (!password) {
            console.error('ERROR: TEST_ADMIN_PASSWORD environment variable is required for testing');
            console.error('Set it with: export TEST_ADMIN_PASSWORD=your_password');
            process.exit(1);
        }

        const loginResp = await axios.post(`${base}/api/auth/login`, {
            email,
            password
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
