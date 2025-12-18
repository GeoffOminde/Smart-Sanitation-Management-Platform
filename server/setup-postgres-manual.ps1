# Manual PostgreSQL Setup for Smart Sanitation Platform
Write-Host "PostgreSQL Database Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Database configuration
$dbName = "smart_sanitation"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

Write-Host "Please enter your PostgreSQL password for user 'postgres':" -ForegroundColor Yellow
$dbPassword = Read-Host -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# URL-encode the password
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($dbPasswordPlain)

# Build connection string
$connectionString = "postgresql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}"

Write-Host ""
Write-Host "Connection string created (password is URL-encoded)" -ForegroundColor Green
Write-Host ""

# Update .env file
$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Replace or add DATABASE_URL
    if ($envContent -match 'DATABASE_URL=') {
        $envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$connectionString`""
        $envContent = $envContent -replace 'DATABASE_URL=[^\r\n]*', "DATABASE_URL=`"$connectionString`""
    } else {
        $envContent += "`r`nDATABASE_URL=`"$connectionString`""
    }
    
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host ".env file updated successfully!" -ForegroundColor Green
} else {
    Write-Host "Error: .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Now you need to create the database manually:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Using pgAdmin (GUI)" -ForegroundColor Cyan
Write-Host "  1. Open pgAdmin" 
Write-Host "  2. Connect to your PostgreSQL server"
Write-Host "  3. Right-click on 'Databases' -> Create -> Database"
Write-Host "  4. Name it: $dbName"
Write-Host ""
Write-Host "Option 2: Using psql command line" -ForegroundColor Cyan
Write-Host "  Run this command in a new terminal:"
Write-Host "  `"C:\Program Files\PostgreSQL\*\bin\psql.exe`" -U postgres -c `"CREATE DATABASE $dbName;`"" -ForegroundColor White
Write-Host ""
Write-Host "After creating the database, run:" -ForegroundColor Yellow
Write-Host "  npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "  npx prisma db seed" -ForegroundColor White
