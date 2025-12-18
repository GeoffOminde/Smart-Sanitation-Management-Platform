const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

// Track service start time
const startTime = Date.now();

// Health check endpoint
async function healthCheck(req, res) {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: 'healthy',
            uptime: Math.floor((Date.now() - startTime) / 1000),
            timestamp: new Date().toISOString(),
            service: 'smart-sanitation-api'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
}

// Readiness check - is the service ready to accept traffic?
async function readinessCheck(req, res) {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: 'ready',
            checks: {
                database: 'connected'
            }
        });
    } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            checks: {
                database: 'disconnected'
            }
        });
    }
}

// Liveness check - is the service alive?
function livenessCheck(req, res) {
    res.json({
        status: 'alive',
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
}

// Metrics endpoint
async function metrics(req, res) {
    try {
        const [
            totalUnits,
            activeUnits,
            totalBookings,
            pendingBookings,
            totalTransactions
        ] = await Promise.all([
            prisma.unit.count(),
            prisma.unit.count({ where: { status: 'active' } }),
            prisma.booking.count(),
            prisma.booking.count({ where: { status: 'pending' } }),
            prisma.transaction.count()
        ]);

        res.json({
            uptime: Math.floor((Date.now() - startTime) / 1000),
            metrics: {
                units: {
                    total: totalUnits,
                    active: activeUnits
                },
                bookings: {
                    total: totalBookings,
                    pending: pendingBookings
                },
                transactions: {
                    total: totalTransactions
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Metrics collection failed:', error);
        res.status(500).json({
            error: 'Failed to collect metrics'
        });
    }
}

module.exports = {
    healthCheck,
    readinessCheck,
    livenessCheck,
    metrics
};
