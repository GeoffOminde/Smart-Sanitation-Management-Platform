const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
    // Use environment variable or generate a random password
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');

    if (!process.env.ADMIN_PASSWORD) {
        console.log('⚠️  No ADMIN_PASSWORD environment variable set.');
        console.log('📝 Generated random admin password:', adminPassword);
        console.log('🔐 Please save this password securely!');
    }

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: await bcrypt.hash(adminPassword, 10),
            name: 'Admin User',
            role: 'admin',
        },
    });
    console.log('Created admin user:', adminUser);

    const unit = await prisma.unit.create({
        data: {
            serialNo: 'UNIT-001',
            location: 'Main Campus',
            fillLevel: 45,
            batteryLevel: 80,
            status: 'active',
        },
    });
    console.log('Created unit:', unit);

    const booking = await prisma.booking.create({
        data: {
            customerId: adminUser.id,
            location: 'Main Campus',
            units: 2,
            date: new Date(),
            duration: 7,
            status: 'pending',
        },
    });
    console.log('Created booking:', booking);

    const transaction = await prisma.transaction.create({
        data: {
            provider: 'paystack',
            email: adminUser.email,
            amount: 150.0,
            status: 'success',
        },
    });
    console.log('Created transaction:', transaction);

    const maintenanceLog = await prisma.maintenanceLog.create({
        data: {
            unitId: unit.id,
            type: 'routine',
            description: 'Routine check-up',
            scheduledDate: new Date(),
        },
    });
    console.log('Created maintenance log:', maintenanceLog);
}

main()
    .catch((e) => {
        console.error('Seeding error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
