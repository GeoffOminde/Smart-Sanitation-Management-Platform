// test-prisma.js
// Simple script to verify Prisma client can connect and query the database

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Ensure the database is reachable and the User model works
    const users = await prisma.user.findMany();
    console.log('Users in DB:', users);
}

main()
    .catch((e) => {
        console.error('Error connecting to Prisma:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
