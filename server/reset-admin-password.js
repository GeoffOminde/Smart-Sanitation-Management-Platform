// reset-admin-password.js
// Usage: node reset-admin-password.js <new_password>
// Or set NEW_PASSWORD environment variable
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
    const email = 'admin@example.com';
    const newPlain = process.argv[2] || process.env.NEW_PASSWORD;

    if (!newPlain) {
        console.error('ERROR: Password is required');
        console.error('Usage: node reset-admin-password.js <new_password>');
        console.error('Or set NEW_PASSWORD environment variable');
        process.exit(1);
    }

    if (newPlain.length < 8) {
        console.error('ERROR: Password must be at least 8 characters long');
        process.exit(1);
    }

    const hashed = await bcrypt.hash(newPlain, 10);
    const user = await prisma.user.update({
        where: { email },
        data: { password: hashed }
    });
    console.log('✅ Admin password reset successfully for:', user.email);
    await prisma.$disconnect();
})();
