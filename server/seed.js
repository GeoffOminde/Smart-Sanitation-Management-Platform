const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();


async function main() {
    // Admin User
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hasedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@smartsanitation.co.ke' },
        update: {},
        create: {
            email: 'admin@smartsanitation.co.ke',
            password: hasedPassword,
            name: 'Admin User',
            role: 'admin',
        },
    });
    console.log('Created admin user:', adminUser);

    // Units
    const unitsData = [
        { serialNo: 'ST-001', location: 'Westlands', fillLevel: 85, batteryLevel: 92, status: 'active', coordinates: JSON.stringify([-1.2641, 36.8078]) },
        { serialNo: 'ST-002', location: 'CBD', fillLevel: 45, batteryLevel: 78, status: 'active', coordinates: JSON.stringify([-1.2921, 36.8219]) },
        { serialNo: 'ST-003', location: 'Karen', fillLevel: 92, batteryLevel: 15, status: 'maintenance', coordinates: JSON.stringify([-1.3197, 36.6859]) },
        { serialNo: 'ST-004', location: 'Kilimani', fillLevel: 23, batteryLevel: 88, status: 'active', coordinates: JSON.stringify([-1.2906, 36.782]) },
    ];

    for (const u of unitsData) {
        await prisma.unit.upsert({
            where: { serialNo: u.serialNo },
            update: {},
            create: u
        });
    }
    console.log('Seeded units');

    // Routes
    // Routes
    const routeCheck = await prisma.route.count();
    if (routeCheck === 0) {
        const u1 = await prisma.unit.findUnique({ where: { serialNo: 'ST-001' } });
        const u2 = await prisma.unit.findUnique({ where: { serialNo: 'ST-002' } });
        const u3 = await prisma.unit.findUnique({ where: { serialNo: 'ST-003' } });

        await prisma.route.createMany({
            data: [
                { technician: 'John Kamau', units: 1, status: 'active', estimatedTime: '2.5 hrs', priority: 'high', unitId: u1?.id },
                { technician: 'Mary Wanjiku', units: 1, status: 'pending', estimatedTime: '1.8 hrs', priority: 'medium', unitId: u2?.id },
                { technician: 'Peter Ochieng', units: 1, status: 'completed', estimatedTime: '3.2 hrs', priority: 'low', unitId: u3?.id },
            ]
        });
        console.log('Seeded routes');
    }

    // Bookings
    const bookingsData = [
        { customer: 'Safari Construction', unit: 'ST-001', date: new Date('2024-01-15'), duration: '3 days', amount: 15000, status: 'confirmed', paymentStatus: 'paid' },
        { customer: 'Nairobi Events Co.', unit: 'ST-002', date: new Date('2024-01-16'), duration: '1 day', amount: 8000, status: 'pending', paymentStatus: 'pending' },
        { customer: 'City Council', unit: 'ST-004', date: new Date('2024-01-17'), duration: '7 days', amount: 35000, status: 'confirmed', paymentStatus: 'paid' },
    ];
    for (const b of bookingsData) {
        // Create simple
        await prisma.booking.create({ data: b });
    }
    console.log('Seeded bookings');

    // Team Members
    const teamData = [
        { name: 'John Kamau', role: 'Fleet Manager', email: 'john@company.com', phone: '+254712345678', status: 'active', joinDate: new Date('2023-06-15') },
        { name: 'Mary Wanjiku', role: 'Field Technician', email: 'mary@company.com', phone: '+254723456789', status: 'active', joinDate: new Date('2023-08-20') },
        { name: 'Peter Ochieng', role: 'Route Coordinator', email: 'peter@company.com', phone: '+254734567890', status: 'active', joinDate: new Date('2023-09-10') },
        { name: 'Grace Akinyi', role: 'Customer Support', email: 'grace@company.com', phone: '+254745678901', status: 'inactive', joinDate: new Date('2023-11-05') },
    ];
    for (const t of teamData) {
        await prisma.teamMember.create({ data: t });
    }
    console.log('Seeded team members');

    // Settings
    await prisma.settings.create({
        data: {
            companyName: 'Smart Sanitation Co.',
            contactEmail: 'admin@smartsanitation.co.ke',
            phone: '+254 700 000 000',
            language: 'en',
            sessionTimeout: '30',
            emailNotifications: true,
            whatsappNotifications: true,
        }
    });
    console.log('Seeded settings');
}

main()
    .catch((e) => {
        console.error('Seeding error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
