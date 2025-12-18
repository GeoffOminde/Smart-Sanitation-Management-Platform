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

    // Units - Add more diverse units across Nairobi with types and IoT data
    const unitsData = [
        {
            serialNo: 'UNIT-001',
            type: 'Standard Portable',
            location: 'Westlands',
            fillLevel: 85,
            batteryLevel: 92,
            status: 'active',
            coordinates: JSON.stringify([-1.2641, 36.8078]),
            temperature: 28.5,
            humidity: 65.2,
            odorLevel: 45,
            usageCount: 127,
            lastServiceDate: new Date('2024-12-10')
        },
        {
            serialNo: 'UNIT-002',
            type: 'Deluxe Portable',
            location: 'CBD',
            fillLevel: 45,
            batteryLevel: 78,
            status: 'active',
            coordinates: JSON.stringify([-1.2921, 36.8219]),
            temperature: 29.1,
            humidity: 68.5,
            odorLevel: 32,
            usageCount: 89,
            lastServiceDate: new Date('2024-12-12')
        },
        {
            serialNo: 'UNIT-003',
            type: 'Wheelchair Accessible',
            location: 'Karen',
            fillLevel: 92,
            batteryLevel: 15,
            status: 'maintenance',
            coordinates: JSON.stringify([-1.3197, 36.6859]),
            temperature: 27.8,
            humidity: 70.1,
            odorLevel: 78,
            usageCount: 156,
            lastServiceDate: new Date('2024-11-28')
        },
        {
            serialNo: 'UNIT-004',
            type: 'Standard Portable',
            location: 'Kilimani',
            fillLevel: 23,
            batteryLevel: 88,
            status: 'active',
            coordinates: JSON.stringify([-1.2906, 36.782]),
            temperature: 28.9,
            humidity: 64.8,
            odorLevel: 18,
            usageCount: 45,
            lastServiceDate: new Date('2024-12-14')
        },
        {
            serialNo: 'UNIT-005',
            type: 'Deluxe Portable',
            location: 'Parklands',
            fillLevel: 67,
            batteryLevel: 95,
            status: 'active',
            coordinates: JSON.stringify([-1.2626, 36.8156]),
            temperature: 28.2,
            humidity: 66.3,
            odorLevel: 41,
            usageCount: 98,
            lastServiceDate: new Date('2024-12-11')
        },
        {
            serialNo: 'UNIT-006',
            type: 'Standard Portable',
            location: 'Lavington',
            fillLevel: 34,
            batteryLevel: 72,
            status: 'active',
            coordinates: JSON.stringify([-1.2833, 36.7667]),
            temperature: 27.5,
            humidity: 63.7,
            odorLevel: 25,
            usageCount: 67,
            lastServiceDate: new Date('2024-12-13')
        },
        {
            serialNo: 'UNIT-007',
            type: 'Wheelchair Accessible',
            location: 'Upperhill',
            fillLevel: 89,
            batteryLevel: 45,
            status: 'active',
            coordinates: JSON.stringify([-1.2889, 36.8167]),
            temperature: 29.3,
            humidity: 69.2,
            odorLevel: 52,
            usageCount: 134,
            lastServiceDate: new Date('2024-12-09')
        },
        {
            serialNo: 'UNIT-008',
            type: 'Deluxe Portable',
            location: 'Ngong Road',
            fillLevel: 12,
            batteryLevel: 88,
            status: 'active',
            coordinates: JSON.stringify([-1.3028, 36.7833]),
            temperature: 28.7,
            humidity: 65.9,
            odorLevel: 15,
            usageCount: 34,
            lastServiceDate: new Date('2024-12-15')
        },
        {
            serialNo: 'UNIT-009',
            type: 'Standard Portable',
            location: 'Langata',
            fillLevel: 78,
            batteryLevel: 91,
            status: 'active',
            coordinates: JSON.stringify([-1.3500, 36.7333]),
            temperature: 27.9,
            humidity: 67.4,
            odorLevel: 48,
            usageCount: 112,
            lastServiceDate: new Date('2024-12-08')
        },
        {
            serialNo: 'UNIT-010',
            type: 'Wheelchair Accessible',
            location: 'Eastleigh',
            fillLevel: 56,
            batteryLevel: 67,
            status: 'active',
            coordinates: JSON.stringify([-1.2833, 36.8500]),
            temperature: 29.8,
            humidity: 71.2,
            odorLevel: 38,
            usageCount: 87,
            lastServiceDate: new Date('2024-12-11')
        },
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
        const u1 = await prisma.unit.findUnique({ where: { serialNo: 'UNIT-001' } });
        const u2 = await prisma.unit.findUnique({ where: { serialNo: 'UNIT-002' } });
        const u3 = await prisma.unit.findUnique({ where: { serialNo: 'UNIT-003' } });

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
        { customer: 'Safari Construction', unit: 'UNIT-001', date: new Date('2024-01-15'), duration: '3 days', amount: 15000, status: 'confirmed', paymentStatus: 'paid' },
        { customer: 'Nairobi Events Co.', unit: 'UNIT-002', date: new Date('2024-01-16'), duration: '1 day', amount: 8000, status: 'pending', paymentStatus: 'pending' },
        { customer: 'City Council', unit: 'UNIT-004', date: new Date('2024-01-17'), duration: '7 days', amount: 35000, status: 'confirmed', paymentStatus: 'paid' },
    ];
    for (const b of bookingsData) {
        // Create simple
        await prisma.booking.create({ data: b });
    }
    console.log('Seeded bookings');

    // Team Members - Add GPS coordinates for map display
    const teamData = [
        { name: 'John Kamau', role: 'Fleet Manager', email: 'john@company.com', phone: '+254712345678', status: 'active', joinDate: new Date('2023-06-15'), lastLat: -1.2700, lastLng: 36.8100 },
        { name: 'Mary Wanjiku', role: 'Field Technician', email: 'mary@company.com', phone: '+254723456789', status: 'active', joinDate: new Date('2023-08-20'), lastLat: -1.2850, lastLng: 36.8250 },
        { name: 'Peter Ochieng', role: 'Route Coordinator', email: 'peter@company.com', phone: '+254734567890', status: 'active', joinDate: new Date('2023-09-10'), lastLat: -1.3100, lastLng: 36.7900 },
        { name: 'Grace Akinyi', role: 'Customer Support', email: 'grace@company.com', phone: '+254745678901', status: 'active', joinDate: new Date('2023-11-05'), lastLat: -1.2650, lastLng: 36.8050 },
        { name: 'David Mwangi', role: 'Driver', email: 'david@company.com', phone: '+254756789012', status: 'active', joinDate: new Date('2023-10-01'), lastLat: -1.2950, lastLng: 36.8300 },
        { name: 'Sarah Njeri', role: 'Technician', email: 'sarah@company.com', phone: '+254767890123', status: 'active', joinDate: new Date('2023-12-15'), lastLat: -1.3200, lastLng: 36.7700 },
    ];
    for (const t of teamData) {
        await prisma.teamMember.upsert({
            where: { email: t.email },
            update: {},
            create: t
        });
    }
    console.log('Seeded team members');

    // Settings
    await prisma.settings.create({
        data: {
            userId: adminUser.id,
            companyName: 'Smart Sanitation Co.',
            contactEmail: 'admin@smartsanitation.co.ke',
            phone: '+254 700 000 000',
            language: 'en',
            sessionTimeout: '30',
            theme: 'light',
            currency: 'KES',
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
