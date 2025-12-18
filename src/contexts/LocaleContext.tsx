import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'sw';

type TranslationKey =
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.quickActions'
  | 'dashboard.overviewTab'
  | 'dashboard.fleetMap'
  | 'dashboard.routesTab'
  | 'dashboard.bookingsTab'
  | 'dashboard.maintenanceTab'
  | 'dashboard.analyticsTab'
  | 'dashboard.unitsTab'
  | 'dashboard.insightsTab'
  | 'dashboard.paymentsTab'
  | 'dashboard.settingsTab'
  | 'dashboard.alertHeading'
  | 'dashboard.alertDescription'
  | 'dashboard.localeLabel'
  | 'dashboard.topRisks'
  | 'dashboard.predictions'
  | 'dashboard.liveAlerts'
  | 'dashboard.urgentAlerts'
  | 'dashboard.fleetStatus'
  | 'dashboard.generateReport'
  | 'dashboard.generating'
  | 'payments.heading'
  | 'payments.description'
  | 'payments.providersTitle'
  | 'payments.provider.mpesa'
  | 'payments.provider.paystack'
  | 'payments.provider.airtel'
  | 'payments.provider.paypal'
  | 'insights.heading'
  | 'insights.weather'
  | 'insights.ai'
  | 'value.title'
  | 'value.subtitle'
  | 'value.pickups'
  | 'value.miles'
  | 'value.savings'
  | 'value.uptime'
  | 'value.performance'
  | 'value.cohorts'
  | 'value.engagement'
  | 'dashboard.welcome'
  | 'dashboard.systemStatus'
  | 'dashboard.telemetry'
  | 'dashboard.newBooking'
  | 'dashboard.dispatchRoute'
  | 'dashboard.totalFleet'
  | 'dashboard.utilization'
  | 'dashboard.activeRoutes'
  | 'dashboard.onRoad'
  | 'dashboard.dailyRevenue'
  | 'routes.title'
  | 'routes.optimize'
  | 'routes.new'
  | 'routes.depot'
  | 'routes.priority'
  | 'routes.timeWindow'
  | 'routes.optimizationComplete'
  | 'routes.savings'
  | 'routes.applyOrder'
  | 'routes.totalDistance'
  | 'routes.table.technician'
  | 'routes.table.techId'
  | 'routes.table.status'
  | 'routes.table.priority'
  | 'routes.table.eta'
  | 'routes.table.actions'
  | 'routes.modal.edit'
  | 'routes.modal.new'
  | 'routes.modal.subtitle'
  | 'common.edit'
  | 'common.delete'
  | 'common.cancel'
  | 'common.save'
  | 'bookings.title'
  | 'bookings.search'
  | 'bookings.new'
  | 'bookings.table.customer'
  | 'bookings.table.unit'
  | 'bookings.table.date'
  | 'bookings.table.duration'
  | 'bookings.table.amount'
  | 'bookings.table.payment'
  | 'bookings.modal.title.edit'
  | 'bookings.modal.title.new'
  | 'bookings.modal.subtitle'
  | 'bookings.modal.customerName'
  | 'bookings.modal.assignTech'
  | 'bookings.modal.targetUnit'
  | 'bookings.modal.startDate'
  | 'bookings.modal.duration'
  | 'bookings.modal.amount'
  | 'bookings.modal.bookingStatus'
  | 'bookings.modal.paymentStatus'
  | 'bookings.modal.unassigned'
  | 'bookings.smart.title'
  | 'bookings.smart.date'
  | 'bookings.smart.location'
  | 'bookings.smart.units'
  | 'bookings.smart.duration'
  | 'bookings.smart.capacity'
  | 'bookings.smart.suggestButton'
  | 'settings.profile.title'
  | 'settings.profile.subtitle'
  | 'settings.profile.name'
  | 'settings.profile.email'
  | 'settings.profile.phone'
  | 'settings.profile.license'
  | 'settings.save.button'
  | 'settings.save.saving'
  | 'settings.save.success'
  | 'settings.security.title'
  | 'settings.security.editProfile'
  | 'settings.security.changePassword'
  | 'settings.connected.title'
  | 'settings.data.title'
  | 'settings.data.privacy'
  | 'settings.data.optIn'
  | 'settings.data.export'
  | 'settings.system.title'
  | 'settings.system.whatsapp'
  | 'settings.team.title'
  | 'settings.team.subtitle'
  | 'settings.team.search'
  | 'settings.team.add'
  | 'settings.team.noMembers'
  | 'settings.team.modal.edit'
  | 'settings.team.modal.addTitle'
  | 'settings.team.modal.editDesc'
  | 'settings.team.modal.addDesc'
  | 'settings.team.modal.name'
  | 'settings.team.modal.role'
  | 'settings.team.modal.email'
  | 'settings.team.modal.phone'
  | 'settings.team.modal.status'
  | 'settings.team.modal.update'
  | 'settings.team.modal.addBtn'
  | 'admin.transactions.title'
  | 'admin.transactions.subtitle'
  | 'admin.transactions.seed'
  | 'admin.transactions.processing'
  | 'admin.transactions.registry'
  | 'admin.transactions.records'
  | 'admin.transactions.loading'
  | 'admin.transactions.empty'
  | 'admin.table.provider'
  | 'admin.table.user'
  | 'admin.table.amount'
  | 'admin.table.status'
  | 'admin.table.date'
  | 'admin.table.actions'
  | 'profile.edit'
  | 'profile.changePassword'
  | 'profile.contactDetails'
  | 'profile.systemPreferences'
  | 'profile.email'
  | 'profile.phone'
  | 'profile.role'
  | 'profile.theme'
  | 'profile.language'
  | 'profile.currency'
  | 'profile.notifications'
  | 'profile.footer'
  | 'value.revenueTrend'
  | 'value.cohortsSubtitle'
  | 'value.engagementSubtitle'
  | 'value.table.cohort'
  | 'value.table.day7'
  | 'value.table.day30'
  | 'value.table.day90'
  | 'value.metric.time'
  | 'value.metric.activeRatio'
  | 'value.metric.stickiness'
  | 'value.vsLastMonth'
  | 'cortex.alerts.priority'
  | 'cortex.alerts.charge'
  | 'cortex.alerts.surge'
  | 'cortex.alerts.none'
  | 'cortex.forecast.deploy'
  | 'cortex.forecast.sufficient'
  | 'cortex.forecast.horizon.multi'
  | 'cortex.forecast.horizon.today'
  | 'cortex.risk.label'
  | 'dashboard.alerts.normalOperations'
  | 'dashboard.fleet.location'
  | 'dashboard.fleet.fill'
  | 'dashboard.fleet.battery'
  | 'dashboard.revenue.vsYesterday'
  | 'dashboard.revenue.currency'
  | 'dashboard.alerts.none'
  | 'dashboard.alerts.assignRoute'
  | 'dashboard.alerts.scheduleMaintenance'
  | 'dashboard.alerts.requiresServicing'
  | 'dashboard.alerts.lowBattery'
  | 'dashboard.alerts.fillLevel'
  | 'dashboard.alerts.batteryLevel'
  | 'dashboard.alerts.location'
  | 'dashboard.alerts.lastSeen'
  | 'dashboard.maintenanceCard.title'
  | 'dashboard.maintenanceCard.units'
  | 'dashboard.maintenanceCard.viewCritical'
  | 'dashboard.maintenanceCard.allOperational'
  | 'dashboard.liveFleet.title'
  | 'dashboard.liveFleet.viewFull'
  | 'cortex.title'
  | 'cortex.mode'
  | 'cortex.forecast.title'
  | 'cortex.forecast.desc'
  | 'cortex.risk.title'
  | 'cortex.risk.empty'
  | 'common.refresh'
  | 'common.all'
  | 'bookings.status.confirmed'
  | 'bookings.status.pending'
  | 'bookings.status.cancelled'
  | 'bookings.paymentStatus.paid'
  | 'bookings.paymentStatus.pending'
  | 'bookings.paymentStatus.failed'
  | 'bookings.smart.suggested'
  | 'bookings.smart.utilization'
  | 'bookings.smart.apply'
  | 'bookings.smart.alternatives'
  | 'bookings.smart.use'
  | 'bookings.duration.format'
  | 'routes.opt.priority.fillLevel'
  | 'routes.opt.priority.distance'
  | 'routes.opt.priority.customer'
  | 'routes.opt.time.morning'
  | 'routes.opt.time.afternoon'
  | 'routes.opt.time.fullDay'
  | 'routes.modal.technicianLabel'
  | 'routes.modal.selectTech'
  | 'routes.modal.unitsLabel'
  | 'routes.modal.unitsPlaceholder'
  | 'routes.status.active'
  | 'routes.status.pending'
  | 'routes.status.completed'
  | 'routes.priority.high'
  | 'routes.priority.medium'
  | 'routes.priority.low'
  | 'map.role.driver'
  | 'map.role.technician'
  | 'map.status.active'
  | 'map.status.offline'
  | 'map.status.busy'
  | 'common.unknown'
  | 'maintenance.placeholder.techId'
  | 'maintenance.placeholder.unitSerial'
  | 'maintenance.placeholder.unitLocation'
  | 'settings.integrations.mpesa'
  | 'settings.integrations.whatsapp'
  | 'settings.integrations.weather'
  | 'settings.integrations.status.active'
  | 'settings.integrations.status.providing'
  | 'settings.integrations.sync.live'
  | 'settings.security.editDesc'
  | 'settings.security.changeDesc'
  | 'settings.data.intro'
  | 'settings.data.disclaimer'
  | 'settings.data.allowAnalysis'
  | 'settings.system.updates'
  | 'maintenance.stats.scheduled'
  | 'maintenance.stats.scheduledDesc'
  | 'maintenance.stats.completed'
  | 'maintenance.stats.completedDesc'
  | 'maintenance.stats.critical'
  | 'maintenance.stats.criticalDesc'
  | 'maintenance.form.title'
  | 'maintenance.form.targetUnit'
  | 'maintenance.form.newUnit'
  | 'maintenance.form.selectUnit'
  | 'maintenance.form.type'
  | 'maintenance.form.type.routine'
  | 'maintenance.form.type.repair'
  | 'maintenance.form.type.cleaning'
  | 'maintenance.form.type.emergency'
  | 'maintenance.form.description'
  | 'maintenance.form.descriptionPlaceholder'
  | 'maintenance.form.date'
  | 'maintenance.form.technicianId'
  | 'maintenance.form.submit'
  | 'maintenance.logs.title'
  | 'maintenance.logs.subtitle'
  | 'maintenance.logs.filter.all'
  | 'maintenance.logs.filter.scheduled'
  | 'maintenance.logs.filter.completed'
  | 'maintenance.logs.newTask'
  | 'maintenance.table.status'
  | 'maintenance.table.unitDetails'
  | 'maintenance.table.type'
  | 'maintenance.table.description'
  | 'maintenance.table.date'
  | 'maintenance.table.technician'
  | 'maintenance.table.actions'
  | 'maintenance.table.loading'
  | 'maintenance.table.empty'
  | 'maintenance.status.completed'
  | 'maintenance.status.scheduled'
  | 'maintenance.modal.addUnit.title'
  | 'maintenance.modal.addUnit.serial'
  | 'maintenance.modal.addUnit.location'
  | 'maintenance.modal.addUnit.submit'
  | 'analytics.loading'
  | 'analytics.error'
  | 'analytics.revenue.title'
  | 'analytics.revenue.desc'
  | 'analytics.revenue.chartTitle'
  | 'analytics.revenue.last6Months'
  | 'analytics.bookings.title'
  | 'analytics.bookings.desc'
  | 'analytics.bookings.chartTitle'
  | 'analytics.bookings.realTime'
  | 'analytics.tasks.title'
  | 'analytics.tasks.desc'
  | 'analytics.growth.title'
  | 'analytics.growth.desc'
  | 'analytics.maintenance.chartTitle'
  | 'analytics.label.confirmed'
  | 'analytics.label.pending'
  | 'analytics.label.cancelled'
  | 'analytics.label.completed'
  | 'billing.title'
  | 'billing.subtitle'
  | 'billing.refresh'
  | 'billing.upgrade'
  | 'billing.activeSub'
  | 'billing.plan'
  | 'billing.perMonth'
  | 'billing.nextBill'
  | 'billing.makePayment'
  | 'billing.paymentMethodDesc'
  | 'billing.card'
  | 'billing.usage.title'
  | 'billing.usage.subtitle'
  | 'billing.usage.mapLoads'
  | 'billing.usage.payment'
  | 'billing.usage.sms'
  | 'billing.usage.ai'
  | 'billing.usage.used'
  | 'billing.tx.title'
  | 'billing.tx.subtitle'
  | 'billing.tx.empty'
  | 'billing.upgradeModal.title'
  | 'billing.upgradeModal.popular'
  | 'billing.btn.current'
  | 'billing.btn.contact'
  | 'billing.btn.choose'
  | 'billing.plan.starter.name'
  | 'billing.plan.starter.desc'
  | 'billing.plan.starter.limit'
  | 'billing.plan.growth.name'
  | 'billing.plan.growth.desc'
  | 'billing.plan.growth.limit'
  | 'billing.plan.enterprise.name'
  | 'billing.plan.enterprise.desc'
  | 'billing.plan.enterprise.limit'
  | 'billing.feat.5veh'
  | 'billing.feat.basicRoute'
  | 'billing.feat.stdSupport'
  | 'billing.feat.20veh'
  | 'billing.feat.aiRoutes'
  | 'billing.feat.prioSupport'
  | 'billing.feat.apiAccess'
  | 'billing.feat.unlimVeh'
  | 'billing.feat.whiteLabel'
  | 'billing.feat.dedManager'
  | 'billing.feat.onPrem'
  | 'assistant.welcome'
  | 'assistant.placeholder'
  | 'assistant.title'
  | 'assistant.live'
  | 'assistant.footer'
  | 'assistant.error'
  | 'insights.header.title'
  | 'insights.header.subtitle'
  | 'insights.weather.title'
  | 'insights.weather.placeholder'
  | 'insights.weather.refresh'
  | 'insights.weather.temp'
  | 'insights.weather.humidity'
  | 'insights.weather.wind'
  | 'insights.weather.condition'
  | 'insights.weather.ms'
  | 'insights.weather.empty'
  | 'insights.pm.title'
  | 'insights.pm.subtitle'
  | 'insights.pm.run'
  | 'insights.pm.loading'
  | 'insights.pm.score'
  | 'insights.pm.moreUnits'
  | 'insights.pm.empty'
  | 'insights.route.title'
  | 'insights.route.optimize'
  | 'insights.route.loading'
  | 'insights.forecast.run'
  | 'insights.forecast.loading'
  | 'insights.route.resultTitle'
  | 'insights.route.tag'
  | 'insights.route.distance'
  | 'insights.route.duration'
  | 'insights.route.stops'
  | 'insights.route.fuel'
  | 'insights.route.path'
  | 'insights.route.more'
  | 'insights.route.empty'
  | 'insights.forecast.title'
  | 'insights.forecast.tag'
  | 'insights.forecast.utilization'
  | 'insights.forecast.avgJobs'
  | 'insights.forecast.peakAlert'
  | 'insights.forecast.peakDesc'
  | 'insights.forecast.empty'
  | 'map.unit.fillLevel'
  | 'map.unit.status.critical'
  | 'map.unit.status.normal'
  | 'map.truck.id'
  | 'map.truck.role'
  | 'map.truck.status'
  | 'map.legend.technicians'
  | 'map.legend.units'
  | 'auth.login.welcome'
  | 'auth.login.subtitle'
  | 'auth.login.emailLabel'
  | 'auth.login.emailPlaceholder'
  | 'auth.login.passwordLabel'
  | 'auth.login.passwordPlaceholder'
  | 'auth.login.forgotPassword'
  | 'auth.login.submit'
  | 'auth.login.noAccount'
  | 'auth.login.createAccount'
  | 'auth.error.connection'
  | 'auth.error.invalid'
  | 'billing.notes.errorTitle'
  | 'billing.notes.infoTitle'
  | 'billing.notes.subInitFail'
  | 'billing.notes.subStartFail'
  | 'billing.notes.enterpriseInfo'
  | 'nav.overview'
  | 'nav.value'
  | 'nav.assistant'
  | 'nav.notifications'
  | 'nav.markRead'
  | 'nav.clear'
  | 'nav.noNotifications'
  | 'nav.profile'
  | 'nav.adminTransactions'
  | 'nav.logout'
  | 'nav.user.role'
  | 'bookings.subtitle'
  | 'bookings.stats.total'
  | 'bookings.stats.confirmed'
  | 'bookings.stats.pending'
  | 'bookings.stats.paid'
  | 'units.iot.title'
  | 'units.iot.temperature'
  | 'units.iot.humidity'
  | 'units.iot.odorLevel'
  | 'units.iot.usageCount'
  | 'units.iot.lastService'
  | 'units.iot.notServiced'
  | 'units.editable.title'
  | 'units.editable.location'
  | 'units.editable.status'
  | 'units.editable.fillLevel'
  | 'units.editable.batteryLevel'
  | 'units.status.active'
  | 'units.status.maintenance'
  | 'units.status.offline'
  | 'routes.empty.title'
  | 'routes.empty.subtitle'
  | 'routes.empty.create'
  | 'routes.stats.total'
  | 'routes.stats.active'
  | 'routes.stats.pending'
  | 'routes.stats.completed'
  | 'routes.card.status'
  | 'routes.card.priority'
  | 'routes.card.units'
  | 'routes.card.eta'
  | 'routes.modal.estimatedTime'
  | 'routes.modal.estimatedTimePlaceholder'
  | 'routes.modal.statusLabel'
  | 'routes.modal.priorityLabel'
  | 'routes.modal.update'
  | 'routes.modal.create'
  | 'routes.priority.highLabel'
  | 'routes.priority.mediumLabel'
  | 'routes.priority.lowLabel'
  | 'settings.system.emailNotifications'
  | 'settings.system.emailDesc'
  | 'settings.system.sessionTimeout'
  | 'settings.system.timeout.5min'
  | 'settings.system.timeout.15min'
  | 'settings.system.timeout.30min'
  | 'settings.system.timeout.1hr'
  | 'settings.system.timeout.2hr'
  | 'settings.system.timeout.4hr'
  | 'settings.system.timeoutDesc'
  | 'settings.system.theme'
  | 'settings.system.themeLight'
  | 'settings.system.themeDark'
  | 'settings.system.currency'
  | 'settings.system.currencyKES'
  | 'settings.system.currencyUSD'
  | 'settings.system.currencyEUR'
  | 'settings.system.currencyGBP'
  | 'settings.system.currencyDesc'
  | 'settings.save.saved'
  | 'settings.save.saveSettings'
  | 'settings.team.joined'
  | 'settings.team.placeholders.name'
  | 'settings.team.placeholders.role'
  | 'settings.team.placeholders.email'
  | 'settings.team.placeholders.phone'
  | 'settings.team.status.active'
  | 'settings.team.status.inactive'
  | 'auth.signup.title'
  | 'auth.signup.subtitle'
  | 'auth.signup.usernameLabel'
  | 'auth.signup.usernamePlaceholder'
  | 'auth.signup.emailLabel'
  | 'auth.signup.emailPlaceholder'
  | 'auth.signup.passwordLabel'
  | 'auth.signup.passwordPlaceholder'
  | 'auth.signup.confirmLabel'
  | 'auth.signup.confirmPlaceholder'
  | 'auth.signup.submit'
  | 'auth.signup.submitting'
  | 'auth.signup.hasAccount'
  | 'auth.signup.signIn'
  | 'auth.signup.terms'
  | 'auth.signup.error.username'
  | 'auth.signup.error.email'
  | 'auth.signup.error.password'
  | 'auth.signup.error.passwordLength'
  | 'auth.signup.error.passwordMatch'
  | 'auth.signup.error.failed'
  | 'auth.signup.error.connection'
  | 'payment.mpesa.title'
  | 'payment.mpesa.subtitle'
  | 'payment.mpesa.phoneLabel'
  | 'payment.mpesa.phonePlaceholder'
  | 'payment.mpesa.amountLabel'
  | 'payment.mpesa.amountPlaceholder'
  | 'payment.mpesa.submit'
  | 'payment.mpesa.initiating'
  | 'payment.mpesa.success'
  | 'payment.mpesa.error.validation'
  | 'payment.mpesa.error.failed'
  | 'payment.mpesa.error.init'
  | 'payment.paystack.title'
  | 'payment.paystack.subtitle'
  | 'payment.paystack.emailLabel'
  | 'payment.paystack.emailPlaceholder'
  | 'payment.paystack.amountLabel'
  | 'payment.paystack.amountPlaceholder'
  | 'payment.paystack.submit'
  | 'payment.paystack.initializing'
  | 'payment.paystack.redirecting'
  | 'payment.paystack.error.validation'
  | 'payment.paystack.error.failed'
  | 'payment.paystack.error.noUrl'
  | 'payment.paystack.error.init';

const baseTranslations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'dashboard.title': 'Smart Sanitation Dashboard',
    'dashboard.subtitle': 'Manage your mobile toilets, routes, bookings, and teams in one place',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.overviewTab': 'Overview',
    'dashboard.fleetMap': 'Fleet Map',
    'dashboard.routesTab': 'Routes',
    'dashboard.bookingsTab': 'Bookings',
    'dashboard.maintenanceTab': 'Maintenance',
    'dashboard.analyticsTab': 'Analytics',
    'dashboard.unitsTab': 'Sanitation Units',
    'dashboard.insightsTab': 'AI Insights',
    'dashboard.paymentsTab': 'Payments',
    'dashboard.settingsTab': 'Settings',
    'dashboard.alertHeading': 'Demand Forecast & Alerts',
    'dashboard.alertDescription': 'AI heuristics warn when battery, fill levels, or demand thresholds need attention.',
    'dashboard.localeLabel': 'Display language',
    'dashboard.topRisks': 'Highest priority units',
    'dashboard.predictions': 'Predicted peak demand',
    'dashboard.liveAlerts': 'Live Alerts',
    'dashboard.urgentAlerts': 'Urgent Alerts',
    'dashboard.fleetStatus': 'Fleet Status',
    'dashboard.generateReport': 'Generate Full Report',
    'dashboard.generating': 'Generating Analysis...',
    'insights.heading': 'Insights',
    'insights.weather': 'Weather intelligence',
    'insights.ai': 'AI forecasts and alerts',
    'value.title': 'Value & ROI',
    'value.subtitle': 'Operational impact and financial performance',
    'value.pickups': 'Pickups Avoided',
    'value.miles': 'Miles Reduced',
    'value.savings': 'Savings',
    'value.uptime': 'Uptime SLA',
    'value.performance': 'Performance Over Time',
    'value.cohorts': 'Retention Cohorts',
    'value.engagement': 'User Engagement',
    'payments.heading': 'Payments',
    'payments.description': 'Collect payments, monitor transactions, and keep the pipelines live with regional providers.',
    'payments.providersTitle': 'Regional Payment Providers',
    'payments.provider.mpesa': 'M-Pesa: Widely used mobile money in Kenya and East Africa.',
    'payments.provider.paystack': 'Paystack: Reliable card and bank payments across Africa.',
    'payments.provider.airtel': 'Airtel Money: Backup mobile wallet for coverage gaps.',
    'payments.provider.paypal': 'PayPal: For international corporate settlements.',
    'dashboard.welcome': 'Welcome back, Administrator',
    'dashboard.systemStatus': 'System Online',
    'dashboard.telemetry': 'Real-time telemetry indicates optimal performance across the sanitation fleet. 98% operational uptime today.',
    'dashboard.newBooking': 'New Booking',
    'dashboard.dispatchRoute': 'Dispatch Route',
    'dashboard.totalFleet': 'Total Fleet',
    'dashboard.utilization': 'Utilization',
    'dashboard.activeRoutes': 'Active Routes',
    'dashboard.onRoad': 'On the road now',
    'dashboard.dailyRevenue': 'Daily Revenue',
    'routes.title': 'Routes',
    'routes.optimize': 'Optimize Routes',
    'routes.new': 'New Route',
    'routes.depot': 'Depot Location',
    'routes.priority': 'Priority',
    'routes.timeWindow': 'Time Window',
    'routes.optimizationComplete': 'AI Optimization Complete',
    'routes.savings': 'Estimated savings:',
    'routes.applyOrder': 'Apply Order',
    'routes.totalDistance': 'Total Distance:',
    'routes.table.technician': 'Technician',
    'routes.table.techId': 'Tech ID',
    'routes.table.status': 'Status',
    'routes.table.priority': 'Priority',
    'routes.table.eta': 'ETA',
    'routes.table.actions': 'Actions',
    'routes.modal.edit': 'Edit Route',
    'routes.modal.new': 'New Route',
    'routes.modal.subtitle': 'Dispatch or update service route details',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'bookings.title': 'Bookings Management',
    'bookings.search': 'Search bookings...',
    'bookings.new': 'New Booking',
    'bookings.table.customer': 'Customer',
    'bookings.table.unit': 'Unit',
    'bookings.table.date': 'Date',
    'bookings.table.duration': 'Duration',
    'bookings.table.amount': 'Amount',
    'bookings.table.payment': 'Payment',
    'bookings.modal.title.edit': 'Edit Booking',
    'bookings.modal.title.new': 'New Booking',
    'bookings.modal.subtitle': 'Manage reservation details and payment status',
    'bookings.modal.customerName': 'Customer Name',
    'bookings.modal.assignTech': 'Assign Technician',
    'bookings.modal.targetUnit': 'Target Unit',
    'bookings.modal.startDate': 'Start Date',
    'bookings.modal.duration': 'Duration',
    'bookings.modal.amount': 'Amount (KES)',
    'bookings.modal.bookingStatus': 'Booking Status',
    'bookings.modal.paymentStatus': 'Payment Status',
    'bookings.modal.unassigned': 'Unassigned',
    'bookings.smart.title': 'Smart Booking Intelligence',
    'bookings.smart.date': 'Target Date',
    'bookings.smart.location': 'Location',
    'bookings.smart.units': 'Unit Count',
    'bookings.smart.duration': 'Duration (Days)',
    'bookings.smart.capacity': 'Capacity / Day',
    'bookings.smart.suggestButton': 'Suggest',
    'settings.profile.title': 'Company Profile',
    'settings.profile.subtitle': 'Manage your business identity',
    'settings.profile.name': 'Company Name',
    'settings.profile.email': 'Contact Email',
    'settings.profile.phone': 'Phone Number',
    'settings.profile.license': 'Business License',
    'settings.save.button': 'Save Settings',
    'settings.save.saving': 'Saving...',
    'settings.save.success': 'Settings saved successfully!',
    'settings.security.title': 'Security & Access',
    'settings.security.editProfile': 'Edit Profile',
    'settings.security.changePassword': 'Change Password',
    'settings.connected.title': 'Connected Services',
    'settings.data.title': 'Data & AI Responsibility',
    'settings.data.privacy': 'Privacy Guarantee:',
    'settings.data.optIn': 'AI Optimization',
    'settings.data.export': 'Export My Data (GDPR)',
    'settings.system.title': 'System Preferences',
    'settings.system.whatsapp': 'WhatsApp Alerts',
    'settings.team.title': 'Team Management',
    'settings.team.subtitle': 'Manage access and roles',
    'settings.team.search': 'Search members...',
    'settings.team.add': 'Add Member',
    'settings.team.noMembers': 'No team members found.',
    'settings.team.modal.edit': 'Edit Team Member',
    'settings.team.modal.addTitle': 'Add Team Member',
    'settings.team.modal.editDesc': 'Update member information',
    'settings.team.modal.addDesc': 'Add a new member to your team',
    'settings.team.modal.name': 'Full Name',
    'settings.team.modal.role': 'Role',
    'settings.team.modal.email': 'Email',
    'settings.team.modal.phone': 'Phone',
    'settings.team.modal.status': 'Status',
    'settings.team.modal.update': 'Update',
    'settings.team.modal.addBtn': 'Add Member',
    'admin.transactions.title': 'Admin Transactions',
    'admin.transactions.subtitle': 'Full transaction ledger and debugging',
    'admin.transactions.seed': 'Seed Demo Transactions',
    'admin.transactions.processing': 'Processing...',
    'admin.transactions.registry': 'Transaction Registry',
    'admin.transactions.records': 'Records',
    'admin.transactions.loading': 'Loading registry...',
    'admin.transactions.empty': 'No transactions found in the system.',
    'admin.table.provider': 'Provider',
    'admin.table.user': 'User / Contact',
    'admin.table.amount': 'Amount',
    'admin.table.status': 'Status',
    'admin.table.date': 'Date',
    'admin.table.actions': 'Actions',
    'profile.edit': 'Edit Profile',
    'profile.changePassword': 'Change Password',
    'profile.contactDetails': 'Contact Details',
    'profile.systemPreferences': 'System Preferences',
    'profile.email': 'Email Address',
    'profile.phone': 'Phone Number',
    'profile.role': 'Work Role',
    'profile.theme': 'Theme',
    'profile.language': 'Language',
    'profile.currency': 'Currency',
    'profile.notifications': 'Notifications',
    'profile.footer': 'Need to update advanced settings? Go to Dashboard Settings',
    'value.revenueTrend': 'Revenue and efficiency trends correlation',
    'value.cohortsSubtitle': 'User return rates over time',
    'value.engagementSubtitle': 'Activity metrics overview',
    'value.table.cohort': 'Cohort',
    'value.table.day7': 'Day 7',
    'value.table.day30': 'Day 30',
    'value.table.day90': 'Day 90',
    'value.metric.time': 'On-Platform Time (Avg)',
    'value.metric.activeRatio': 'Active Units Ratio',
    'value.metric.stickiness': 'Stickiness Rate',
    'value.vsLastMonth': 'vs last month',
    'cortex.alerts.priority': 'Priority maintenance advised for {names} (risk {risk}%).',
    'cortex.alerts.charge': 'Charge {names} soon (battery < 25%).',
    'cortex.alerts.surge': 'Demand surge expected on {peakDay}. {suggestion}',
    'cortex.alerts.none': 'No alerts. System operating within expected thresholds.',
    'cortex.forecast.deploy': 'Deploy {gap} additional unit{plural} ahead of the {peakDay} peak {horizon}.',
    'cortex.forecast.sufficient': 'Current fleet should cover demand {horizon}.',
    'cortex.forecast.horizon.multi': 'over the next {days} days',
    'cortex.forecast.horizon.today': 'today',
    'cortex.risk.label': 'RISK',
    'dashboard.alerts.normalOperations': 'Normal operations',
    'dashboard.fleet.location': 'Location',
    'dashboard.fleet.fill': 'Fill',
    'dashboard.fleet.battery': 'Battery',
    'dashboard.revenue.vsYesterday': 'vs yesterday',
    'dashboard.revenue.currency': 'KES',
    'dashboard.alerts.none': 'No urgent alerts',
    'dashboard.alerts.assignRoute': 'Assign Route',
    'dashboard.alerts.scheduleMaintenance': 'Schedule Maintenance',
    'dashboard.alerts.requiresServicing': 'requires immediate servicing',
    'dashboard.alerts.lowBattery': 'Low battery alert for',
    'dashboard.alerts.fillLevel': 'Fill level',
    'dashboard.alerts.batteryLevel': 'Battery level',
    'dashboard.alerts.location': 'Location',
    'dashboard.alerts.lastSeen': 'Last seen',
    'dashboard.maintenanceCard.title': 'Maintenance',
    'dashboard.maintenanceCard.units': 'Units',
    'dashboard.maintenanceCard.viewCritical': 'View Critical Issues',
    'dashboard.maintenanceCard.allOperational': 'All systems operational',
    'dashboard.liveFleet.title': 'Live Fleet Activity',
    'dashboard.liveFleet.viewFull': 'View Full Map',
    'cortex.title': 'Cortex AI',
    'cortex.mode': 'Analysis Mode: ACTIVE',
    'cortex.forecast.title': 'Demand Forecast',
    'cortex.forecast.desc': 'Expected peak traffic day',
    'cortex.risk.title': 'Risk Assessment',
    'cortex.risk.empty': 'No critical anomalies.',
    'common.refresh': 'Refresh',
    'common.all': 'All',
    'bookings.status.confirmed': 'Confirmed',
    'bookings.status.pending': 'Pending',
    'bookings.status.cancelled': 'Cancelled',
    'bookings.paymentStatus.paid': 'Paid',
    'bookings.paymentStatus.pending': 'Pending',
    'bookings.paymentStatus.failed': 'Failed',
    'bookings.smart.suggested': 'Suggested',
    'bookings.smart.utilization': 'Utilization',
    'bookings.smart.apply': 'Apply to booking form',
    'bookings.smart.alternatives': 'Alternatives',
    'bookings.smart.use': 'Use',
    'bookings.duration.format': '{count} days',
    'routes.opt.priority.fillLevel': 'Fill Level Priority',
    'routes.opt.priority.distance': 'Distance Priority',
    'routes.opt.priority.customer': 'Customer Priority',
    'routes.opt.time.morning': 'Morning (6AM - 12PM)',
    'routes.opt.time.afternoon': 'Afternoon (12PM - 6PM)',
    'routes.opt.time.fullDay': 'Full Day (6AM - 6PM)',
    'routes.modal.technicianLabel': 'Technician',
    'routes.modal.selectTech': 'Select Technician',
    'routes.modal.unitsLabel': 'Number of Units',
    'routes.modal.unitsPlaceholder': 'e.g. 5',
    'routes.status.active': 'Active',
    'routes.status.pending': 'Pending',
    'routes.status.completed': 'Completed',
    'routes.priority.high': 'High',
    'routes.priority.medium': 'Medium',
    'routes.priority.low': 'Low',
    'map.role.driver': 'Driver',
    'map.role.technician': 'Technician',
    'map.status.active': 'Active',
    'map.status.offline': 'Offline',
    'map.status.busy': 'Busy',
    'common.unknown': 'Unknown',
    'maintenance.placeholder.techId': 'e.g. TECH-001',
    'maintenance.placeholder.unitSerial': 'e.g. ST-005',
    'maintenance.placeholder.unitLocation': 'e.g. Market St.',
    'settings.integrations.mpesa': 'M-Pesa Integration',
    'settings.integrations.whatsapp': 'WhatsApp Business',
    'settings.integrations.weather': 'OpenWeatherMap',
    'settings.integrations.status.active': 'Active',
    'settings.integrations.status.providing': 'Providing Data',
    'settings.integrations.sync.live': 'Live',
    'settings.security.editDesc': 'Update personal details',
    'settings.security.changeDesc': 'Update your security key',
    'settings.data.intro': 'This platform uses AI to optimize routes and forecast demand.',
    'settings.data.disclaimer': 'All personal data is anonymized before processing. We do not share customer identities with external AI models.',
    'settings.data.allowAnalysis': 'Allow anonymized fleet analysis',
    'settings.system.updates': 'Get real-time updates',
    'maintenance.stats.scheduled': 'Scheduled',
    'maintenance.stats.scheduledDesc': 'Jobs pending execution',
    'maintenance.stats.completed': 'Completed',
    'maintenance.stats.completedDesc': 'Successfully resolved',
    'maintenance.stats.critical': 'Critical',
    'maintenance.stats.criticalDesc': 'Require immediate attention',
    'maintenance.form.title': 'Schedule New Maintenance',
    'maintenance.form.targetUnit': 'Target Unit',
    'maintenance.form.newUnit': 'New Unit',
    'maintenance.form.selectUnit': 'Select Unit...',
    'maintenance.form.type': 'Maintenance Type',
    'maintenance.form.type.routine': 'Routine Check',
    'maintenance.form.type.repair': 'Repair',
    'maintenance.form.type.cleaning': 'Cleaning',
    'maintenance.form.type.emergency': 'Emergency',
    'maintenance.form.description': 'Describe the issue or task details...',
    'maintenance.form.descriptionPlaceholder': 'Describe the issue or task details...',
    'maintenance.form.date': 'Scheduled Date',
    'maintenance.form.technicianId': 'Technician ID',
    'maintenance.form.submit': 'Schedule Maintenance',
    'maintenance.logs.title': 'Maintenance Logs',
    'maintenance.logs.subtitle': 'History and active tasks',
    'maintenance.logs.filter.all': 'All',
    'maintenance.logs.filter.scheduled': 'Scheduled',
    'maintenance.logs.filter.completed': 'Completed',
    'maintenance.logs.newTask': 'New Task',
    'maintenance.table.status': 'Status',
    'maintenance.table.unitDetails': 'Unit Details',
    'maintenance.table.type': 'Type',
    'maintenance.table.description': 'Description',
    'maintenance.table.date': 'Date',
    'maintenance.table.technician': 'Technician',
    'maintenance.table.actions': 'Actions',
    'maintenance.table.loading': 'Loading logs...',
    'maintenance.table.empty': 'No maintenance logs found matching criteria.',
    'maintenance.status.completed': 'Completed',
    'maintenance.status.scheduled': 'Scheduled',
    'maintenance.modal.addUnit.title': 'Add New Unit',
    'maintenance.modal.addUnit.serial': 'Serial Number',
    'maintenance.modal.addUnit.location': 'Location / Area',
    'maintenance.modal.addUnit.submit': 'Add Unit',
    'analytics.loading': 'Loading analytics...',
    'analytics.error': 'Failed to load analytics data.',
    'analytics.revenue.title': 'Total Revenue',
    'analytics.revenue.desc': 'Net earnings this period',
    'analytics.revenue.chartTitle': 'Revenue Trend',
    'analytics.revenue.last6Months': 'Last 6 Months',
    'analytics.bookings.title': 'Total Bookings',
    'analytics.bookings.desc': '+15% vs last month',
    'analytics.bookings.chartTitle': 'Booking Status',
    'analytics.bookings.realTime': 'Real-time',
    'analytics.tasks.title': 'Pending Tasks',
    'analytics.tasks.desc': 'Maintenance jobs requiring attention',
    'analytics.growth.title': 'Growth',
    'analytics.growth.desc': 'Year-over-Year growth',
    'analytics.maintenance.chartTitle': 'Maintenance Distribution',
    'analytics.label.confirmed': 'Confirmed',
    'analytics.label.pending': 'Pending',
    'analytics.label.cancelled': 'Cancelled',
    'analytics.label.completed': 'Completed',
    'billing.title': 'Billing & Payments',
    'billing.subtitle': 'Manage subscriptions, make payments, and view history',
    'billing.refresh': 'Refresh History',
    'billing.upgrade': 'Upgrade Plan',
    'billing.activeSub': 'Active Subscription',
    'billing.plan': 'Plan',
    'billing.perMonth': '/mo',
    'billing.nextBill': 'Next bill:',
    'billing.makePayment': 'Make a Payment',
    'billing.paymentMethodDesc': 'Select your preferred payment method',
    'billing.card': 'Card',
    'billing.usage.title': 'Usage Costs',
    'billing.usage.subtitle': 'Metered API fees',
    'billing.usage.mapLoads': 'Map Loads',
    'billing.usage.payment': 'Payment Processing',
    'billing.usage.sms': 'SMS Notifications',
    'billing.usage.ai': 'AI Forecasts',
    'billing.usage.used': 'used',
    'billing.tx.title': 'Transactions',
    'billing.tx.subtitle': 'Recent payments & invoices',
    'billing.tx.empty': 'No transactions found',
    'billing.upgradeModal.title': 'Upgrade Your Plan',
    'billing.upgradeModal.popular': 'Most Popular',
    'billing.btn.current': 'Current Plan',
    'billing.btn.contact': 'Contact Sales',
    'billing.btn.choose': 'Choose',
    'billing.plan.starter.name': 'Starter',
    'billing.plan.starter.desc': 'Get started with basic tracking and essential fleet tools.',
    'billing.plan.starter.limit': 'Ideal for small fleets',
    'billing.plan.growth.name': 'Growth',
    'billing.plan.growth.desc': 'Includes advanced AI routing and API access for up to 20 vehicles.',
    'billing.plan.growth.limit': 'Best for growing companies',
    'billing.plan.enterprise.name': 'Enterprise',
    'billing.plan.enterprise.desc': 'Full-scale solution with dedicated support and unlimited capacity.',
    'billing.plan.enterprise.limit': 'For large organizations',
    'billing.feat.5veh': 'Up to 5 Vehicles',
    'billing.feat.basicRoute': 'Basic Route Planning',
    'billing.feat.stdSupport': 'Standard Support',
    'billing.feat.20veh': 'Up to 20 Vehicles',
    'billing.feat.aiRoutes': 'Advanced AI Routes',
    'billing.feat.prioSupport': 'Priority Support',
    'billing.feat.apiAccess': 'API Access',
    'billing.feat.unlimVeh': 'Unlimited Vehicles',
    'billing.feat.whiteLabel': 'White-labeling',
    'billing.feat.dedManager': 'Dedicated Account Manager',
    'billing.feat.onPrem': 'On-premise Deployment',
    'assistant.welcome': 'Hello! 👋 I can help with bookings, pricing, payments, or maintenance. How can I assist?',
    'assistant.placeholder': 'Ask Cortex AI...',
    'assistant.title': 'Cortex Assistant',
    'assistant.live': 'Live Support',
    'assistant.footer': 'Powered by Smart Sanitation Cognitive Engine',
    'assistant.error': 'Sorry, something went wrong.',
    'insights.header.title': 'AI & Insights',
    'insights.header.subtitle': 'Smart analytics powered by OpenWeather & Cortex AI',
    'insights.weather.title': 'Live Weather',
    'insights.weather.placeholder': 'Enter city',
    'insights.weather.refresh': 'Refresh',
    'insights.weather.temp': 'Temperature',
    'insights.weather.humidity': 'Humidity',
    'insights.weather.wind': 'Wind Speed',
    'insights.weather.condition': 'Condition',
    'insights.weather.ms': 'm/s',
    'insights.weather.empty': 'Enter a city to see live weather data.',
    'insights.pm.title': 'Predictive Maintenance',
    'insights.pm.subtitle': 'Risk assessment engine',
    'insights.pm.run': 'Run Analysis',
    'insights.pm.loading': 'Analyzing...',
    'insights.pm.score': 'Score',
    'insights.pm.moreUnits': 'and {count} more units...',
    'insights.pm.empty': 'Run analysis to see maintenance risks.',
    'insights.route.title': 'Route & Demand',
    'insights.route.optimize': 'Optimize Route',
    'insights.route.loading': 'Optimizing...',
    'insights.forecast.run': 'Forecast Demand',
    'insights.forecast.loading': 'Forecasting...',
    'insights.route.resultTitle': 'Route Optimization',
    'insights.route.tag': 'OPTIMIZED',
    'insights.route.distance': 'Total Distance',
    'insights.route.duration': 'Est. Duration',
    'insights.route.stops': 'Stops Optimized',
    'insights.route.fuel': 'Fuel Est.',
    'insights.route.path': 'Optimized Path',
    'insights.route.more': 'more',
    'insights.route.empty': 'No route calculated. Click "Optimize Route" to start.',
    'insights.forecast.title': 'Demand Forecast',
    'insights.forecast.tag': 'AI PREDICTION',
    'insights.forecast.utilization': 'Utilization',
    'insights.forecast.avgJobs': 'Avg. Daily Jobs',
    'insights.forecast.peakAlert': 'Peak Demand Alert',
    'insights.forecast.peakDesc': 'Expect high volume on {date}. Consider scheduling extra shift.',
    'insights.forecast.empty': 'No forecast data. Click "Forecast Demand" to analyze.',
    'map.unit.fillLevel': 'Fill Level',
    'map.unit.status.critical': 'Critical',
    'map.unit.status.normal': 'Normal',
    'map.truck.id': 'ID',
    'map.truck.role': 'Role',
    'map.truck.status': 'Status',
    'map.legend.technicians': 'Technicians',
    'map.legend.units': 'Units',
    'auth.login.welcome': 'Welcome Back',
    'auth.login.subtitle': 'Smart Sanitation Platform',
    'auth.login.emailLabel': 'Email Address',
    'auth.login.emailPlaceholder': 'Enter your email address',
    'auth.login.passwordLabel': 'Password',
    'auth.login.passwordPlaceholder': 'Enter password',
    'auth.login.forgotPassword': 'Forgot password?',
    'auth.login.submit': 'Sign In',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.createAccount': 'Create Account',
    'auth.error.connection': 'Connection error. Please try again.',
    'auth.error.invalid': 'Invalid credentials',
    'billing.notes.errorTitle': 'Error',
    'billing.notes.infoTitle': 'Info',
    'billing.notes.subInitFail': 'Failed to initiate subscription',
    'billing.notes.subStartFail': 'Failed to start subscription. Please try again.',
    'billing.notes.enterpriseInfo': 'Please contact sales@smartsanitation.co.ke for Enterprise pricing',
    'nav.overview': 'Overview',
    'nav.value': 'Value',
    'nav.assistant': 'Assistant',
    'nav.notifications': 'Notifications',
    'nav.markRead': 'Mark all read',
    'nav.clear': 'Clear',
    'nav.noNotifications': 'No new notifications',
    'nav.profile': 'Profile',
    'nav.adminTransactions': 'Admin Transactions',
    'nav.logout': 'Log out',
    'nav.user.role': 'Super Admin',
    'bookings.subtitle': 'Manage customer bookings and reservations',
    'bookings.stats.total': 'Total Bookings',
    'bookings.stats.confirmed': 'Confirmed',
    'bookings.stats.pending': 'Pending',
    'bookings.stats.paid': 'Paid',
    'units.iot.title': 'IoT Sensor Data',
    'units.iot.temperature': 'Temperature',
    'units.iot.humidity': 'Humidity',
    'units.iot.odorLevel': 'Odor Level',
    'units.iot.usageCount': 'Usage Count',
    'units.iot.lastService': 'Last Service',
    'units.iot.notServiced': 'Not serviced',
    'units.editable.title': 'Editable Properties',
    'units.editable.location': 'Location',
    'units.editable.status': 'Status',
    'units.editable.fillLevel': 'Fill Level (%)',
    'units.editable.batteryLevel': 'Battery Level (%)',
    'units.status.active': 'Active',
    'units.status.maintenance': 'Maintenance',
    'units.status.offline': 'Offline',
    'routes.empty.title': 'No routes yet',
    'routes.empty.subtitle': 'Create your first route to get started',
    'routes.empty.create': 'Create Route',
    'routes.stats.total': 'Total Routes',
    'routes.stats.active': 'Active',
    'routes.stats.pending': 'Pending',
    'routes.stats.completed': 'Completed',
    'routes.card.status': 'Status',
    'routes.card.priority': 'Priority',
    'routes.card.units': 'Units',
    'routes.card.eta': 'ETA',
    'routes.modal.estimatedTime': 'Estimated Time',
    'routes.modal.estimatedTimePlaceholder': 'e.g. 2.5 hrs',
    'routes.modal.statusLabel': 'Status',
    'routes.modal.priorityLabel': 'Priority',
    'routes.modal.update': 'Update Route',
    'routes.modal.create': 'Create Route',
    'routes.priority.highLabel': 'High Priority',
    'routes.priority.mediumLabel': 'Medium Priority',
    'routes.priority.lowLabel': 'Low Priority',
    'settings.system.emailNotifications': 'Email Notifications',
    'settings.system.emailDesc': 'Receive booking and payment alerts',
    'settings.system.sessionTimeout': 'Session Timeout',
    'settings.system.timeout.5min': '5 minutes',
    'settings.system.timeout.15min': '15 minutes',
    'settings.system.timeout.30min': '30 minutes (default)',
    'settings.system.timeout.1hr': '1 hour',
    'settings.system.timeout.2hr': '2 hours',
    'settings.system.timeout.4hr': '4 hours',
    'settings.system.timeoutDesc': 'Auto-logout after inactivity period',
    'settings.system.theme': 'Theme',
    'settings.system.themeLight': 'Light',
    'settings.system.themeDark': 'Dark',
    'settings.system.currency': 'Currency',
    'settings.system.currencyKES': '🇰🇪 KES - Kenyan Shilling',
    'settings.system.currencyUSD': '🇺🇸 USD - US Dollar',
    'settings.system.currencyEUR': '🇪🇺 EUR - Euro',
    'settings.system.currencyGBP': '🇬🇧 GBP - British Pound',
    'settings.system.currencyDesc': 'All prices will display in {currency}',
    'settings.save.saved': 'Saved!',
    'settings.save.saveSettings': 'Save Settings',
    'settings.team.joined': 'Joined',
    'settings.team.placeholders.name': 'John Doe',
    'settings.team.placeholders.role': 'Technician',
    'settings.team.placeholders.email': 'john@example.com',
    'settings.team.placeholders.phone': '+254 700 000 000',
    'settings.team.status.active': 'Active',
    'settings.team.status.inactive': 'Inactive',
    'auth.signup.title': 'Create Account',
    'auth.signup.subtitle': 'Join Smart Sanitation Platform',
    'auth.signup.usernameLabel': 'Username',
    'auth.signup.usernamePlaceholder': 'Choose a username',
    'auth.signup.emailLabel': 'Email',
    'auth.signup.emailPlaceholder': 'you@example.com',
    'auth.signup.passwordLabel': 'Password',
    'auth.signup.passwordPlaceholder': 'Create a password',
    'auth.signup.confirmLabel': 'Confirm Password',
    'auth.signup.confirmPlaceholder': 'Re-enter password',
    'auth.signup.submit': 'Create Account',
    'auth.signup.submitting': 'Creating Account...',
    'auth.signup.hasAccount': 'Already have an account?',
    'auth.signup.signIn': 'Sign in',
    'auth.signup.terms': 'By creating an account you agree to our Terms of Service and Privacy Policy.',
    'auth.signup.error.username': 'Please enter a username',
    'auth.signup.error.email': 'Please enter an email',
    'auth.signup.error.password': 'Please enter a password',
    'auth.signup.error.passwordLength': 'Password must be at least 6 characters',
    'auth.signup.error.passwordMatch': 'Passwords do not match',
    'auth.signup.error.failed': 'Registration failed. Email may already be in use.',
    'auth.signup.error.connection': 'Connection error. Please try again.',
    'payment.mpesa.title': 'M-Pesa STK Push',
    'payment.mpesa.subtitle': 'Instant mobile payment',
    'payment.mpesa.phoneLabel': 'Phone Number',
    'payment.mpesa.phonePlaceholder': '2547XXXXXXXX',
    'payment.mpesa.amountLabel': 'Amount (KES)',
    'payment.mpesa.amountPlaceholder': '1000',
    'payment.mpesa.submit': 'Initiate STK Push',
    'payment.mpesa.initiating': 'Initiating STK Push...',
    'payment.mpesa.success': 'STK Push initiated! Check your phone. CheckoutRequestID: {id}',
    'payment.mpesa.error.validation': 'Please provide valid phone number and amount',
    'payment.mpesa.error.failed': 'STK Push failed',
    'payment.mpesa.error.init': 'Failed to initiate STK Push',
    'payment.paystack.title': 'Paystack',
    'payment.paystack.subtitle': 'Secure card payment',
    'payment.paystack.emailLabel': 'Customer Email',
    'payment.paystack.emailPlaceholder': 'customer@example.com',
    'payment.paystack.amountLabel': 'Amount',
    'payment.paystack.amountPlaceholder': '5000',
    'payment.paystack.submit': 'Pay with Paystack',
    'payment.paystack.initializing': 'Initializing Paystack transaction...',
    'payment.paystack.redirecting': 'Redirecting to Paystack...',
    'payment.paystack.error.validation': 'Please provide valid email and amount',
    'payment.paystack.error.failed': 'Paystack init failed',
    'payment.paystack.error.noUrl': 'Error: No authorization URL returned',
    'payment.paystack.error.init': 'Failed to initialize Paystack',
  },
  sw: {
    'dashboard.title': 'Dashibodi ya Usafi Mahiri',
    'dashboard.subtitle': 'Simamia vyoo vya kubebea, njia, uhifadhi, na timu katika sehemu moja',
    'dashboard.quickActions': 'Vitendo vya Haraka',
    'dashboard.overviewTab': 'Muhtasari',
    'dashboard.fleetMap': 'Ramani ya Baiskeli',
    'dashboard.routesTab': 'Njia',
    'dashboard.bookingsTab': 'Uhifadhi',
    'dashboard.maintenanceTab': 'Matengenezo',
    'dashboard.analyticsTab': 'Tathmini',
    'dashboard.unitsTab': 'Vyoo vya Kusafisha',
    'dashboard.insightsTab': 'Uchambuzi wa AI',
    'dashboard.paymentsTab': 'Malipo',
    'dashboard.settingsTab': 'Mipangilio',
    'dashboard.alertHeading': 'Utabiri wa Mahitaji & Tahadhari',
    'dashboard.alertDescription': 'Uchambuzi wa AI unatayarisha tahadhari kwa betri, kiwango cha kujaza, au mahitaji ya juu.',
    'dashboard.localeLabel': 'Lugha ya kuonyesha',
    'dashboard.topRisks': 'Vyoo vya kipaumbele cha juu',
    'dashboard.predictions': 'Mahitaji yanayotabirika',
    'dashboard.liveAlerts': 'Tahadhari za Moja kwa Moja',
    'dashboard.urgentAlerts': 'Tahadhari za Dharura',
    'dashboard.fleetStatus': 'Hali ya Magari',
    'dashboard.generateReport': 'Tengeneza Ripoti Kamili',
    'dashboard.generating': 'Inachambua...',
    'insights.heading': 'Uchambuzi',
    'insights.weather': 'Habari za Hali ya Hewa',
    'insights.ai': 'Utabiri na tahadhari za AI',
    'value.title': 'Thamani na ROI',
    'value.subtitle': 'Athari za kiutendaji na ufanisi wa kifedha',
    'value.pickups': 'Safari zilizoepukwa',
    'value.miles': 'Maili zilizopunguzwa',
    'value.savings': 'Akiba',
    'value.uptime': 'Muda wa Kufanya Kazi',
    'value.performance': 'Utendaji kwa Muda',
    'value.cohorts': 'Makundi ya Uhifadhi',
    'value.engagement': 'Ushirikiano wa Watumiaji',
    'payments.heading': 'Malipo',
    'payments.description': 'Pokea malipo, fuatilia miamala, na endelea huduma kupitia watoa huduma wa kikanda.',
    'payments.providersTitle': 'Watoa Huduma za Malipo',
    'payments.provider.mpesa': 'M-Pesa: Fedha za simu maarufu Kenya na Afrika Mashariki.',
    'payments.provider.paystack': 'Paystack: Malipo ya kadi na benki kote Afrika.',
    'payments.provider.airtel': 'Airtel Money: Mfumo wa akiba kwa maeneo ya mipaka.',
    'payments.provider.paypal': 'PayPal: Kwa malipo ya wadau wa kimataifa.',
    'dashboard.welcome': 'Karibu tena, Msimamizi',
    'dashboard.systemStatus': 'Mfumo Upo Hewani',
    'dashboard.telemetry': 'Telemetry ya wakati halisi inaonyesha utendaji bora katika kundi la usafi. 98% ya muda wa kufanya kazi leo.',
    'dashboard.newBooking': 'Uhifadhi Mpya',
    'dashboard.dispatchRoute': 'Panga Njia',
    'dashboard.totalFleet': 'Jumla ya Magari',
    'dashboard.utilization': 'Matumizi',
    'dashboard.activeRoutes': 'Njia Zinazofanya Kazi',
    'dashboard.onRoad': 'Yapo barabarani sasa',
    'dashboard.dailyRevenue': 'Mapato ya Siku',
    'routes.title': 'Njia',
    'routes.optimize': 'Boresha Njia',
    'routes.new': 'Njia Mpya',
    'routes.depot': 'Eneo la Depot',
    'routes.priority': 'Kipaumbele',
    'routes.timeWindow': 'Muda',
    'routes.optimizationComplete': 'Uboreshaji wa AI Umekamilika',
    'routes.savings': 'Makadirio ya kuokoa:',
    'routes.applyOrder': 'Tumia Mpangilio',
    'routes.totalDistance': 'Jumla ya Umbali:',
    'routes.table.technician': 'Fundi',
    'routes.table.techId': 'Kitambulisho',
    'routes.table.status': 'Hali',
    'routes.table.priority': 'Kipaumbele',
    'routes.table.eta': 'Muda',
    'routes.table.actions': 'Vitendo',
    'routes.modal.edit': 'Hariri Njia',
    'routes.modal.new': 'Njia Mpya',
    'routes.modal.subtitle': 'Panga au sasisha maelezo ya njia ya huduma',
    'common.edit': 'Hariri',
    'common.delete': 'Futa',
    'common.cancel': 'Ghairi',
    'common.save': 'Hifadhi',
    'bookings.title': 'Udhibiti wa Uhifadhi',
    'bookings.search': 'Tafuta...',
    'bookings.new': 'Uhifadhi Mpya',
    'bookings.table.customer': 'Mteja',
    'bookings.table.unit': 'Choo',
    'bookings.table.date': 'Tarehe',
    'bookings.table.duration': 'Muda',
    'bookings.table.amount': 'Kiasi',
    'bookings.table.payment': 'Malipo',
    'bookings.modal.title.edit': 'Hariri Uhifadhi',
    'bookings.modal.title.new': 'Uhifadhi Mpya',
    'bookings.modal.subtitle': 'Simamia maelezo ya uhifadhi na hali ya malipo',
    'bookings.modal.customerName': 'Jina la Mteja',
    'bookings.modal.assignTech': 'Pangia Fundi',
    'bookings.modal.targetUnit': 'Choo Lengwa',
    'bookings.modal.startDate': 'Tarehe ya Kuanza',
    'bookings.modal.duration': 'Muda',
    'bookings.modal.amount': 'Kiasi (KES)',
    'bookings.modal.bookingStatus': 'Hali ya Uhifadhi',
    'bookings.modal.paymentStatus': 'Hali ya Malipo',
    'bookings.modal.unassigned': 'Haijapangiwa',
    'bookings.smart.title': 'Akili ya Uhifadhi Mahiri',
    'bookings.smart.date': 'Tarehe Lengwa',
    'bookings.smart.location': 'Eneo',
    'bookings.smart.units': 'Idadi ya Vyoo',
    'bookings.smart.duration': 'Muda (Siku)',
    'bookings.smart.capacity': 'Uwezo / Siku',
    'bookings.smart.suggestButton': 'Pendekeza',
    'settings.profile.title': 'Wasifu wa Kampuni',
    'settings.profile.subtitle': 'Dhibiti utambulisho wa biashara',
    'settings.profile.name': 'Jina la Kampuni',
    'settings.profile.email': 'Barua pepe',
    'settings.profile.phone': 'Nambari ya Simu',
    'settings.profile.license': 'Leseni ya Biashara',
    'settings.save.button': 'Hifadhi Mabadiliko',
    'settings.save.saving': 'Inahifadhi...',
    'settings.save.success': 'Mipangilio imehifadhiwa!',
    'settings.security.title': 'Usalama na Ufikiaji',
    'settings.security.editProfile': 'Hariri Wasifu',
    'settings.security.changePassword': 'Badilisha Nenosiri',
    'settings.connected.title': 'Huduma Zilizounganishwa',
    'settings.data.title': 'Data na Wajibu wa AI',
    'settings.data.privacy': 'Dhamana ya Faragha:',
    'settings.data.optIn': 'Uboreshaji wa AI',
    'settings.data.export': 'Hamisha Data Yangu (GDPR)',
    'settings.system.title': 'Mapendeleo ya Mfumo',
    'settings.system.whatsapp': 'Arifa za WhatsApp',
    'settings.team.title': 'Usimamizi wa Timu',
    'settings.team.subtitle': 'Dhibiti ufikiaji na majukumu',
    'settings.team.search': 'Tafuta wanachama...',
    'settings.team.add': 'Ongeza Mwanachama',
    'settings.team.noMembers': 'Hakuna wanachama waliopatikana.',
    'settings.team.modal.edit': 'Hariri Mwanachama',
    'settings.team.modal.addTitle': 'Ongeza Mwanachama',
    'settings.team.modal.editDesc': 'Sasisha taarifa za mwanachama',
    'settings.team.modal.addDesc': 'Ongeza mwanachama mpya kwenye timu',
    'settings.team.modal.name': 'Jina Kamili',
    'settings.team.modal.role': 'Majukumu',
    'settings.team.modal.email': 'Barua pepe',
    'settings.team.modal.phone': 'Simu',
    'settings.team.modal.status': 'Hali',
    'settings.team.modal.update': 'Sasisha',
    'settings.team.modal.addBtn': 'Ongeza Mwanachama',
    'admin.transactions.status.completed': 'Completed',
    'admin.transactions.status.success': 'Success',
    'admin.transactions.status.pending': 'Pending',
    'admin.transactions.status.failed': 'Failed',
    'admin.transactions.payment.mobile': 'Mobile Payment',
    'admin.transactions.payment.card': 'Card / Online',
    'admin.transactions.unknown': 'Unknown',
    'admin.transactions.viewDetails': 'View Details',
    'admin.transactions.rawPayload': 'Raw Payload',
    'admin.transactions.delete': 'Delete Record',
    'bookings.subtitle': 'Simamia oda za wateja na uhifadhi',
    'bookings.stats.total': 'Jumla ya Oda',
    'bookings.stats.confirmed': 'Zimethibitishwa',
    'bookings.stats.pending': 'Zinasubiri',
    'bookings.stats.paid': 'Zimelipwa',
    'units.iot.title': 'Data ya Sensor za IoT',
    'units.iot.temperature': 'Joto',
    'units.iot.humidity': 'Unyevu',
    'units.iot.odorLevel': 'Kiwango cha Harufu',
    'units.iot.usageCount': 'Idadi ya Matumizi',
    'units.iot.lastService': 'Huduma ya Mwisho',
    'units.iot.notServiced': 'Haijahudumishwa',
    'units.editable.title': 'Sifa Zinazoweza Kubadilishwa',
    'units.editable.location': 'Mahali',
    'units.editable.status': 'Hali',
    'units.editable.fillLevel': 'Kiwango cha Kujaa (%)',
    'units.editable.batteryLevel': 'Kiwango cha Betri (%)',
    'units.status.active': 'Inatumika',
    'units.status.maintenance': 'Ukarabati',
    'units.status.offline': 'Nje ya Mtandao',
    'routes.empty.title': 'Hakuna njia bado',
    'routes.empty.subtitle': 'Unda njia yako ya kwanza kuanza',
    'routes.empty.create': 'Unda Njia',
    'routes.stats.total': 'Jumla ya Njia',
    'routes.stats.active': 'Zinatumika',
    'routes.stats.pending': 'Zinasubiri',
    'routes.stats.completed': 'Zimekamilika',
    'routes.card.status': 'Hali',
    'routes.card.priority': 'Kipaumbele',
    'routes.card.units': 'Vitengo',
    'routes.card.eta': 'Muda Unaotarajiwa',
    'routes.modal.estimatedTime': 'Muda Unaokadiriwa',
    'routes.modal.estimatedTimePlaceholder': 'mfano 2.5 saa',
    'routes.modal.statusLabel': 'Hali',
    'routes.modal.priorityLabel': 'Kipaumbele',
    'routes.modal.update': 'Sasisha Njia',
    'routes.modal.create': 'Unda Njia',
    'routes.priority.highLabel': 'Kipaumbele cha Juu',
    'routes.priority.mediumLabel': 'Kipaumbele cha Kati',
    'routes.priority.lowLabel': 'Kipaumbele cha Chini',
    'settings.system.emailNotifications': 'Arifa za Barua Pepe',
    'settings.system.emailDesc': 'Pokea tahadhari za oda na malipo',
    'settings.system.sessionTimeout': 'Muda wa Kikao',
    'settings.system.timeout.5min': 'Dakika 5',
    'settings.system.timeout.15min': 'Dakika 15',
    'settings.system.timeout.30min': 'Dakika 30 (chaguo-msingi)',
    'settings.system.timeout.1hr': 'Saa 1',
    'settings.system.timeout.2hr': 'Masaa 2',
    'settings.system.timeout.4hr': 'Masaa 4',
    'settings.system.timeoutDesc': 'Toka kiotomatiki baada ya kutotumia',
    'settings.system.theme': 'Mandhari',
    'settings.system.themeLight': 'Mwanga',
    'settings.system.themeDark': 'Giza',
    'settings.system.currency': 'Sarafu',
    'settings.system.currencyKES': '🇰🇪 KES - Shilingi ya Kenya',
    'settings.system.currencyUSD': '🇺🇸 USD - Dola ya Marekani',
    'settings.system.currencyEUR': '🇪🇺 EUR - Euro',
    'settings.system.currencyGBP': '🇬🇧 GBP - Pauni ya Uingereza',
    'settings.system.currencyDesc': 'Bei zote zitaonyeshwa kwa {currency}',
    'settings.save.saved': 'Imehifadhiwa!',
    'settings.save.saveSettings': 'Hifadhi Mipangilio',
    'settings.team.joined': 'Alijiunga',
    'settings.team.placeholders.name': 'Jina Kamili',
    'settings.team.placeholders.role': 'Fundi',
    'settings.team.placeholders.email': 'barua@mfano.com',
    'settings.team.placeholders.phone': '+254 700 000 000',
    'settings.team.status.active': 'Anatumika',
    'settings.team.status.inactive': 'Hatatumiki',
    'auth.signup.title': 'Unda Akaunti',
    'auth.signup.subtitle': 'Jiunge na Jukwaa la Usafi Mahiri',
    'auth.signup.usernameLabel': 'Jina la Mtumiaji',
    'auth.signup.usernamePlaceholder': 'Chagua jina la mtumiaji',
    'auth.signup.emailLabel': 'Barua Pepe',
    'auth.signup.emailPlaceholder': 'wewe@mfano.com',
    'auth.signup.passwordLabel': 'Nywila',
    'auth.signup.passwordPlaceholder': 'Unda nywila',
    'auth.signup.confirmLabel': 'Thibitisha Nywila',
    'auth.signup.confirmPlaceholder': 'Ingiza nywila tena',
    'auth.signup.submit': 'Unda Akaunti',
    'auth.signup.submitting': 'Inaunda Akaunti...',
    'auth.signup.hasAccount': 'Tayari una akaunti?',
    'auth.signup.signIn': 'Ingia',
    'auth.signup.terms': 'Kwa kuunda akaunti unakubali Masharti yetu ya Huduma na Sera ya Faragha.',
    'auth.signup.error.username': 'Tafadhali ingiza jina la mtumiaji',
    'auth.signup.error.email': 'Tafadhali ingiza barua pepe',
    'auth.signup.error.password': 'Tafadhali ingiza nywila',
    'auth.signup.error.passwordLength': 'Nywila lazima iwe na angalau herufi 6',
    'auth.signup.error.passwordMatch': 'Nywila hazilingani',
    'auth.signup.error.failed': 'Usajili umeshindwa. Barua pepe inaweza kuwa tayari inatumika.',
    'auth.signup.error.connection': 'Hitilafu ya muunganisho. Tafadhali jaribu tena.',
    'payment.mpesa.title': 'M-Pesa STK Push',
    'payment.mpesa.subtitle': 'Malipo ya simu ya haraka',
    'payment.mpesa.phoneLabel': 'Nambari ya Simu',
    'payment.mpesa.phonePlaceholder': '2547XXXXXXXX',
    'payment.mpesa.amountLabel': 'Kiasi (KES)',
    'payment.mpesa.amountPlaceholder': '1000',
    'payment.mpesa.submit': 'Anzisha STK Push',
    'payment.mpesa.initiating': 'Inaanzisha STK Push...',
    'payment.mpesa.success': 'STK Push imeanzishwa! Angalia simu yako. CheckoutRequestID: {id}',
    'payment.mpesa.error.validation': 'Tafadhali toa nambari sahihi ya simu na kiasi',
    'payment.mpesa.error.failed': 'STK Push imeshindwa',
    'payment.mpesa.error.init': 'Imeshindwa kuanzisha STK Push',
    'payment.paystack.title': 'Paystack',
    'payment.paystack.subtitle': 'Malipo salama ya kadi',
    'payment.paystack.emailLabel': 'Barua Pepe ya Mteja',
    'payment.paystack.emailPlaceholder': 'mteja@mfano.com',
    'payment.paystack.amountLabel': 'Kiasi',
    'payment.paystack.amountPlaceholder': '5000',
    'payment.paystack.submit': 'Lipa kwa Paystack',
    'payment.paystack.initializing': 'Inaanzisha muamala wa Paystack...',
    'payment.paystack.redirecting': 'Inaelekeza kwa Paystack...',
    'payment.paystack.error.validation': 'Tafadhali toa barua pepe sahihi na kiasi',
    'payment.paystack.error.failed': 'Kuanzisha Paystack kumeshindwa',
    'payment.paystack.error.noUrl': 'Hitilafu: Hakuna URL ya uidhinishaji iliyorudishwa',
    'payment.paystack.error.init': 'Imeshindwa kuanzisha Paystack',
  },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    return stored && (stored === 'en' || stored === 'sw') ? stored : 'en';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = (value: Locale) => setLocaleState(value);

  const t = useMemo(
    () => (key: TranslationKey, replacements?: Record<string, string | number>) => {
      const text = baseTranslations[locale][key] ?? key;
      if (!replacements) return text;
      return Object.entries(replacements).reduce(
        (current, [placeholder, value]) => current.replace(`{${placeholder}}`, String(value)),
        text
      );
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
