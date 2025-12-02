// seed.js
// Simple seed script to populate demo data using Prisma

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    // Create a demo admin user
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: await bcrypt.hash('admin123', 10), // hashed password for demo
            name: 'Admin User',
            role: 'admin',
        },
    });
    console.log('Created admin user:', adminUser);

    // Create a demo unit
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

    // Create a demo booking
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

    // Create a demo transaction
    const transaction = await prisma.transaction.create({
        data: {
            provider: 'paystack',
            email: adminUser.email,
            amount: 150.0,
            status: 'success',
        },
    });
    console.log('Created transaction:', transaction);

    // Create a demo maintenance log for the unit
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
