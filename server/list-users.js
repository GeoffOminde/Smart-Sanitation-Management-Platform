// list-users.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
    const users = await prisma.user.findMany();
    console.log('Users:', users);
    await prisma.$disconnect();
})();
