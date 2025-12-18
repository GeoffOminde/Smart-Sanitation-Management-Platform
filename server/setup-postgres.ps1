# Setup PostgreSQL for Smart Sanitation Platform
Write-Host "Setting up PostgreSQL database..." -ForegroundColor Cyan

# Find PostgreSQL installation
$pgPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory | Sort-Object Name -Descending | Select-Object -First 1
if (-not $pgPath) {
    Write-Host "PostgreSQL installation not found!" -ForegroundColor Red
    exit 1
}

$psqlPath = Join-Path $pgPath.FullName "bin\psql.exe"
Write-Host "Found PostgreSQL at: $($pgPath.FullName)" -ForegroundColor Green

# Database configuration
$dbName = "smart_sanitation"
$dbUser = "postgres"
Write-Host "`nPlease enter your PostgreSQL password for user 'postgres':" -ForegroundColor Yellow
$dbPassword = Read-Host -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Test connection
Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Cyan
$env:PGPASSWORD = $dbPasswordPlain
& $psqlPath -U $dbUser -c "SELECT version();" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to PostgreSQL. Please check your password." -ForegroundColor Red
    exit 1
}
Write-Host "Connection successful!" -ForegroundColor Green

# Create database
Write-Host "`nCreating database '$dbName'..." -ForegroundColor Cyan
& $psqlPath -U $dbUser -c "DROP DATABASE IF EXISTS $dbName;" 2>&1 | Out-Null
& $psqlPath -U $dbUser -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to create database." -ForegroundColor Red
    exit 1
}

# Update .env file
$connectionString = "postgresql://${dbUser}:${dbPasswordPlain}@localhost:5432/${dbName}"
$envPath = Join-Path $PSScriptRoot ".env"

Write-Host "`nUpdating .env file..." -ForegroundColor Cyan
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match 'DATABASE_URL=.*') {
        $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$connectionString`""
    } else {
        $envContent += "`nDATABASE_URL=`"$connectionString`""
    }
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host ".env file updated!" -ForegroundColor Green
} else {
    Write-Host ".env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PostgreSQL setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npx prisma migrate dev --name init"
Write-Host "2. Run: npx prisma db seed"
Write-Host "3. Run: npm start"
