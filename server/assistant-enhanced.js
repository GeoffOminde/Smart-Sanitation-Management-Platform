// Enhanced Context-Aware AI Assistant - CLEAN FORMATTING VERSION
// Properly handles topic changes and prevents context mixing
// Improved spacing and readability

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store conversation contexts (in production, use Redis)
const conversationContexts = new Map();

async function handleAssistantMessage(message, locale = 'en', sessionId = 'default') {
    const lowerMsg = message.toLowerCase();
    let reply = '';
    let context = conversationContexts.get(sessionId) || {
        lastTopic: null,
        lastUnit: null,
        lastData: null,
        timestamp: Date.now()
    };

    // Extract unit ID from message (e.g., UNIT-002, unit 002, unit-002)
    const unitMatch = lowerMsg.match(/unit[-\s]?(\d{3})/);
    const unitId = unitMatch ? unitMatch[1] : null;

    // Detect if user is changing topics (clear unit context)
    const topicChangeKeywords = ['book', 'order', 'reserve', 'rent', 'monitor', 'price', 'cost', 'payment', 'hello', 'hi', 'help'];
    const isChangingTopic = topicChangeKeywords.some(keyword => lowerMsg.includes(keyword));

    // Only use unit context if explicitly asking about a unit OR using pronouns AND still on unit topic
    const isUnitQuery = unitId || lowerMsg.match(/unit[-\s]?\d+/);
    const isPronounReference = (lowerMsg.includes('it') || lowerMsg.includes('this') || lowerMsg.includes('that')) &&
        !isChangingTopic &&
        context.lastTopic === 'unit';

    // Clear unit context if changing topics
    if (isChangingTopic && !isUnitQuery) {
        context.lastUnit = null;
        context.lastTopic = null;
        context.lastData = null;
    }

    // --- SPECIFIC UNIT QUERY ---
    if (isUnitQuery || isPronounReference) {
        const targetUnitId = unitId || context.lastUnit;

        if (!targetUnitId) {
            // No unit context available
            reply = locale === 'sw'
                ? `❌ Samahani, sijui unit gani unazungumzia.\n\nTafadhali taja jina la unit (mfano: "UNIT-002").`
                : `❌ Sorry, I don't know which unit you're referring to.\n\nPlease specify a unit name (e.g., "UNIT-002").`;
        } else {
            const unit = await prisma.unit.findFirst({
                where: {
                    OR: [
                        { serialNo: { contains: targetUnitId } },
                        { id: targetUnitId }
                    ]
                }
            });

            if (unit) {
                context.lastUnit = unit.serialNo;
                context.lastTopic = 'unit';
                context.lastData = unit;

                // Determine what specific info they want
                if (lowerMsg.includes('location') || lowerMsg.includes('where')) {
                    reply = locale === 'sw'
                        ? `📍 **${unit.serialNo}** - Mahali\n\n` +
                        `**Eneo**: ${unit.location}\n` +
                        `**Coordinates**: ${unit.coordinates || 'Hazijapatikana'}\n\n` +
                        `────────────────\n\n` +
                        `Uliza zaidi kuhusu:\n• Hali\n• Ukarabati\n• Matumizi`
                        : `📍 **${unit.serialNo}** - Location\n\n` +
                        `**Area**: ${unit.location}\n` +
                        `**Coordinates**: ${unit.coordinates || 'Not available'}\n\n` +
                        `────────────────\n\n` +
                        `Ask me about:\n• Status\n• Maintenance\n• Usage`;
                }
                else if (lowerMsg.includes('status') || lowerMsg.includes('condition') || lowerMsg.includes('how') || lowerMsg.includes('doing')) {
                    const statusEmoji = unit.status === 'active' ? '✅' : unit.status === 'maintenance' ? '🔧' : '⚠️';
                    const fillStatus = unit.fillLevel > 80 ? '🔴 High' : unit.fillLevel > 50 ? '🟡 Medium' : '🟢 Low';
                    const batteryStatus = unit.batteryLevel > 70 ? '🔋 Good' : unit.batteryLevel > 30 ? '⚡ Medium' : '🪫 Low';

                    reply = locale === 'sw'
                        ? `${statusEmoji} **${unit.serialNo}** - Ripoti ya Hali\n\n` +
                        `**📊 Hali**: ${unit.status === 'active' ? 'Inafanya kazi' : unit.status === 'maintenance' ? 'Ukarabati' : 'Offline'}\n\n` +
                        `**Viwango**\n` +
                        `• 💧 Kujaa: ${unit.fillLevel}% (${fillStatus})\n` +
                        `• 🔋 Betri: ${unit.batteryLevel}% (${batteryStatus})\n` +
                        `• 🌡️ Joto: ${unit.temperature || 'N/A'}°C\n` +
                        `• 💨 Unyevu: ${unit.humidity || 'N/A'}%\n` +
                        `• 👃 Harufu: ${unit.odorLevel || 'N/A'}/100\n\n` +
                        `**📍 Mahali**: ${unit.location}\n` +
                        `**🕐 Mwisho kuonekana**: ${unit.lastSeen ? new Date(unit.lastSeen).toLocaleString() : 'Hazijapatikana'}\n\n` +
                        `────────────────\n\n` +
                        `Uliza zaidi kuhusu mahali, ukarabati, au matumizi!`
                        : `${statusEmoji} **${unit.serialNo}** - Status Report\n\n` +
                        `**📊 Status**: ${unit.status === 'active' ? 'Active' : unit.status === 'maintenance' ? 'Under Maintenance' : 'Offline'}\n\n` +
                        `**Metrics**\n` +
                        `• 💧 Fill Level: ${unit.fillLevel}% (${fillStatus})\n` +
                        `• 🔋 Battery: ${unit.batteryLevel}% (${batteryStatus})\n` +
                        `• 🌡️ Temperature: ${unit.temperature || 'N/A'}°C\n` +
                        `• 💨 Humidity: ${unit.humidity || 'N/A'}%\n` +
                        `• 👃 Odor Level: ${unit.odorLevel || 'N/A'}/100\n\n` +
                        `**📍 Location**: ${unit.location}\n` +
                        `**🕐 Last Seen**: ${unit.lastSeen ? new Date(unit.lastSeen).toLocaleString() : 'Not available'}\n\n` +
                        `────────────────\n\n` +
                        `Ask me about location, maintenance, or usage!`;
                }
                else if (lowerMsg.includes('maintenance') || lowerMsg.includes('service') || lowerMsg.includes('repair') || lowerMsg.includes('history')) {
                    const maintenanceLogs = await prisma.maintenanceLog.findMany({
                        where: { unitId: unit.id },
                        orderBy: { scheduledDate: 'desc' },
                        take: 3
                    });

                    if (maintenanceLogs.length > 0) {
                        const logList = maintenanceLogs.map(log =>
                            `• ${new Date(log.scheduledDate).toLocaleDateString()}: ${log.description} (${log.status})`
                        ).join('\n');

                        reply = locale === 'sw'
                            ? `🔧 **${unit.serialNo}** - Historia ya Ukarabati\n\n${logList}\n\n────────────────\n\nJe, unahitaji kuona zaidi?`
                            : `🔧 **${unit.serialNo}** - Maintenance History\n\n${logList}\n\n────────────────\n\nWant to see more details?`;
                    } else {
                        reply = locale === 'sw'
                            ? `✅ **${unit.serialNo}**\n\nHaijapata ukarabati bado. Hali nzuri!`
                            : `✅ **${unit.serialNo}**\n\nNo maintenance records yet. All good!`;
                    }
                }
                else if (lowerMsg.includes('usage') || lowerMsg.includes('count') || lowerMsg.includes('used')) {
                    reply = locale === 'sw'
                        ? `📊 **${unit.serialNo}** - Matumizi\n\n` +
                        `• 🔢 Idadi ya matumizi: **${unit.usageCount || 0}** mara\n` +
                        `• 💧 Kujaa sasa: **${unit.fillLevel}%**\n` +
                        `• 📅 Mwisho kuonekana: ${unit.lastSeen ? new Date(unit.lastSeen).toLocaleString() : 'Hazijapatikana'}`
                        : `📊 **${unit.serialNo}** - Usage Statistics\n\n` +
                        `• 🔢 Usage Count: **${unit.usageCount || 0}** times\n` +
                        `• 💧 Current Fill: **${unit.fillLevel}%**\n` +
                        `• 📅 Last Seen: ${unit.lastSeen ? new Date(unit.lastSeen).toLocaleString() : 'Not available'}`;
                }
                else {
                    // General info about the unit
                    reply = locale === 'sw'
                        ? `ℹ️ **${unit.serialNo}** - Maelezo\n\n` +
                        `• 📊 Hali: **${unit.status}**\n` +
                        `• 📍 Mahali: **${unit.location}**\n` +
                        `• 💧 Kujaa: **${unit.fillLevel}%**\n` +
                        `• 🔋 Betri: **${unit.batteryLevel}%**\n\n` +
                        `────────────────\n\n` +
                        `Uliza kuhusu:\n• Hali\n• Mahali\n• Ukarabati\n• Matumizi`
                        : `ℹ️ **${unit.serialNo}** - Overview\n\n` +
                        `• 📊 Status: **${unit.status}**\n` +
                        `• 📍 Location: **${unit.location}**\n` +
                        `• 💧 Fill: **${unit.fillLevel}%**\n` +
                        `• 🔋 Battery: **${unit.batteryLevel}%**\n\n` +
                        `────────────────\n\n` +
                        `Ask me about:\n• Status\n• Location\n• Maintenance\n• Usage`;
                }
            } else {
                reply = locale === 'sw'
                    ? `❌ Samahani, sikuweza kupata unit "${targetUnitId}".\n\nJe, una uhakika wa namba?`
                    : `❌ Sorry, I couldn't find unit "${targetUnitId}".\n\nAre you sure about the ID?`;
                // Clear context if unit not found
                context.lastUnit = null;
                context.lastTopic = null;
                context.lastData = null;
            }
        }
    }

    // --- REAL-TIME MONITORING QUERY ---
    else if (lowerMsg.includes('monitor') || lowerMsg.includes('real-time') || lowerMsg.includes('real time') || lowerMsg.includes('track') || lowerMsg.includes('live') || lowerMsg.includes('show units')) {
        context.lastTopic = 'monitoring';
        context.lastUnit = null; // Clear unit context

        const units = await prisma.unit.findMany({
            where: { status: 'active' },
            orderBy: { lastSeen: 'desc' },
            take: 10
        });

        const criticalUnits = units.filter(u => u.fillLevel > 80 || u.batteryLevel < 30);
        const healthyUnits = units.filter(u => u.fillLevel <= 80 && u.batteryLevel >= 30);

        reply = locale === 'sw'
            ? `📡 **Ufuatiliaji wa Wakati Halisi**\n\n` +
            `✅ Units ${healthyUnits.length} ziko sawa\n` +
            `⚠️ Units ${criticalUnits.length} zinahitaji usimamizi\n\n` +
            (criticalUnits.length > 0
                ? `**Zinahitaji Usimamizi**\n${criticalUnits.map(u => `• ${u.serialNo}: ${u.location}\n  Kujaa: ${u.fillLevel}%, Betri: ${u.batteryLevel}%`).join('\n\n')}\n\n`
                : '') +
            `────────────────\n\n` +
            `Uliza kuhusu unit yoyote kwa jina lake\n(mfano: "niambie kuhusu UNIT-002")`
            : `📡 **Real-Time Monitoring**\n\n` +
            `✅ ${healthyUnits.length} units are healthy\n` +
            `⚠️ ${criticalUnits.length} units need attention\n\n` +
            (criticalUnits.length > 0
                ? `**Needs Attention**\n${criticalUnits.map(u => `• ${u.serialNo}: ${u.location}\n  Fill: ${u.fillLevel}%, Battery: ${u.batteryLevel}%`).join('\n\n')}\n\n`
                : '') +
            `────────────────\n\n` +
            `Ask me about any specific unit\n(e.g., "tell me about UNIT-002")`;
    }

    // --- BOOKING QUERY ---
    else if (lowerMsg.includes('book') || lowerMsg.includes('order') || lowerMsg.includes('reserve') || lowerMsg.includes('rent')) {
        context.lastTopic = 'booking';
        context.lastUnit = null; // Clear unit context

        const pendingBookings = await prisma.booking.count({ where: { status: 'pending' } });
        const confirmedBookings = await prisma.booking.count({ where: { status: 'confirmed' } });
        const availableUnits = await prisma.unit.count({ where: { status: 'active' } });

        reply = locale === 'sw'
            ? `📊 **Hali ya Oda**\n\n` +
            `• ⏳ Zinazosubiri: **${pendingBookings}**\n` +
            `• ✅ Zimethibitishwa: **${confirmedBookings}**\n` +
            `• 🚽 Units zinazopatikana: **${availableUnits}**\n\n` +
            `────────────────\n\n` +
            `Uliza "jinsi ya kuweka oda" kwa maelezo zaidi!`
            : `📊 **Booking Status**\n\n` +
            `• ⏳ Pending: **${pendingBookings}**\n` +
            `• ✅ Confirmed: **${confirmedBookings}**\n` +
            `• 🚽 Available units: **${availableUnits}**\n\n` +
            `────────────────\n\n` +
            `Ask "how to book" for more details!`;
    }

    // --- DEFAULT / GREETING ---
    else {
        context.lastTopic = null;
        context.lastUnit = null; // Clear unit context

        reply = locale === 'sw'
            ? `👋 **Habari! Mimi ni Cortex AI**\n\n` +
            `Naweza kukusaidia na:\n\n` +
            `• 📡 **Ufuatiliaji** - "Onyesha units za wakati halisi"\n` +
            `• 🚽 **Units** - "Niambie kuhusu UNIT-002"\n` +
            `• 📅 **Oda** - "Hali ya oda"\n` +
            `• 💰 **Bei** - "Bei za units"\n\n` +
            `────────────────\n\n` +
            `Uliza chochote! Naweza kuzungumza kuhusu units fulani!`
            : `👋 **Hello! I'm Cortex AI**\n\n` +
            `I can help you with:\n\n` +
            `• 📡 **Monitoring** - "Show real-time units"\n` +
            `• 🚽 **Units** - "Tell me about UNIT-002"\n` +
            `• 📅 **Bookings** - "Booking status"\n` +
            `• 💰 **Pricing** - "Unit prices"\n\n` +
            `────────────────\n\n` +
            `Ask me anything! I can discuss specific units!`;
    }

    // Save context
    context.timestamp = Date.now();
    conversationContexts.set(sessionId, context);

    // Clean up old contexts (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, value] of conversationContexts.entries()) {
        if (value.timestamp && value.timestamp < oneHourAgo) {
            conversationContexts.delete(key);
        }
    }

    return reply;
}

module.exports = { handleAssistantMessage };
