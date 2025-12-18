# Quick Start Guide - Production Features Testing

## 🚀 Testing the Production Hardening Features

### Prerequisites
- Node.js 18+ installed
- Dependencies installed (`npm install` in server directory)

---

## 1. Start the Server

```bash
cd server
npm start
```

You should see:
```
🚀 Server started successfully
📊 Health check available at: http://localhost:3001/health
📈 Metrics available at: http://localhost:3001/health/metrics
```

---

## 2. Test Health Endpoints

### Overall Health Check
```bash
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-18T13:18:00.000Z",
  "uptime": 45.123,
  "environment": "development",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "memory": {
      "status": "healthy",
      "rss": "85MB",
      "heapUsed": "45MB",
      "heapTotal": "60MB"
    },
    "environment": {
      "status": "healthy",
      "missingVariables": []
    }
  },
  "responseTime": "25ms"
}
```

### Readiness Check (Kubernetes)
```bash
curl http://localhost:3001/health/ready
```

### Liveness Check (Kubernetes)
```bash
curl http://localhost:3001/health/live
```

### Metrics
```bash
curl http://localhost:3001/health/metrics
```

---

## 3. Test Rate Limiting

### Test Auth Rate Limiting (5 requests per 15 min)
```bash
# This should work for the first 5 requests
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo -e "\n"
done
```

**Expected**: First 5 requests get 401 (invalid credentials), 6th request gets 429 (rate limited)

### Test API Rate Limiting (100 requests per 15 min)
```bash
# Test with health endpoint (no rate limit)
for i in {1..105}; do
  curl -s http://localhost:3001/health > /dev/null
  echo "Request $i completed"
done
```

---

## 4. Test Request Validation

### Valid Request
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepass123",
    "name": "Test User"
  }'
```

**Expected**: Success (or user already exists)

### Invalid Request (Missing Fields)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "\"password\" is required"
    },
    {
      "field": "name",
      "message": "\"name\" is required"
    }
  ]
}
```

### Invalid Email Format
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "securepass123",
    "name": "Test User"
  }'
```

**Expected**: Validation error for invalid email format

---

## 5. Test Security Headers

```bash
curl -I http://localhost:3001/health
```

**Expected Headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: ...
```

---

## 6. Test Logging

### Check Log Files
```bash
# View error logs
tail -f server/logs/error.log

# View all logs
tail -f server/logs/combined.log

# In another terminal, make some requests
curl http://localhost:3001/health
curl http://localhost:3001/api/nonexistent
```

**Expected**: Logs appear in real-time in the log files

### Test Error Logging
```bash
# Trigger a 404
curl http://localhost:3001/api/nonexistent

# Check logs
tail -n 5 server/logs/combined.log
```

---

## 7. Test Compression

```bash
# Request with compression
curl -H "Accept-Encoding: gzip" -I http://localhost:3001/health
```

**Expected Header**:
```
Content-Encoding: gzip
```

---

## 8. Test 404 Handler

```bash
curl http://localhost:3001/api/nonexistent
```

**Expected Response**:
```json
{
  "error": "Not Found",
  "message": "Cannot GET /api/nonexistent",
  "path": "/api/nonexistent"
}
```

---

## 9. Test CORS

### From Browser Console
```javascript
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log)
```

**Expected**: Success (CORS allows localhost in development)

### Test Production CORS (requires NODE_ENV=production)
```bash
# Set production environment
NODE_ENV=production ALLOWED_ORIGINS=https://example.com npm start

# Try to access from different origin
curl -H "Origin: https://unauthorized.com" http://localhost:3001/health
```

**Expected**: CORS error (blocked)

---

## 10. Test Graceful Shutdown

```bash
# Start server
npm start

# In another terminal, send SIGTERM
kill -SIGTERM $(lsof -t -i:3001)
```

**Expected Logs**:
```
SIGTERM signal received: closing HTTP server
HTTP server closed
```

---

## 11. View Metrics

```bash
curl http://localhost:3001/health/metrics | jq
```

**Expected Response**:
```json
{
  "timestamp": "2025-12-18T13:18:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "system": {
    "memory": {
      "rss": 89456640,
      "heapUsed": 47123456,
      "heapTotal": 62914560,
      "external": 1234567
    },
    "cpu": {
      "user": 123456,
      "system": 78901
    }
  },
  "database": {
    "totalUsers": 5,
    "totalBookings": 23,
    "totalUnits": 15,
    "totalTransactions": 42,
    "activeUnits": 12,
    "pendingBookings": 3
  }
}
```

---

## 12. Load Testing (Optional)

### Install Apache Bench
```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# macOS
brew install httpd
```

### Run Load Test
```bash
# Test health endpoint with 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3001/health

# Test with authentication
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/units
```

**Expected**: See requests per second, response times, etc.

---

## 13. Monitor Real-Time Logs

### Terminal 1: Start Server
```bash
cd server
npm start
```

### Terminal 2: Watch Logs
```bash
tail -f server/logs/combined.log
```

### Terminal 3: Make Requests
```bash
# Make various requests
curl http://localhost:3001/health
curl http://localhost:3001/health/metrics
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

**Expected**: See all requests logged in Terminal 2

---

## 🎯 Success Criteria

✅ Health endpoints return 200 OK
✅ Rate limiting blocks excessive requests
✅ Validation rejects invalid data
✅ Security headers are present
✅ Logs are created in `server/logs/`
✅ Compression is enabled
✅ 404 handler works
✅ CORS is configured
✅ Graceful shutdown works
✅ Metrics endpoint returns data

---

## 🐛 Troubleshooting

### Logs Directory Not Found
```bash
mkdir -p server/logs
```

### Permission Denied on Logs
```bash
chmod 755 server/logs
```

### Rate Limit Not Working
- Wait 15 minutes for rate limit to reset
- Or restart the server

### Health Check Fails
- Check if database is accessible
- Verify JWT_SECRET is set
- Check server logs for errors

---

## 📚 Next Steps

1. ✅ Test all features locally
2. ✅ Review logs for any errors
3. ✅ Configure production environment variables
4. ✅ Follow [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
5. ✅ Use [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) before going live

---

**Happy Testing! 🚀**
