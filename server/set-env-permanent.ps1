# Set DATABASE_URL as a permanent user environment variable
Write-Host "Setting DATABASE_URL as permanent environment variable..." -ForegroundColor Cyan

$dbUrl = Get-Content (Join-Path $PSScriptRoot "db-url.txt") -Raw
$dbUrl = $dbUrl -replace 'localhost', '127.0.0.1'

# Set for current user (permanent)
[System.Environment]::SetEnvironmentVariable('DATABASE_URL', $dbUrl, [System.EnvironmentVariableTarget]::User)

Write-Host "DATABASE_URL has been set permanently for your user account" -ForegroundColor Green
Write-Host ""
Write-Host "Value: $dbUrl"
Write-Host ""
Write-Host "Note: You may need to restart your terminal/IDE for the change to take effect"
