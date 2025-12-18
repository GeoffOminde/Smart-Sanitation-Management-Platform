# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in your production environment:

```bash
# Required
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your-super-secure-random-secret-key-here"

# Payment Gateways
PAYSTACK_SECRET="sk_live_..."
MPESA_CONSUMER_KEY="your_live_consumer_key"
MPESA_CONSUMER_SECRET="your_live_consumer_secret"
MPESA_PASSKEY="your_live_passkey"
MPESA_SHORTCODE="your_live_shortcode"
MPESA_ENVIRONMENT="production"
MPESA_CALLBACK_URL="https://yourdomain.com/api/mpesa/callback"

# Optional but Recommended
OPENWEATHER_API_KEY="your_api_key"
LOG_LEVEL="info"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
PORT=3001
```

### 2. Database Setup

#### PostgreSQL (Recommended for Production)
```bash
# Install PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb smart_sanitation_prod

# Create user
sudo -u postgres createuser -P sanitation_user

# Grant privileges
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE smart_sanitation_prod TO sanitation_user;
```

#### Run Migrations
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

### 3. Security Hardening

#### SSL/TLS Certificate
```bash
# Using Let's Encrypt (Certbot)
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

#### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. Install Dependencies
```bash
# Backend
cd server
npm ci --production

# Frontend
cd ..
npm ci --production
npm run build
```

---

## 🐳 Docker Deployment

### Build and Run with Docker Compose
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Docker Commands
```bash
# Build backend
docker build -f Dockerfile -t smart-sanitation-backend .

# Build frontend
docker build -f frontend.Dockerfile -t smart-sanitation-frontend .

# Run backend
docker run -d -p 3001:3001 --env-file server/.env smart-sanitation-backend

# Run frontend
docker run -d -p 80:80 smart-sanitation-frontend
```

---

## ☁️ Cloud Deployment

### Render.com (Backend)

1. **Create New Web Service**
   - Connect your GitHub repository
   - Select `server` as root directory
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `node index.js`

2. **Environment Variables**
   - Add all required environment variables in Render dashboard
   - Set `NODE_ENV=production`

3. **Database**
   - Create PostgreSQL database in Render
   - Copy `DATABASE_URL` to environment variables

### Vercel (Frontend)

1. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Environment Variables**
   - Add `VITE_API_URL=https://your-backend.onrender.com` in Vercel dashboard

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### AWS EC2 (Full Stack)

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.medium or larger
   - Configure security groups (ports 80, 443, 22)

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL
   sudo apt-get install -y postgresql postgresql-contrib

   # Install Nginx
   sudo apt-get install -y nginx

   # Install PM2
   sudo npm install -g pm2
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/smart-sanitation.git
   cd smart-sanitation
   ```

5. **Setup Backend**
   ```bash
   cd server
   npm ci --production
   npx prisma migrate deploy
   npx prisma generate

   # Start with PM2
   pm2 start index.js --name smart-sanitation-api
   pm2 save
   pm2 startup
   ```

6. **Setup Frontend**
   ```bash
   cd ..
   npm ci
   npm run build

   # Copy to Nginx
   sudo cp -r dist/* /var/www/html/
   ```

7. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           root /var/www/html;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 📊 Monitoring Setup

### Application Monitoring (Sentry)

1. **Install Sentry**
   ```bash
   cd server
   npm install @sentry/node
   ```

2. **Initialize in index.js**
   ```javascript
   const Sentry = require('@sentry/node');
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0
   });
   ```

### Uptime Monitoring

- **UptimeRobot**: https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

Configure monitors for:
- `/health` - Overall health
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

### Log Management

1. **PM2 Logs**
   ```bash
   pm2 logs smart-sanitation-api
   pm2 logs smart-sanitation-api --lines 100
   ```

2. **Application Logs**
   - Logs are stored in `server/logs/`
   - `error.log` - Error logs only
   - `combined.log` - All logs

3. **Log Rotation**
   - Automatic rotation at 5MB
   - Keeps 5 most recent files

---

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit `.env` files
- Use secure secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly

### 2. Database Security
- Use strong passwords
- Enable SSL connections
- Regular backups
- Limit database access by IP

### 3. API Security
- Rate limiting enabled (see `server/security.js`)
- CORS configured for production domains only
- Helmet security headers enabled
- Input validation on all endpoints

### 4. SSL/TLS
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use strong cipher suites

### 5. Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

---

## 🧪 Testing in Production

### Health Checks
```bash
# Overall health
curl https://yourdomain.com/health

# Readiness
curl https://yourdomain.com/health/ready

# Liveness
curl https://yourdomain.com/health/live

# Metrics
curl https://yourdomain.com/health/metrics
```

### API Testing
```bash
# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoint
curl https://yourdomain.com/api/units \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl -X POST https://api.render.com/deploy/your-service-id
```

---

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_units_status ON "Unit"(status);
CREATE INDEX idx_bookings_date ON "Booking"(date);
CREATE INDEX idx_transactions_status ON "Transaction"(status);
```

### 2. Caching (Redis)
```bash
# Install Redis
sudo apt-get install redis-server

# Install Redis client
npm install redis
```

### 3. CDN for Static Assets
- Use Cloudflare or AWS CloudFront
- Cache static files (images, CSS, JS)

---

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` is correct
   - Verify database is running
   - Check firewall rules

2. **JWT Secret Not Set**
   - Ensure `JWT_SECRET` is in environment variables
   - Generate new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Payment Gateway Errors**
   - Verify API keys are production keys
   - Check callback URLs are HTTPS
   - Ensure IP whitelisting is configured

4. **High Memory Usage**
   - Check `/health/metrics` endpoint
   - Restart application: `pm2 restart smart-sanitation-api`
   - Consider upgrading server resources

---

## 📞 Support

For production support:
- Check logs: `pm2 logs smart-sanitation-api`
- Health status: `https://yourdomain.com/health`
- Metrics: `https://yourdomain.com/health/metrics`

---

**Last Updated**: December 18, 2025
**Version**: 1.0.0
