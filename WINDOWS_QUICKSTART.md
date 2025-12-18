# Windows Quick Start Guide

## ✅ **ENVIRONMENT STATUS: READY!**

Your Smart Sanitation Management Platform is properly configured and ready to run!

---

## 📊 **Configuration Summary**

### ✅ Environment Variables
- ✅ **DATABASE_URL** - Configured
- ✅ **JWT_SECRET** - Configured  
- ✅ **PAYSTACK_SECRET** - Configured
- ✅ **MPESA_CONSUMER_KEY** - Configured
- ✅ **OPENWEATHER_API_KEY** - Configured

### ✅ Dependencies
- ✅ **Node modules** - Installed
- ✅ **Prisma client** - Generated
- ✅ **Database** - Initialized
- ✅ **Logs directory** - Created

---

## 🚀 **Quick Start Commands (Windows)**

### 1. Start the Server
```powershell
cd server
npm start
```

### 2. View Logs (PowerShell equivalent of tail -f)
```powershell
# View last 20 lines of combined logs
Get-Content server\logs\combined.log -Tail 20

# Follow logs in real-time (like tail -f)
Get-Content server\logs\combined.log -Wait -Tail 10

# View error logs only
Get-Content server\logs\error.log -Tail 20

# Or use our custom script
.\view-logs.ps1 -Follow
```

### 3. Test Health Endpoint
```powershell
# Using PowerShell
Invoke-WebRequest -Uri http://localhost:3001/health | Select-Object -ExpandProperty Content

# Or using curl (if installed)
curl http://localhost:3001/health
```

### 4. Test Metrics
```powershell
Invoke-WebRequest -Uri http://localhost:3001/health/metrics | Select-Object -ExpandProperty Content
```

---

## 📝 **Windows-Specific Commands**

### View Logs
```powershell
# Last 20 lines
Get-Content server\logs\combined.log -Tail 20

# Follow in real-time
Get-Content server\logs\combined.log -Wait -Tail 0

# Search for errors
Select-String -Path server\logs\combined.log -Pattern "error"

# Count log entries
(Get-Content server\logs\combined.log).Count
```

### Check Server Status
```powershell
# Check if server is running on port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

# Find process using port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -ErrorAction SilentlyContinue
```

### Stop Server
```powershell
# Find and stop the process
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
    Write-Host "Server stopped"
}
```

### Monitor Server
```powershell
# Watch server logs in real-time (separate terminal)
Get-Content server\logs\combined.log -Wait -Tail 0

# Make test requests (another terminal)
Invoke-WebRequest -Uri http://localhost:3001/health
```

---

## 🧪 **Testing Commands**

### Test Authentication
```powershell
# Register new user
$body = @{
    email = "test@example.com"
    password = "securepass123"
    name = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3001/api/auth/register `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Test Rate Limiting
```powershell
# Test auth rate limiting (should block after 5 attempts)
1..6 | ForEach-Object {
    Write-Host "Request $_"
    $body = @{
        email = "test@test.com"
        password = "wrong"
    } | ConvertTo-Json
    
    try {
        Invoke-WebRequest -Uri http://localhost:3001/api/auth/login `
            -Method POST `
            -ContentType "application/json" `
            -Body $body
    } catch {
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    }
}
```

### Test Validation
```powershell
# Invalid email format
$body = @{
    email = "invalid-email"
    password = "test123"
    name = "Test"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3001/api/auth/register `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 🔧 **Useful PowerShell Aliases**

Add these to your PowerShell profile for convenience:

```powershell
# Open PowerShell profile
notepad $PROFILE

# Add these aliases:
function Start-SanitationServer { cd "C:\path\to\Smart Sanitation Management Platform\server"; npm start }
function View-SanitationLogs { Get-Content "C:\path\to\Smart Sanitation Management Platform\server\logs\combined.log" -Wait -Tail 10 }
function Test-SanitationHealth { Invoke-WebRequest -Uri http://localhost:3001/health | Select-Object -ExpandProperty Content | ConvertFrom-Json }

# Usage:
# Start-SanitationServer
# View-SanitationLogs
# Test-SanitationHealth
```

---

## 📊 **Monitoring Dashboard (PowerShell)**

Create a simple monitoring script:

```powershell
# monitor.ps1
while ($true) {
    Clear-Host
    Write-Host "=== Smart Sanitation Server Monitor ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    # Check if server is running
    $process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "✅ Server Status: RUNNING" -ForegroundColor Green
        
        # Get health status
        try {
            $health = Invoke-WebRequest -Uri http://localhost:3001/health | ConvertFrom-Json
            Write-Host "✅ Health: $($health.status)" -ForegroundColor Green
            Write-Host "   Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Gray
        } catch {
            Write-Host "⚠️  Health check failed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Server Status: STOPPED" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Recent logs:" -ForegroundColor Cyan
    Get-Content "server\logs\combined.log" -Tail 5 | ForEach-Object {
        if ($_ -match "error") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    Start-Sleep -Seconds 5
}
```

---

## 🎯 **Next Steps**

1. **Start the server**:
   ```powershell
   cd server
   npm start
   ```

2. **Open another terminal and view logs**:
   ```powershell
   Get-Content server\logs\combined.log -Wait -Tail 10
   ```

3. **Test the health endpoint**:
   ```powershell
   Invoke-WebRequest -Uri http://localhost:3001/health
   ```

4. **Access the frontend**:
   - Open browser to `http://localhost:5173`
   - Or run: `cd .. && npm run dev`

---

## 📚 **Documentation**

- **TESTING_GUIDE.md** - Comprehensive testing guide
- **DEPLOYMENT.md** - Production deployment guide
- **PRODUCTION_CHECKLIST.md** - Pre-deployment checklist
- **README.md** - Project overview

---

## 🆘 **Troubleshooting**

### Server won't start
```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort 3001

# Kill process if needed
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

### Can't see logs
```powershell
# Check if logs directory exists
Test-Path server\logs

# Create if missing
New-Item -ItemType Directory -Path server\logs -Force
```

### Database errors
```powershell
cd server
npx prisma migrate dev
npx prisma generate
```

---

**Status**: ✅ **READY TO START!**

Your environment is properly configured. Start the server with `cd server && npm start`
