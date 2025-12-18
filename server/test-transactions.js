const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransactions() {
    try {
        console.log('Testing Transaction table...');

        // Try to fetch transactions
        const transactions = await prisma.transaction.findMany();
        console.log(`✅ Transaction table exists! Found ${transactions.length} records.`);

        // If empty, add a test transaction
        if (transactions.length === 0) {
            console.log('Adding test transaction...');
            const testTx = await prisma.transaction.create({
                data: {
                    provider: 'mpesa',
                    phone: '+254712345678',
                    amount: 1500,
                    status: 'completed',
                    raw: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
                }
            });
            console.log('✅ Test transaction created:', testTx.id);
        }

        // Fetch again to confirm
        const allTx = await prisma.transaction.findMany();
        console.log(`\nTotal transactions: ${allTx.length}`);
        allTx.forEach(tx => {
            console.log(`  - ${tx.provider}: KSh ${tx.amount} (${tx.status})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testTransactions();
