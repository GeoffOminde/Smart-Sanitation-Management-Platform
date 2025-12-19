const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
    try {
        const units = await prisma.unit.count();
        const bookings = await prisma.booking.count();
        const users = await prisma.user.count();
        const routes = await prisma.route.count();
        const teamMembers = await prisma.teamMember.count();

        console.log('=== Database Data Count ===');
        console.log('Units:', units);
        console.log('Bookings:', bookings);
        console.log('Users:', users);
        console.log('Routes:', routes);
        console.log('Team Members:', teamMembers);
        console.log('');

        if (units === 0) {
            console.log('⚠️  No units found in database!');
        }
        if (bookings === 0) {
            console.log('⚠️  No bookings found in database!');
        }
        if (users === 0) {
            console.log('⚠️  No users found in database!');
        }

        // Show sample data
        if (units > 0) {
            const sampleUnit = await prisma.unit.findFirst();
            console.log('\nSample Unit:', JSON.stringify(sampleUnit, null, 2));
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkData();
