const BASE_URL = 'http://localhost:3001';

async function runE2E() {
    console.log('🚀 Starting End-to-End Test Suite...');

    try {
        // 1. Health/Settings Check
        console.log('\n[1] Testing Settings API...');
        try {
            const settingsReq = await fetch(`${BASE_URL}/api/settings`, {
                headers: { 'Authorization': 'Bearer test-token' }
            });
            console.log(`   Settings Status: ${settingsReq.status}`);
        } catch (e) {
            console.log(`   Settings Check Warning: ${e.message}`);
        }

        // 2. Unit Creation (Setup)
        console.log('\n[2] Setting up Test Unit...');
        const unitRes = await fetch(`${BASE_URL}/api/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serialNo: 'UNIT-TEST-E2E',
                location: 'Test Location',
                fillLevel: 50,
                batteryLevel: 100,
                status: 'active',
                coordinates: [-1.2921, 36.8219] // Ensure format matches backend expectation
            })
        });

        // 200/201 is good, or 500 if unique constraint (unit already exists)
        // If it exists, we just proceed.
        console.log(`   Unit Creation Status: ${unitRes.status}`);

        // 3. IoT Telemetry
        console.log('\n[3] Testing IoT Telemetry Ingest...');
        const iotPayload = {
            serialNo: 'UNIT-TEST-E2E',
            fillLevel: 88.5,
            batteryLevel: 42.0,
            lat: -1.2921,
            lng: 36.8219
        };

        const iotRes = await fetch(`${BASE_URL}/api/iot/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(iotPayload)
        });

        if (!iotRes.ok) {
            const text = await iotRes.text();
            throw new Error(`IoT Request Failed: ${iotRes.status} ${text}`);
        }

        const iotJson = await iotRes.json();
        console.log('   IoT Response:', JSON.stringify(iotJson));

        if (iotJson.unit && iotJson.unit.fillLevel === 88.5) {
            console.log('✅ IoT Telemetry Success: Database updated.');
        } else {
            throw new Error('IoT Data Mismatch in Response');
        }

        console.log('\n✅ E2E Testing Completed Successfully.');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ E2E Test Failed:', err);
        process.exit(1);
    }
}

runE2E();
