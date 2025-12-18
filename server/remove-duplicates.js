const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicates() {
    console.log('Removing duplicate team members...');

    // Get all team members
    const allMembers = await prisma.teamMember.findMany({
        orderBy: { createdAt: 'asc' }
    });

    // Track seen emails
    const seenEmails = new Set();
    const duplicatesToDelete = [];

    for (const member of allMembers) {
        if (seenEmails.has(member.email)) {
            // This is a duplicate
            duplicatesToDelete.push(member.id);
            console.log(`Found duplicate: ${member.name} (${member.email})`);
        } else {
            seenEmails.add(member.email);
        }
    }

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
        await prisma.teamMember.deleteMany({
            where: {
                id: { in: duplicatesToDelete }
            }
        });
        console.log(`Deleted ${duplicatesToDelete.length} duplicate team members`);
    } else {
        console.log('No duplicates found');
    }
}

removeDuplicates()
    .catch((e) => {
        console.error('Error removing duplicates:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
