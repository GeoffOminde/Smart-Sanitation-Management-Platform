const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

// Session storage for context (in production, use Redis or similar)
const sessions = new Map();

async function handleAssistantMessage(message, locale = 'en', sessionId = null) {
    try {
        const lowerMsg = message.toLowerCase();
        let reply = '';

        // Get or create session
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, { history: [], context: {} });
        }

        const session = sessions.get(sessionId);
        session.history.push({ role: 'user', message, timestamp: new Date() });

        // Enhanced intent detection with database queries

        // 1. Booking / Reservation Query
        if (lowerMsg.includes('book') || lowerMsg.includes('order') || lowerMsg.includes('reserve') || lowerMsg.includes('rent')) {
            const [pendingBookings, confirmedBookings, availableUnits] = await Promise.all([
                prisma.booking.count({ where: { status: 'pending' } }),
                prisma.booking.count({ where: { status: 'confirmed' } }),
                prisma.unit.count({ where: { status: 'active' } })
            ]);

            if (lowerMsg.includes('how') || lowerMsg.includes('process')) {
                reply = locale === 'sw'
                    ? `Mchakato wa kuweka oda ni rahisi! 1) Nenda kwenye tab ya 'Bookings' 2) Bonyeza 'New Booking' 3) Jaza maelezo ya mteja, chagua unit, na tarehe 4) Thibitisha malipo. Tuna units ${availableUnits} zinazopatikana sasa hivi!`
                    : `Booking is easy! 1) Go to the 'Bookings' tab 2) Click 'New Booking' 3) Fill in customer details, select a unit, and choose dates 4) Confirm payment. We have ${availableUnits} units available right now!`;
            } else {
                reply = locale === 'sw'
                    ? `Tuna nafasi! Kwa sasa tuna oda ${pendingBookings} zinazosubiri na ${confirmedBookings} zimethibitishwa. Units ${availableUnits} zipo tayari. Unaweza kuweka oda mpya kupitia tab ya 'Bookings'.`
                    : `We can help with that! Currently, we have ${pendingBookings} pending and ${confirmedBookings} confirmed bookings. ${availableUnits} units are available. You can create a new booking directly from the 'Bookings' tab.`;
            }
        }
        // 2. Pricing / Cost Query
        else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('much') || lowerMsg.includes('rate')) {
            if (lowerMsg.includes('type') || lowerMsg.includes('different') || lowerMsg.includes('unit')) {
                reply = locale === 'sw'
                    ? "Bei zetu ni: **Standard Portable**: KES 2,500/siku, **Deluxe Portable**: KES 3,500/siku, **Wheelchair Accessible**: KES 4,000/siku. Punguzo za 15% kwa oda za wiki 1+, 25% kwa mwezi 1+."
                    : "Our pricing: **Standard Portable**: KES 2,500/day, **Deluxe Portable**: KES 3,500/day, **Wheelchair Accessible**: KES 4,000/day. Discounts: 15% for 1+ week, 25% for 1+ month.";
            } else {
                reply = locale === 'sw'
                    ? "Bei zetu zinaanza KES 2,500 kwa siku kwa kila unit. Tunatoa punguzo kwa oda za muda mrefu (zaidi ya siku 7). Tuna aina tatu: Standard, Deluxe, na Wheelchair Accessible."
                    : "Our standard pricing starts at KES 2,500 per day per unit. We offer discounts for long-term rentals (7+ days). We have 3 types: Standard, Deluxe, and Wheelchair Accessible units.";
            }
        }
        // 3. Payment Query
        else if (lowerMsg.includes('pay') || lowerMsg.includes('payment') || lowerMsg.includes('mpesa') || lowerMsg.includes('card')) {
            const [paidBookings, pendingPayments] = await Promise.all([
                prisma.booking.count({ where: { paymentStatus: 'paid' } }),
                prisma.booking.count({ where: { paymentStatus: 'pending' } })
            ]);

            if (lowerMsg.includes('method') || lowerMsg.includes('how')) {
                reply = locale === 'sw'
                    ? "Tunakubali malipo kupitia: M-Pesa (Paybill 123456), Kadi za Benki (Visa/Mastercard), na Malipo ya Moja kwa Moja kwa Benki. Malipo yote ni salama na yanalindwa. Unaweza kulipa wakati wa kuweka oda au baadaye."
                    : "We accept payments via: M-Pesa (Paybill 123456), Credit/Debit Cards (Visa/Mastercard), and Direct Bank Transfer. All payments are secure and encrypted. You can pay during booking or later.";
            } else {
                reply = locale === 'sw'
                    ? `Hali ya malipo: ${paidBookings} oda zimelipwa, ${pendingPayments} zinasubiri malipo. Tunakubali M-Pesa, kadi za benki, na uhamisho wa benki.`
                    : `Payment status: ${paidBookings} bookings paid, ${pendingPayments} pending payment. We accept M-Pesa, credit cards, and bank transfers.`;
            }
        }
        // 4. Maintenance / Status Query
        else if (lowerMsg.includes('maintenance') || lowerMsg.includes('repair') || lowerMsg.includes('broken') || lowerMsg.includes('status') || lowerMsg.includes('service')) {
            const [unitsInMaintenance, unitsActive] = await Promise.all([
                prisma.unit.count({ where: { status: 'maintenance' } }),
                prisma.unit.count({ where: { status: 'active' } })
            ]);

            if (lowerMsg.includes('schedule') || lowerMsg.includes('when') || lowerMsg.includes('how often')) {
                reply = locale === 'sw'
                    ? "Ratiba ya ukarabati: Units zinahudumishwa kila wiki 2, au wakati fill level inafikia 90%, au wakati IoT sensors zinaonyesha tatizo. Tunafuatilia kiotomatiki hali, joto, na unyevu wa kila unit."
                    : "Maintenance schedule: Units are serviced every 2 weeks, when fill level reaches 90%, or when IoT sensors detect issues. We automatically monitor temperature, humidity, and odor levels for each unit.";
            } else {
                reply = locale === 'sw'
                    ? `Hali ya sasa: Tuna units ${unitsInMaintenance} kwenye ukarabati na ${unitsActive} zipo tayari kufanya kazi. Tunafuatilia kila unit kwa kutumia IoT sensors kwa joto, unyevu, na harufu.`
                    : `System Status: ${unitsInMaintenance} units are currently in maintenance, while ${unitsActive} are active and deployed. We monitor each unit with IoT sensors for temperature, humidity, and odor levels.`;
            }
        }
        // 5. IoT / Monitoring Query
        else if (lowerMsg.includes('iot') || lowerMsg.includes('sensor') || lowerMsg.includes('monitor') || lowerMsg.includes('track') || lowerMsg.includes('temperature')) {
            reply = locale === 'sw'
                ? "Kila unit ina sensors za IoT zinazofuatilia: 🌡️ Joto (27-30°C), 💧 Unyevu (60-70%), 👃 Kiwango cha harufu (0-100), 📊 Idadi ya matumizi, na 🔋 Betri. Data inapatikana wakati halisi kwenye Fleet Map!"
                : "Each unit has IoT sensors tracking: 🌡️ Temperature (27-30°C), 💧 Humidity (60-70%), 👃 Odor level (0-100), 📊 Usage count, and 🔋 Battery. Real-time data is available on the Fleet Map!";
        }
        // 6. Unit Types Query
        else if (lowerMsg.includes('type') || lowerMsg.includes('kind') || lowerMsg.includes('wheelchair') || lowerMsg.includes('accessible')) {
            reply = locale === 'sw'
                ? "Tuna aina 3 za units: **Standard Portable** (KES 2,500/siku) - kawaida, **Deluxe Portable** (KES 3,500/siku) - ina vipengele vya ziada, **Wheelchair Accessible** (KES 4,000/siku) - inafaa kwa wenye ulemavu. Zote zina IoT monitoring!"
                : "We have 3 unit types: **Standard Portable** (KES 2,500/day) - basic model, **Deluxe Portable** (KES 3,500/day) - premium features, **Wheelchair Accessible** (KES 4,000/day) - ADA compliant. All include IoT monitoring!";
        }
        // 7. Revenue / Earnings (Admin Query)
        else if (lowerMsg.includes('money') || lowerMsg.includes('revenue') || lowerMsg.includes('earned') || lowerMsg.includes('sales') || lowerMsg.includes('income')) {
            const aggregations = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { status: 'success' }
            });
            const total = aggregations._sum.amount || 0;
            const bookingCount = await prisma.booking.count({ where: { status: 'confirmed' } });

            reply = locale === 'sw'
                ? `Jumla ya mapato hadi sasa ni KES ${total.toLocaleString()} kutoka kwa oda ${bookingCount} zilizothibitishwa. Unaweza kuona ripoti kamili kwenye tab ya 'Analytics'.`
                : `Total revenue generated to date is KES ${total.toLocaleString()} from ${bookingCount} confirmed bookings. View detailed reports in the 'Analytics' tab.`;
        }
        // 8. Location / Availability Query
        else if (lowerMsg.includes('where') || lowerMsg.includes('location') || lowerMsg.includes('area') || lowerMsg.includes('available')) {
            const units = await prisma.unit.findMany({ where: { status: 'active' }, select: { location: true } });
            const locations = [...new Set(units.map(u => u.location))].slice(0, 5).join(', ');

            reply = locale === 'sw'
                ? `Tuna units katika maeneo mengi ya Nairobi ikiwemo: ${locations}. Angalia Fleet Map kuona mahali halisi pa kila unit!`
                : `We have units deployed across Nairobi including: ${locations}. Check the Fleet Map to see exact locations of all units!`;
        }
        // Default / Greeting
        else {
            reply = locale === 'sw'
                ? "Habari! 👋 Mimi ni Cortex AI, msaidizi wako wa Smart Sanitation. Naweza kukusaidia na:\n\n📅 **Oda** - Jinsi ya kuweka oda\n💰 **Bei** - Aina za units na bei\n💳 **Malipo** - Njia za kulipa\n🔧 **Ukarabati** - Hali ya units\n📡 **IoT** - Ufuatiliaji wa wakati halisi\n\nUliza chochote!"
                : "Hello! 👋 I'm Cortex AI, your Smart Sanitation assistant. I can help you with:\n\n📅 **Bookings** - How to make reservations\n💰 **Pricing** - Unit types and rates\n💳 **Payments** - Payment methods\n🔧 **Maintenance** - Unit status and service\n📡 **IoT** - Real-time monitoring\n\nAsk me anything!";
        }

        // Store assistant response in session
        session.history.push({ role: 'assistant', message: reply, timestamp: new Date() });

        // Clean up old sessions (keep last 100)
        if (sessions.size > 100) {
            const oldestKey = sessions.keys().next().value;
            sessions.delete(oldestKey);
        }

        return reply;
    } catch (error) {
        logger.error('Assistant error:', error);
        return locale === 'sw'
            ? 'Samahani, nimekutana na tatizo. Tafadhali jaribu tena.'
            : 'Sorry, I encountered an error. Please try again.';
    }
}

module.exports = {
    handleAssistantMessage
};
