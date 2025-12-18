const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@smartsanitation.co.ke' },
        update: {},
        create: {
            email: 'admin@smartsanitation.co.ke',
            name: 'System Admin',
            password: passwordHash,
            role: 'admin',
        },
    });

    const tech = await prisma.user.upsert({
        where: { email: 'tech@smartsanitation.co.ke' },
        update: {},
        create: {
            email: 'tech@smartsanitation.co.ke',
            name: 'John Technician',
            password: passwordHash,
            role: 'technician',
        },
    });

    console.log('✅ Users seeded');

    // 2. Seed Settings
    await prisma.settings.upsert({
        where: { id: 'default-settings' }, // Assuming we might want a fixed ID, but schema uses uuid. We'll find first or create.
        update: {},
        create: {
            companyName: 'Smart Sanitation Ltd',
            contactEmail: 'support@smartsanitation.co.ke',
            phone: '+254 700 123 456',
            userId: admin.id,
            currency: 'KES',
            theme: 'light',
        },
    });
    // Note: Schema doesn't enforce singleton settings, but let's assume one is enough.

    // 3. Seed Units
    const unitsData = [
        { serialNo: 'UNIT-001', location: 'Central Market', type: 'Standard Portable', fillLevel: 45, batteryLevel: 88, status: 'Active' },
        { serialNo: 'UNIT-002', location: 'Bus Station', type: 'Deluxe Portable', fillLevel: 92, batteryLevel: 76, status: 'Active' },
        { serialNo: 'UNIT-003', location: 'Public Park', type: 'Wheelchair Accessible', fillLevel: 15, batteryLevel: 95, status: 'Active' },
        { serialNo: 'UNIT-004', location: 'Construction Site A', type: 'Standard Portable', fillLevel: 60, batteryLevel: 40, status: 'Maintenance' },
        { serialNo: 'UNIT-005', location: 'Festival Grounds', type: 'Deluxe Portable', fillLevel: 10, batteryLevel: 100, status: 'Active' },
    ];

    for (const u of unitsData) {
        await prisma.unit.upsert({
            where: { serialNo: u.serialNo },
            update: {},
            create: {
                ...u,
                coordinates: '-1.2921,36.8219', // Nairobi approx
            },
        });
    }
    console.log('✅ Units seeded');

    // 4. Seed Bookings
    const bookingsData = [
        { customer: 'Alice Event Planners', date: new Date('2024-01-15'), amount: 15000, status: 'Confirmed' },
        { customer: 'Construction Co.', date: new Date('2024-01-20'), amount: 45000, status: 'Pending' },
        { customer: 'City Council', date: new Date('2023-12-10'), amount: 12000, status: 'Completed' },
    ];

    for (const b of bookingsData) {
        // We can't easily upsert without unique key, so we just create if generic count is low
        // For demo, just creating a few is fine. Ideally we check existence.
        const exists = await prisma.booking.findFirst({ where: { customer: b.customer, date: b.date } });
        if (!exists) {
            await prisma.booking.create({
                data: {
                    ...b,
                    unit: 'Multiple',
                    duration: '3 Days',
                }
            });
        }
    }
    console.log('✅ Bookings seeded');

    // 5. Seed Analytics (for ROI page)
    // Generate last 30 days of data
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // Simple date match if needed, but schema uses DateTime @unique

        // Check if exists by date range (Prisma DateTime unique is exact)
        // We'll simplisticly just try/catch or skip.
        // Better:
        const startOfDay = new Date(d.setHours(0, 0, 0, 0));

        const exists = await prisma.analyticsDaily.findUnique({
            where: { date: startOfDay }
        });

        if (!exists) {
            await prisma.analyticsDaily.create({
                data: {
                    date: startOfDay,
                    revenue: Math.floor(Math.random() * 50000) + 10000,
                    pickups: Math.floor(Math.random() * 20),
                    distance: Math.floor(Math.random() * 100) + 50,
                    fuelCost: Math.floor(Math.random() * 5000) + 2000,
                    activeUnits: 5 + Math.floor(Math.random() * 3),
                }
            });
        }
    }
    console.log('✅ Analytics seeded');

    console.log('🚀 Database seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
