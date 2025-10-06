# Test HTTPS setup
Write-Host "Testing HTTPS setup..." -ForegroundColor Green

# Check if nginx is running
$nginxProcess = Get-Process nginx -ErrorAction SilentlyContinue
if ($nginxProcess) {
    Write-Host "✓ nginx is running (PID: $($nginxProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "✗ nginx is not running" -ForegroundColor Red
    Write-Host "Run the setup script first: .\nginx_standard_ports.ps1" -ForegroundColor Yellow
    exit
}

# Test Django backend
Write-Host "Testing Django backend..." -ForegroundColor Yellow
try {
    $djangoResponse = Invoke-WebRequest -Uri "http://127.0.0.1:8888/api/utils/health/" -TimeoutSec 5
    if ($djangoResponse.StatusCode -eq 200) {
        Write-Host "✓ Django backend responding on port 8888" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Django backend not responding on port 8888" -ForegroundColor Red
    Write-Host "Make sure Django is running: python manage.py runserver 0.0.0.0:8888" -ForegroundColor Yellow
}

# Test React frontend
Write-Host "Testing React frontend..." -ForegroundColor Yellow
try {
    $reactResponse = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 5
    if ($reactResponse.StatusCode -eq 200) {
        Write-Host "✓ React frontend responding on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ React frontend not responding on port 3000" -ForegroundColor Red
    Write-Host "Make sure React is running: npm start" -ForegroundColor Yellow
}

# Test HTTPS proxy (skip certificate validation for self-signed)
Write-Host "Testing HTTPS proxy..." -ForegroundColor Yellow
try {
    # Disable certificate validation for testing
    add-type @"
        using System.Net;
        using System.Security.Cryptography.X509Certificates;
        public class TrustAllCertsPolicy : ICertificatePolicy {
            public bool CheckValidationResult(
                ServicePoint srvPoint, X509Certificate certificate,
                WebRequest request, int certificateProblem) {
                return true;
            }
        }
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

    $httpsResponse = Invoke-WebRequest -Uri "https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/api/utils/health/" -TimeoutSec 10
    if ($httpsResponse.StatusCode -eq 200) {
        Write-Host "✓ HTTPS proxy working correctly" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ HTTPS proxy not working: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
Write-Host "If all tests pass, your app should be available at:" -ForegroundColor Yellow
Write-Host "https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/" -ForegroundColor White

Write-Host "`nIf tests fail:" -ForegroundColor Yellow
Write-Host "1. Make sure Django is running: python manage.py runserver 0.0.0.0:8888" -ForegroundColor Gray
Write-Host "2. Make sure React is running: npm start" -ForegroundColor Gray
Write-Host "3. Check nginx config and restart if needed" -ForegroundColor Gray