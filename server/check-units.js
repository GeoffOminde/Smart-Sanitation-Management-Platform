const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUnits() {
    try {
        const units = await prisma.unit.findMany({ take: 2 });

        console.log('=== Sample Units ===');
        units.forEach((unit, index) => {
            console.log(`\nUnit ${index + 1}:`);
            console.log('  ID:', unit.id);
            console.log('  Serial No:', unit.serialNo);
            console.log('  Coordinates (raw):', unit.coordinates);
            console.log('  Coordinates type:', typeof unit.coordinates);

            if (unit.coordinates) {
                try {
                    const parsed = JSON.parse(unit.coordinates);
                    console.log('  Coordinates (parsed):', parsed);
                } catch (e) {
                    console.log('  Coordinates parse error:', e.message);
                }
            }
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkUnits();
