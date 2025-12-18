# PowerShell Log Viewer for Windows
# Equivalent to 'tail -f' for viewing logs in real-time

param(
    [string]$LogFile = "server\logs\combined.log",
    [int]$Lines = 20,
    [switch]$Follow
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Smart Sanitation - Log Viewer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if log file exists
if (-not (Test-Path $LogFile)) {
    Write-Host "❌ Log file not found: $LogFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available log files:" -ForegroundColor Yellow
    
    $logsDir = "server\logs"
    if (Test-Path $logsDir) {
        Get-ChildItem $logsDir -Filter *.log | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "  No logs directory found. Server may not have started yet." -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\view-logs.ps1                          # View last 20 lines" -ForegroundColor White
    Write-Host "  .\view-logs.ps1 -Lines 50                # View last 50 lines" -ForegroundColor White
    Write-Host "  .\view-logs.ps1 -Follow                  # Follow logs (like tail -f)" -ForegroundColor White
    Write-Host "  .\view-logs.ps1 -LogFile server\logs\error.log  # View error logs" -ForegroundColor White
    exit 1
}

Write-Host "📄 Viewing: $LogFile" -ForegroundColor Cyan
Write-Host ""

if ($Follow) {
    Write-Host "👀 Following logs (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Show last few lines first
    Get-Content $LogFile -Tail $Lines | ForEach-Object {
        # Colorize based on log level
        if ($_ -match '"level":"error"') {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match '"level":"warn"') {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match '"level":"info"') {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_ -ForegroundColor White
        }
    }
    
    # Follow new lines
    Get-Content $LogFile -Wait -Tail 0 | ForEach-Object {
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Colorize based on log level
        if ($_ -match '"level":"error"') {
            Write-Host "[$timestamp] $_" -ForegroundColor Red
        } elseif ($_ -match '"level":"warn"') {
            Write-Host "[$timestamp] $_" -ForegroundColor Yellow
        } elseif ($_ -match '"level":"info"') {
            Write-Host "[$timestamp] $_" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] $_" -ForegroundColor White
        }
    }
} else {
    Write-Host "📋 Last $Lines lines:" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    Get-Content $LogFile -Tail $Lines | ForEach-Object {
        # Colorize based on log level
        if ($_ -match '"level":"error"') {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match '"level":"warn"') {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match '"level":"info"') {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_ -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "💡 Tip: Use -Follow to watch logs in real-time" -ForegroundColor Cyan
    Write-Host "   Example: .\view-logs.ps1 -Follow" -ForegroundColor Gray
}
