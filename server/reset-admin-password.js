// reset-admin-password.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
    const email = 'admin@example.com';
    const newPlain = 'admin123';
    const hashed = await bcrypt.hash(newPlain, 10);
    const user = await prisma.user.update({
        where: { email },
        data: { password: hashed }
    });
    console.log('Admin password reset:', user.email);
    await prisma.$disconnect();
})();
