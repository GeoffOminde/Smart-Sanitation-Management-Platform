# 🚀 Production Deployment Guide

This guide will help you deploy the Smart Sanitation Management Platform to production.

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Option A: Vercel + Railway (Recommended)](#option-a-vercel--railway)
3. [Option B: Render (All-in-One)](#option-b-render)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

### Prerequisites
- [x] GitHub account
- [x] Project pushed to GitHub
- [x] Environment variables ready (see `.env.example`)

### Pre-Deployment Checklist
```bash
# 1. Test locally
npm run dev          # Frontend
cd server && npm start  # Backend

# 2. Build test
npm run build        # Should complete without errors

# 3. Check environment variables
# Copy .env.example to .env and fill in values
```

---

## 🌟 Option A: Vercel + Railway (Recommended)

**Best for:** Automatic deployments, great performance, easy setup

### Cost: ~$25-40/month
- Vercel: Free (or $20/month for Pro)
- Railway: $5-20/month

### Step 1: Deploy Frontend to Vercel

1. **Go to [Vercel](https://vercel.com)**
   - Sign up with GitHub

2. **Import Project**
   ```
   - Click "Add New Project"
   - Select your GitHub repository
   - Framework Preset: Vite
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: dist
   ```

3. **Configure Environment Variables**
   ```
   VITE_API_BASE=https://your-backend.railway.app
   VITE_PAYSTACK_PUBLIC=pk_live_your_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your frontend is live! 🎉

### Step 2: Deploy Backend to Railway

1. **Go to [Railway](https://railway.app)**
   - Sign up with GitHub

2. **Create New Project**
   ```
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   ```

3. **Add PostgreSQL Database**
   ```
   - Click "New"
   - Select "Database"
   - Choose "PostgreSQL"
   - Railway auto-generates DATABASE_URL
   ```

4. **Configure Service**
   ```
   - Click on your service
   - Settings > Root Directory: ./server
   - Settings > Start Command: npm start
   - Settings > Build Command: npm install && npx prisma generate && npx prisma migrate deploy
   ```

5. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-with-crypto>
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   PAYSTACK_SECRET_KEY=sk_live_your_key
   MPESA_CONSUMER_KEY=your_key
   MPESA_CONSUMER_SECRET=your_secret
   MPESA_PASSKEY=your_passkey
   MPESA_SHORTCODE=your_shortcode
   MPESA_ENVIRONMENT=production
   MPESA_CALLBACK_URL=https://your-backend.railway.app/api/mpesa/callback
   OPENWEATHER_API_KEY=your_key
   OPENAI_API_KEY=your_key
   ```

6. **Deploy**
   - Railway auto-deploys
   - Get your backend URL: `https://your-app.railway.app`

7. **Update Frontend**
   - Go back to Vercel
   - Update `VITE_API_BASE` with Railway URL
   - Redeploy

### Step 3: Run Database Migrations

```bash
# In Railway dashboard
- Click on your service
- Click "Deploy Logs"
- Migrations run automatically via build command
```

---

## 🎨 Option B: Render (All-in-One)

**Best for:** Single platform, simpler management

### Cost: ~$21/month
- Web Service: $7/month
- Static Site: Free
- PostgreSQL: $7/month

### Step 1: Deploy via Blueprint

1. **Go to [Render](https://render.com)**
   - Sign up with GitHub

2. **Create New Blueprint**
   ```
   - Click "New +"
   - Select "Blueprint"
   - Connect your GitHub repository
   - Render detects render.yaml automatically
   ```

3. **Configure Services**
   ```
   Render will create:
   - sanitation-api (Backend)
   - sanitation-frontend (Frontend)
   - sanitation-db (PostgreSQL)
   ```

4. **Add Environment Variables**
   - Click on each service
   - Go to "Environment"
   - Add variables from `.env.example`

5. **Deploy**
   - Click "Apply"
   - Wait 5-10 minutes
   - All services deploy automatically! 🎉

---

## ✅ Post-Deployment

### 1. Verify Deployment

```bash
# Test backend health
curl https://your-backend-url.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-18T...",
  "uptime": 123.45
}
```

### 2. Test Frontend
- Visit your frontend URL
- Try logging in
- Create a test booking
- Check map functionality

### 3. Set Up Automated Backups

**On Railway:**
```bash
# Add to your service
- Go to Settings > Cron Jobs
- Add: 0 2 * * * cd /app/server && node backup.js create
```

**On Render:**
```bash
# Add to render.yaml
services:
  - type: cron
    name: database-backup
    schedule: "0 2 * * *"
    buildCommand: npm install
    startCommand: node server/backup.js create
```

### 4. Configure Custom Domain (Optional)

**Vercel:**
```
- Go to Project Settings
- Domains > Add Domain
- Follow DNS instructions
```

**Railway:**
```
- Go to Service Settings
- Networking > Custom Domain
- Add your domain
```

### 5. Set Up Monitoring

**Add Sentry (Error Tracking):**
```bash
# Install
npm install @sentry/node

# Add to server/index.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**Add UptimeRobot (Uptime Monitoring):**
```
1. Go to uptimerobot.com
2. Add new monitor
3. URL: https://your-backend/health
4. Interval: 5 minutes
```

---

## 🔧 Troubleshooting

### Frontend Issues

**Problem: Blank page**
```bash
# Check browser console
# Likely cause: VITE_API_BASE not set correctly

# Fix:
- Update Vercel environment variable
- Redeploy
```

**Problem: API calls failing**
```bash
# Check CORS
# Ensure backend ALLOWED_ORIGINS includes frontend URL

# Fix in Railway/Render:
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Backend Issues

**Problem: Database connection failed**
```bash
# Check DATABASE_URL
# Ensure it's set correctly

# Test connection:
npx prisma db pull
```

**Problem: Migrations not running**
```bash
# Manually run migrations:
npx prisma migrate deploy
npx prisma generate
```

**Problem: M-Pesa not working**
```bash
# Check:
1. MPESA_ENVIRONMENT=production
2. MPESA_CALLBACK_URL is HTTPS
3. Credentials are production keys
4. Shortcode is correct
```

### Common Errors

**Error: "Missing Authorization header"**
```
- User needs to log in
- JWT token expired
- Check JWT_SECRET is set
```

**Error: "CORS policy blocked"**
```
- Add frontend URL to ALLOWED_ORIGINS
- Restart backend service
```

**Error: "Database connection timeout"**
```
- Check DATABASE_URL
- Verify database is running
- Check connection pool settings
```

---

## 📊 Monitoring Checklist

After deployment, monitor:

- [ ] `/health` endpoint returns 200
- [ ] Frontend loads correctly
- [ ] Login works
- [ ] API calls succeed
- [ ] Database queries work
- [ ] Payments process correctly
- [ ] Emails send (if configured)
- [ ] Backups run daily
- [ ] Error logs are clean

---

## 🎉 Success!

Your Smart Sanitation Management Platform is now live in production!

**Next Steps:**
1. Share the URL with your team
2. Monitor error logs daily
3. Set up automated backups
4. Configure custom domain
5. Add SSL certificate (auto-provided)

**Support:**
- Check logs: Railway/Render dashboard
- Review errors: Sentry (if configured)
- Database: Use Prisma Studio

---

**Last Updated:** December 18, 2025  
**Version:** 2.0.0 Production
