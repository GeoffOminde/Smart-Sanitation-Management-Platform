const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

// System health check
const healthCheck = async (req, res) => {
    const startTime = Date.now();
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        checks: {}
    };

    try {
        // Database health check
        try {
            await prisma.$queryRaw`SELECT 1`;
            health.checks.database = {
                status: 'healthy',
                responseTime: Date.now() - startTime
            };
        } catch (dbError) {
            health.status = 'unhealthy';
            health.checks.database = {
                status: 'unhealthy',
                error: dbError.message
            };
            logger.error('Database health check failed', { error: dbError.message });
        }

        // Memory check
        const memUsage = process.memoryUsage();
        health.checks.memory = {
            status: 'healthy',
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        };

        // Check if memory usage is too high (> 500MB)
        if (memUsage.heapUsed > 500 * 1024 * 1024) {
            health.checks.memory.status = 'warning';
            health.checks.memory.message = 'High memory usage detected';
        }

        // Environment variables check
        const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

        health.checks.environment = {
            status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
            missingVariables: missingEnvVars
        };

        if (missingEnvVars.length > 0) {
            health.status = 'unhealthy';
        }

        // Overall response time
        health.responseTime = `${Date.now() - startTime}ms`;

        // Set appropriate status code
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Readiness check (for Kubernetes/Docker)
const readinessCheck = async (req, res) => {
    try {
        // Check if database is accessible
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ready' });
    } catch (error) {
        logger.error('Readiness check failed', { error: error.message });
        res.status(503).json({ status: 'not ready', error: error.message });
    }
};

// Liveness check (for Kubernetes/Docker)
const livenessCheck = (req, res) => {
    // Simple check to see if the process is alive
    res.status(200).json({ status: 'alive', uptime: process.uptime() });
};

// Metrics endpoint
const metrics = async (req, res) => {
    try {
        const [
            totalUsers,
            totalBookings,
            totalUnits,
            totalTransactions,
            activeUnits,
            pendingBookings
        ] = await Promise.all([
            prisma.user.count(),
            prisma.booking.count(),
            prisma.unit.count(),
            prisma.transaction.count(),
            prisma.unit.count({ where: { status: 'active' } }),
            prisma.booking.count({ where: { status: 'pending' } })
        ]);

        const memUsage = process.memoryUsage();

        res.json({
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            system: {
                memory: {
                    rss: memUsage.rss,
                    heapUsed: memUsage.heapUsed,
                    heapTotal: memUsage.heapTotal,
                    external: memUsage.external
                },
                cpu: process.cpuUsage()
            },
            database: {
                totalUsers,
                totalBookings,
                totalUnits,
                totalTransactions,
                activeUnits,
                pendingBookings
            }
        });
    } catch (error) {
        logger.error('Metrics collection failed', { error: error.message });
        res.status(500).json({ error: 'Failed to collect metrics' });
    }
};

module.exports = {
    healthCheck,
    readinessCheck,
    livenessCheck,
    metrics
};
