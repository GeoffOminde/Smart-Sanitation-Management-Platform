# M-Pesa Configuration Setup Script
# This script adds M-Pesa credentials to your .env file

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "M-Pesa Configuration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".\server\.env"
$configFile = ".\server\.env.mpesa.config"

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    New-Item -Path $envFile -ItemType File -Force | Out-Null
}

# M-Pesa configuration
$mpesaConfig = @"

# ============================================
# M-Pesa Configuration (Added: $(Get-Date -Format 'yyyy-MM-dd HH:mm'))
# ============================================
MPESA_CONSUMER_KEY=your_mpesa_consumer_key_here
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret_here
MPESA_PASSKEY=your_mpesa_passkey_here
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
# ============================================

"@

# Check if M-Pesa config already exists
$currentContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
if ($currentContent -match "MPESA_CONSUMER_KEY") {
    Write-Host "⚠️  M-Pesa configuration already exists in .env file" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to replace it? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        # Remove old M-Pesa config
        $lines = Get-Content $envFile
        $newLines = @()
        $skipMode = $false
        
        foreach ($line in $lines) {
            if ($line -match "^# .*M-Pesa Configuration") {
                $skipMode = $true
            }
            if ($skipMode -and $line -match "^# ====") {
                if ($line -match "# ====$") {
                    $skipMode = $false
                }
                continue
            }
            if (-not $skipMode -and $line -notmatch "^MPESA_") {
                $newLines += $line
            }
        }
        
        $newLines | Set-Content $envFile
        Write-Host "✅ Removed old M-Pesa configuration" -ForegroundColor Green
    } else {
        Write-Host "❌ Setup cancelled" -ForegroundColor Red
        exit
    }
}

# Add M-Pesa configuration
Add-Content -Path $envFile -Value $mpesaConfig

Write-Host "✅ M-Pesa credentials added to .env file!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Check if you have a different Passkey in Daraja portal" -ForegroundColor White
Write-Host "   If yes, update MPESA_PASSKEY in server/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart your server:" -ForegroundColor White
Write-Host "   - Press Ctrl+C to stop the current server" -ForegroundColor Gray
Write-Host "   - Run: cd server && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test M-Pesa payment:" -ForegroundColor White
Write-Host "   - Use test phone: 254708374149" -ForegroundColor Gray
Write-Host "   - Use test amount: 1 KES" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show current .env content (masked)
Write-Host "Current .env file preview:" -ForegroundColor Yellow
$content = Get-Content $envFile
foreach ($line in $content) {
    if ($line -match "MPESA_CONSUMER_KEY=(.+)") {
        Write-Host "MPESA_CONSUMER_KEY=***${($matches[1].Substring($matches[1].Length - 10))}" -ForegroundColor Gray
    } elseif ($line -match "MPESA_CONSUMER_SECRET=(.+)") {
        Write-Host "MPESA_CONSUMER_SECRET=***${($matches[1].Substring($matches[1].Length - 10))}" -ForegroundColor Gray
    } elseif ($line -match "MPESA_PASSKEY=(.+)") {
        Write-Host "MPESA_PASSKEY=***${($matches[1].Substring($matches[1].Length - 10))}" -ForegroundColor Gray
    } elseif ($line -match "MPESA_") {
        Write-Host $line -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
