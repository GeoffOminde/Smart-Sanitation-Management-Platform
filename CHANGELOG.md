# Changelog

## feature/new-feature-name

Commit message suggestion:

```
feat: activation/retention analytics (staging-gated), ROI dashboard, ROI API, weekly reports, and safety switches
```

### Summary
- Enabled staged analytics (frontend flag) and a simple ingestion endpoint (backend flag).
- Added a Value/ROI dashboard view with KPI placeholders.
- Implemented forecast API endpoint that frontend already expects.
- Added weather caching, HTTP timeouts, and optional analytics ingestion on backend.
- Implemented ROI aggregation endpoint and a weekly report scheduler (env-gated).
- Added example env files for both frontend and backend.

### Frontend changes
- `src/lib/analytics.ts` (new)
  - Env-gated client analytics with batching.
  - Controlled by `VITE_ENABLE_ANALYTICS` (default false).
  - Sends events to `/api/analytics/events` only when enabled.
- `src/Value.tsx` (new)
  - Value/ROI dashboard page with KPI placeholders for Operational, Financial, and Reliability metrics.
  - Tracks `view_value_dashboard`.
- `src/App.tsx`
  - Import and add protected route: `/value` -> `Value`.
- `src/Navigation.tsx`
  - Add a “Value” link to `/value`.
- `src/Login.tsx`
  - Track `login_success` on successful login using `trackNow()`.
- `src/Signup.tsx`
  - Track `signup_completed` just before redirect to login.
- `src/Insights.tsx`
  - Track page view and feature usage:
    - `view_insights`
    - Weather: `weather_refresh_clicked`, `weather_loaded`, `weather_error`
    - Forecast: `forecast_run_clicked`, `forecast_run_success`, `forecast_run_error`
    - Predictive Maintenance: `pm_run_clicked`, `pm_run_success`, `pm_run_error`
    - Route Optimization: `route_optimize_clicked`, `route_optimize_success`, `route_optimize_error`
- `.env.example` (root; new)
  - `VITE_ENABLE_ANALYTICS=false`
  - `VITE_API_BASE=`

### Backend changes
- `server/index.js`
  - Safety switches and HTTP:
    - `ENABLE_FORECAST_API` (default true): Exposes `POST /api/ai/forecast-bookings` wrapping `Forecast.forecastBookings`.
    - `ENABLE_WEATHER_CACHE` (default false) + `WEATHER_CACHE_TTL_S` (default 600): In-memory caching for `GET /api/weather/current`.
    - `HTTP_TIMEOUT_MS` (default 8000): Applies axios default timeout.
    - `ENABLE_ANALYTICS_API` (default false): Optional `POST /api/analytics/events` + `GET /api/analytics/events`.
  - ROI aggregation API:
    - `ENABLE_ROI_API` (default true): Adds `GET /api/roi/summary` summarizing feature usage and in-memory transactions.
  - Weekly email reports (env-gated):
    - `ENABLE_WEEKLY_REPORTS` (default false): Schedules weekly ROI email via cron (`WEEKLY_REPORT_CRON`, default `0 8 * * 1`).
    - SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `REPORTS_EMAIL_FROM`, `REPORTS_EMAIL_TO`.
  - Paystack route kept intact; ROI/cron code lives at top level (not inside handlers).
- `server/.env.example`
  - Documented new server env vars for the features above.
- `server/package.json`
  - Added dependencies: `nodemailer`, `node-cron`.

### How to enable in staging
- Frontend (Vercel project env):
  - `VITE_ENABLE_ANALYTICS=true`
  - `VITE_API_BASE=https://<staging-backend-host>` (no trailing slash)
- Backend (Render/staging host):
  - `ENABLE_ANALYTICS_API=true`
  - `ENABLE_FORECAST_API=true`
  - `ENABLE_WEATHER_CACHE=true` and `WEATHER_CACHE_TTL_S=600` (optional)
  - `HTTP_TIMEOUT_MS=8000`
  - `ENABLE_ROI_API=true`
  - Weekly emails (optional):
    - `ENABLE_WEEKLY_REPORTS=true`
    - `WEEKLY_REPORT_CRON=0 8 * * 1`
    - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
    - `REPORTS_EMAIL_FROM=no-reply@example.com`
    - `REPORTS_EMAIL_TO=ops@company.com,founder@company.com`

### Files changed
- `src/lib/analytics.ts` (new)
- `src/Value.tsx` (new)
- `src/App.tsx`
- `src/Navigation.tsx`
- `src/Login.tsx`
- `src/Signup.tsx`
- `src/Insights.tsx`
- `.env.example` (root; new)
- `server/index.js`
- `server/.env.example`
- `server/package.json`

### Next steps (optional)
- Wire `src/Value.tsx` to `GET /api/roi/summary` to display real metrics.
- Add a one-off "send test report now" route for quick validation of email.
- Migrate lightweight endpoint(s) (e.g., `GET /api/weather/current`) to Vercel Functions for co-location and lower latency.
- Persist analytics events to a durable store for real cohorts/retention.
