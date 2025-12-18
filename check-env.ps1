# Environment Configuration Checker for Windows
# This script validates your production environment setup

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Smart Sanitation - Environment Config Checker" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Change to server directory
$serverPath = Join-Path $PSScriptRoot "server"
if (Test-Path $serverPath) {
    Set-Location $serverPath
} else {
    Write-Host "ERROR: Server directory not found!" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  WARNING: .env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating .env from .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file from template" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANT: Please update .env with your actual values!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ ERROR: .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Checking Environment Variables..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Load .env file
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        $envVars[$key] = $value
    }
}

# Critical variables to check
$criticalVars = @{
    "NODE_ENV" = @{
        "required" = $false
        "default" = "development"
        "description" = "Environment (development/production)"
    }
    "PORT" = @{
        "required" = $false
        "default" = "3001"
        "description" = "Server port"
    }
    "DATABASE_URL" = @{
        "required" = $true
        "description" = "Database connection string"
    }
    "JWT_SECRET" = @{
        "required" = $true
        "description" = "JWT secret key (32+ characters)"
        "validate" = { param($val) $val.Length -ge 32 }
    }
}

# Optional but recommended variables
$optionalVars = @{
    "PAYSTACK_SECRET" = "Payment gateway (Paystack)"
    "MPESA_CONSUMER_KEY" = "M-Pesa integration"
    "MPESA_CONSUMER_SECRET" = "M-Pesa integration"
    "MPESA_PASSKEY" = "M-Pesa integration"
    "OPENWEATHER_API_KEY" = "Weather API"
    "ALLOWED_ORIGINS" = "CORS whitelist (production)"
    "LOG_LEVEL" = "Logging level"
}

$issues = @()
$warnings = @()

# Check critical variables
foreach ($varName in $criticalVars.Keys) {
    $config = $criticalVars[$varName]
    $value = $envVars[$varName]
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        if ($config.required) {
            Write-Host "❌ $varName - MISSING (REQUIRED)" -ForegroundColor Red
            Write-Host "   → $($config.description)" -ForegroundColor Gray
            $issues += $varName
        } else {
            $defaultVal = $config.default
            Write-Host "⚠️  $varName - Using default: $defaultVal" -ForegroundColor Yellow
            Write-Host "   → $($config.description)" -ForegroundColor Gray
            $warnings += $varName
        }
    } else {
        # Check if value is still the placeholder
        if ($value -match "replace_with|your_|xxxx") {
            Write-Host "⚠️  $varName - PLACEHOLDER VALUE" -ForegroundColor Yellow
            Write-Host "   → Current: $value" -ForegroundColor Gray
            Write-Host "   → $($config.description)" -ForegroundColor Gray
            $warnings += $varName
        } else {
            # Validate if validation function exists
            if ($config.validate) {
                $isValid = & $config.validate $value
                if (-not $isValid) {
                    Write-Host "⚠️  $varName - INVALID" -ForegroundColor Yellow
                    Write-Host "   → $($config.description)" -ForegroundColor Gray
                    $warnings += $varName
                } else {
                    Write-Host "✅ $varName - OK" -ForegroundColor Green
                }
            } else {
                Write-Host "✅ $varName - OK" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "📦 Optional Configuration..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

foreach ($varName in $optionalVars.Keys) {
    $description = $optionalVars[$varName]
    $value = $envVars[$varName]
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "⚪ $varName - Not configured" -ForegroundColor Gray
        Write-Host "   → $description" -ForegroundColor DarkGray
    } elseif ($value -match "replace_with|your_|xxxx") {
        Write-Host "⚠️  $varName - PLACEHOLDER" -ForegroundColor Yellow
        Write-Host "   → $description" -ForegroundColor Gray
    } else {
        Write-Host "✅ $varName - Configured" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🔍 Additional Checks..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if logs directory exists
if (Test-Path "logs") {
    Write-Host "✅ Logs directory exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Creating logs directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✅ Logs directory created" -ForegroundColor Green
}

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Dependencies not installed" -ForegroundColor Yellow
    Write-Host "   → Run: npm install" -ForegroundColor Gray
    $warnings += "dependencies"
}

# Check if Prisma is generated
if (Test-Path "node_modules/.prisma") {
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "⚠️  Prisma client not generated" -ForegroundColor Yellow
    Write-Host "   → Run: npx prisma generate" -ForegroundColor Gray
    $warnings += "prisma"
}

# Check database file (for SQLite)
if ($envVars["DATABASE_URL"] -match "file:(.+)") {
    $dbFile = $matches[1].Replace("./", "")
    if (Test-Path $dbFile) {
        Write-Host "✅ Database file exists: $dbFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database file not found: $dbFile" -ForegroundColor Yellow
        Write-Host "   → Run: npx prisma migrate dev" -ForegroundColor Gray
        $warnings += "database"
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ All checks passed! Ready to start." -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 To start the server:" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor White
} elseif ($issues.Count -gt 0) {
    Write-Host "❌ CRITICAL ISSUES FOUND: $($issues.Count)" -ForegroundColor Red
    Write-Host "   Please fix the following before starting:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "💡 Quick Fix:" -ForegroundColor Yellow
    Write-Host "   1. Edit server\.env file" -ForegroundColor White
    Write-Host "   2. Set required values (especially JWT_SECRET)" -ForegroundColor White
    Write-Host "   3. Generate JWT_SECRET with:" -ForegroundColor White
    Write-Host "      node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`"" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  WARNINGS: $($warnings.Count)" -ForegroundColor Yellow
    Write-Host "   The server may start but some features might not work:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "🚀 You can still start the server:" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 For more information:" -ForegroundColor Cyan
Write-Host "   - See .env.example for all available options" -ForegroundColor Gray
Write-Host "   - Read DEPLOYMENT.md for production setup" -ForegroundColor Gray
Write-Host "   - Check PRODUCTION_CHECKLIST.md before deploying" -ForegroundColor Gray
Write-Host ""
