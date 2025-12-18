# Simple DATABASE_URL updater
Write-Host "Enter your PostgreSQL password:" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# URL encode the password
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

$connectionString = "postgresql://postgres:${encodedPassword}@localhost:5432/smart_sanitation"

Write-Host "`nYour DATABASE_URL is:" -ForegroundColor Cyan
Write-Host $connectionString -ForegroundColor White
Write-Host "`nCopy this and manually update your .env file" -ForegroundColor Yellow
Write-Host "Replace the DATABASE_URL line with:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=`"$connectionString`"" -ForegroundColor Green

# Also save to a temp file
$connectionString | Out-File -FilePath "db-url.txt" -NoNewline
Write-Host "`nAlso saved to: db-url.txt" -ForegroundColor Cyan
