$Headers = @{ "Content-Type" = "application/json" }
$UnitBody = @{
    serialNo = "UNIT-PS"
    location = "PowerShell Lab"
    fillLevel = 50
    batteryLevel = 100
    status = "active"
    coordinates = @(-1.2, 36.8)
} | ConvertTo-Json -Depth 5

Write-Host "Creating Unit..."
try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:3001/api/units" -Method Post -Headers $Headers -Body $UnitBody -ErrorAction SilentlyContinue
    Write-Host "Unit API Response: $($r1 | ConvertTo-Json -Depth 2)"
} catch {
    Write-Host "Unit creation failed or already exists (Status: $_)"
}

$IoTBody = @{
    serialNo = "UNIT-PS"
    fillLevel = 88.8
    batteryLevel = 12.5
    lat = -1.2
    lng = 36.8
} | ConvertTo-Json -Depth 5

Write-Host "`nSending Telemetry..."
try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:3001/api/iot/telemetry" -Method Post -Headers $Headers -Body $IoTBody
    Write-Host "IoT API Response: $($r2 | ConvertTo-Json -Depth 2)"
    if ($r2.success -eq $true -and $r2.unit.fillLevel -eq 88.8) {
        Write-Host "`n✅ SUCCESS: End-to-End IoT Test Passed!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ FAILED: IoT Response invalid" -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ FAILED: Request Error $_" -ForegroundColor Red
}
