const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./logger');

// Rate limiting configurations
const createRateLimiter = (options = {}) => {
    const defaults = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                method: req.method
            });
            res.status(429).json({
                error: 'Too many requests',
                message: 'You have exceeded the rate limit. Please try again later.',
                retryAfter: Math.ceil(options.windowMs / 1000)
            });
        }
    };

    return rateLimit({ ...defaults, ...options });
};

// Different rate limiters for different endpoints
const rateLimiters = {
    // Strict rate limiting for authentication endpoints
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per 15 minutes
        message: 'Too many authentication attempts, please try again later.'
    }),

    // Moderate rate limiting for payment endpoints
    payment: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 payment attempts per 15 minutes
        message: 'Too many payment requests, please try again later.'
    }),

    // Standard rate limiting for API endpoints
    api: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // 100 requests per 15 minutes
    }),

    // Lenient rate limiting for read-only endpoints
    readOnly: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200 // 200 requests per 15 minutes
    })
};

// Helmet security configuration
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.paystack.co', 'https://sandbox.safaricom.co.ke', 'https://api.safaricom.co.ke', 'https://api.openweathermap.org'],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for payment gateways
    crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// CORS configuration
const getCorsOptions = () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:3000'];

    return {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (process.env.NODE_ENV === 'production') {
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('CORS blocked request from origin:', origin);
                    callback(new Error('Not allowed by CORS'));
                }
            } else {
                // Allow all origins in development
                callback(null, true);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        maxAge: 600 // Cache preflight requests for 10 minutes
    };
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
    // Remove any potential XSS attempts from request body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Basic XSS prevention - remove script tags
                req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }
        });
    }
    next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
};

// IP logging middleware
const logRequest = (req, res, next) => {
    logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
};

// Error logging middleware
const logError = (err, req, res, next) => {
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next(err);
};

module.exports = {
    rateLimiters,
    helmetConfig,
    getCorsOptions,
    sanitizeRequest,
    securityHeaders,
    logRequest,
    logError
};
