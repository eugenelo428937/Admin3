# Frontend Deployment Diagnostic Script
# Check Railway frontend deployment status and logs

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Railway Frontend Deployment Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Change to frontend directory
Set-Location frontend/react-Admin3

Write-Host "1. Checking Railway service status..." -ForegroundColor Yellow
railway status --service admin3-frontend

Write-Host ""
Write-Host "2. Getting recent deployment logs (last 50 lines)..." -ForegroundColor Yellow
Write-Host "(This will show build and runtime logs)" -ForegroundColor Gray
Write-Host ""
railway logs --service admin3-frontend 2>&1 | Select-Object -Last 50

Write-Host ""
Write-Host "3. Checking environment variables..." -ForegroundColor Yellow
railway variables --service admin3-frontend

Write-Host ""
Write-Host "4. Testing frontend URL..." -ForegroundColor Yellow
$domain = "admin3-frontend-uat.up.railway.app"
Write-Host "Domain: $domain" -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "https://$domain/" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Frontend is accessible" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Frontend is not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
