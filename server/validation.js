const Joi = require('joi');

// Validation schemas for API requests
const schemas = {
    // Authentication
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().min(2).max(100).required(),
        role: Joi.string().valid('admin', 'user', 'technician').optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
    }),

    // Payments
    paystackInit: Joi.object({
        email: Joi.string().email().required(),
        amount: Joi.number().positive().required()
    }),

    mpesaSTK: Joi.object({
        phone: Joi.string().pattern(/^(\+?254|0)?[17]\d{8}$/).required(),
        amount: Joi.number().positive().required()
    }),

    // Bookings
    createBooking: Joi.object({
        customer: Joi.string().min(2).max(100).required(),
        unitId: Joi.string().required(),
        date: Joi.date().iso().required(),
        duration: Joi.number().integer().positive().required(),
        amount: Joi.number().positive().required(),
        status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional(),
        paymentStatus: Joi.string().valid('pending', 'paid', 'failed').optional(),
        technicianId: Joi.string().optional()
    }),

    updateBooking: Joi.object({
        customer: Joi.string().min(2).max(100).optional(),
        unitId: Joi.string().optional(),
        date: Joi.date().iso().optional(),
        duration: Joi.number().integer().positive().optional(),
        amount: Joi.number().positive().optional(),
        status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional(),
        paymentStatus: Joi.string().valid('pending', 'paid', 'failed').optional(),
        technicianId: Joi.string().optional()
    }),

    // Units
    createUnit: Joi.object({
        serialNo: Joi.string().required(),
        location: Joi.string().required(),
        status: Joi.string().valid('active', 'maintenance', 'offline').optional(),
        fillLevel: Joi.number().min(0).max(100).optional(),
        batteryLevel: Joi.number().min(0).max(100).optional(),
        coordinates: Joi.string().optional(),
        lastSeen: Joi.date().iso().optional(),
        temperature: Joi.number().optional(),
        humidity: Joi.number().optional(),
        odorLevel: Joi.number().min(0).max(100).optional(),
        usageCount: Joi.number().integer().min(0).optional()
    }),

    updateUnit: Joi.object({
        serialNo: Joi.string().optional(),
        location: Joi.string().optional(),
        status: Joi.string().valid('active', 'maintenance', 'offline').optional(),
        fillLevel: Joi.number().min(0).max(100).optional(),
        batteryLevel: Joi.number().min(0).max(100).optional(),
        coordinates: Joi.string().optional(),
        lastSeen: Joi.date().iso().optional(),
        temperature: Joi.number().optional(),
        humidity: Joi.number().optional(),
        odorLevel: Joi.number().min(0).max(100).optional(),
        usageCount: Joi.number().integer().min(0).optional()
    }),

    // Routes
    createRoute: Joi.object({
        name: Joi.string().required(),
        technicianId: Joi.string().required(),
        stops: Joi.array().items(Joi.string()).min(1).required(),
        status: Joi.string().valid('planned', 'active', 'completed').optional(),
        scheduledDate: Joi.date().iso().required()
    }),

    updateRoute: Joi.object({
        name: Joi.string().optional(),
        technicianId: Joi.string().optional(),
        stops: Joi.array().items(Joi.string()).min(1).optional(),
        status: Joi.string().valid('planned', 'active', 'completed').optional(),
        scheduledDate: Joi.date().iso().optional()
    }),

    // Team Members
    createTeamMember: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        role: Joi.string().valid('driver', 'technician', 'manager').required(),
        phone: Joi.string().pattern(/^(\+?254|0)?[17]\d{8}$/).required(),
        email: Joi.string().email().optional(),
        status: Joi.string().valid('active', 'inactive', 'on-leave').optional(),
        lastLat: Joi.number().optional(),
        lastLng: Joi.number().optional()
    }),

    updateTeamMember: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        role: Joi.string().valid('driver', 'technician', 'manager').optional(),
        phone: Joi.string().pattern(/^(\+?254|0)?[17]\d{8}$/).optional(),
        email: Joi.string().email().optional(),
        status: Joi.string().valid('active', 'inactive', 'on-leave').optional(),
        lastLat: Joi.number().optional(),
        lastLng: Joi.number().optional()
    }),

    // Maintenance
    createMaintenance: Joi.object({
        unitId: Joi.string().required(),
        technicianId: Joi.string().required(),
        description: Joi.string().required(),
        scheduledDate: Joi.date().iso().required(),
        status: Joi.string().valid('scheduled', 'in-progress', 'completed').optional(),
        priority: Joi.string().valid('low', 'medium', 'high').optional()
    }),

    // IoT Telemetry
    iotTelemetry: Joi.object({
        serialNo: Joi.string().required(),
        fillLevel: Joi.number().min(0).max(100).optional(),
        batteryLevel: Joi.number().min(0).max(100).optional(),
        temperature: Joi.number().optional(),
        humidity: Joi.number().optional(),
        odorLevel: Joi.number().min(0).max(100).optional(),
        usageCount: Joi.number().integer().min(0).optional(),
        coordinates: Joi.string().optional(),
        lat: Joi.number().optional(),
        lng: Joi.number().optional()
    }),

    // Notifications
    sendNotification: Joi.object({
        channel: Joi.string().valid('email', 'whatsapp', 'sms').required(),
        recipient: Joi.string().required(),
        message: Joi.string().required()
    }),

    // AI Endpoints
    predictMaintenance: Joi.object({
        units: Joi.array().items(Joi.object({
            id: Joi.string().required(),
            serialNo: Joi.string().required(),
            fillLevel: Joi.number().min(0).max(100).required(),
            batteryLevel: Joi.number().min(0).max(100).required(),
            lastSeen: Joi.date().iso().required()
        })).required()
    }),

    routeOptimize: Joi.object({
        depot: Joi.object({
            lat: Joi.number().required(),
            lng: Joi.number().required()
        }).required(),
        stops: Joi.array().items(Joi.object({
            id: Joi.string().required(),
            lat: Joi.number().required(),
            lng: Joi.number().required(),
            priority: Joi.string().valid('low', 'medium', 'high').optional()
        })).min(1).required()
    }),

    forecastBookings: Joi.object({
        bookings: Joi.array().items(Joi.object({
            date: Joi.date().iso().required()
        })).required(),
        horizonDays: Joi.number().integer().positive().max(90).optional(),
        capacityPerDay: Joi.number().integer().min(0).optional()
    }),

    smartBookingSuggest: Joi.object({
        date: Joi.date().iso().optional(),
        location: Joi.string().optional(),
        units: Joi.number().integer().positive().optional(),
        durationDays: Joi.number().integer().positive().optional(),
        capacityPerDay: Joi.number().integer().positive().optional(),
        bookingsHistory: Joi.array().optional()
    })
};

// Validation middleware factory
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];

        if (!schema) {
            return res.status(500).json({ error: 'Validation schema not found' });
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

module.exports = { schemas, validate };
