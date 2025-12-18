// Automated Database Backup Script
// Run this with: node backup.js
// Or schedule with cron: 0 2 * * * (daily at 2 AM)

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = process.env.BACKUP_PATH || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
const DATABASE_URL = process.env.DATABASE_URL;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
}

// Parse database URL
function parseDatabaseUrl(url) {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const match = url.match(regex);

    if (!match) {
        throw new Error('Invalid DATABASE_URL format');
    }

    return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5]
    };
}

// Create backup
async function createBackup() {
    try {
        console.log('🔄 Starting database backup...');

        const db = parseDatabaseUrl(DATABASE_URL);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        // Set PGPASSWORD environment variable
        const env = { ...process.env, PGPASSWORD: db.password };

        // Create backup using pg_dump
        const command = `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -F c -f "${filepath}"`;

        await new Promise((resolve, reject) => {
            exec(command, { env }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });

        // Get file size
        const stats = fs.statSync(filepath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ Backup created successfully!`);
        console.log(`   File: ${filename}`);
        console.log(`   Size: ${fileSizeMB} MB`);
        console.log(`   Path: ${filepath}`);

        // Cleanup old backups
        await cleanupOldBackups();

        return filepath;

    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        throw error;
    }
}

// Cleanup old backups
async function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

        let deletedCount = 0;

        files.forEach(file => {
            if (!file.startsWith('backup-')) return;

            const filepath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filepath);
            const age = now - stats.mtimeMs;

            if (age > maxAge) {
                fs.unlinkSync(filepath);
                deletedCount++;
                console.log(`🗑️  Deleted old backup: ${file}`);
            }
        });

        if (deletedCount > 0) {
            console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
        } else {
            console.log(`✅ No old backups to clean up`);
        }

    } catch (error) {
        console.error('⚠️  Cleanup warning:', error.message);
    }
}

// List all backups
function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(file => file.startsWith('backup-'))
            .map(file => {
                const filepath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filepath);
                return {
                    file,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                    created: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        console.log('\n📦 Available Backups:');
        console.log('─'.repeat(80));

        if (backups.length === 0) {
            console.log('No backups found');
        } else {
            backups.forEach((backup, i) => {
                console.log(`${i + 1}. ${backup.file}`);
                console.log(`   Size: ${backup.size} | Created: ${backup.created}`);
            });
        }

        console.log('─'.repeat(80));

    } catch (error) {
        console.error('❌ Error listing backups:', error.message);
    }
}

// Restore from backup
async function restoreBackup(filename) {
    try {
        console.log(`🔄 Restoring from backup: ${filename}...`);

        const filepath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filepath)) {
            throw new Error(`Backup file not found: ${filename}`);
        }

        const db = parseDatabaseUrl(DATABASE_URL);
        const env = { ...process.env, PGPASSWORD: db.password };

        // Restore using pg_restore
        const command = `pg_restore -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -c "${filepath}"`;

        await new Promise((resolve, reject) => {
            exec(command, { env }, (error, stdout, stderr) => {
                if (error) {
                    // pg_restore may return warnings as errors, check stderr
                    if (stderr && !stderr.includes('ERROR')) {
                        console.warn('⚠️  Warnings during restore:', stderr);
                        resolve();
                    } else {
                        reject(error);
                    }
                    return;
                }
                resolve();
            });
        });

        console.log(`✅ Database restored successfully from ${filename}`);

    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        throw error;
    }
}

// Main execution
const command = process.argv[2];

(async () => {
    try {
        switch (command) {
            case 'create':
            case 'backup':
                await createBackup();
                break;

            case 'list':
                listBackups();
                break;

            case 'restore':
                const filename = process.argv[3];
                if (!filename) {
                    console.error('❌ Please specify backup filename');
                    console.log('Usage: node backup.js restore <filename>');
                    process.exit(1);
                }
                await restoreBackup(filename);
                break;

            case 'cleanup':
                await cleanupOldBackups();
                break;

            default:
                console.log('📦 Database Backup Utility');
                console.log('');
                console.log('Usage:');
                console.log('  node backup.js create   - Create a new backup');
                console.log('  node backup.js list     - List all backups');
                console.log('  node backup.js restore <filename> - Restore from backup');
                console.log('  node backup.js cleanup  - Remove old backups');
                console.log('');
                console.log('Configuration:');
                console.log(`  Backup Directory: ${BACKUP_DIR}`);
                console.log(`  Retention: ${RETENTION_DAYS} days`);
                console.log('');
                console.log('Schedule automatic backups with cron:');
                console.log('  0 2 * * * cd /path/to/project && node backup.js create');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
