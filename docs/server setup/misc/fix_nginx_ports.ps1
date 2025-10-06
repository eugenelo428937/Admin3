# Fix nginx port conflicts
Write-Host "Checking what's using port 80..." -ForegroundColor Yellow

# Check what's using port 80
$port80 = netstat -ano | Select-String ":80 " | Select-Object -First 5
Write-Host "Services using port 80:" -ForegroundColor Red $port80

# Option 1: Stop IIS if it's running
Write-Host "Attempting to stop IIS..." -ForegroundColor Yellow
try {
    Stop-Service W3SVC -Force -ErrorAction SilentlyContinue
    Stop-Service WAS -Force -ErrorAction SilentlyContinue
    Write-Host "IIS stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "Could not stop IIS: $_" -ForegroundColor Red
}

# Option 2: Install nginx on different ports
Write-Host "Installing nginx with custom ports..." -ForegroundColor Yellow

# Uninstall previous failed attempt
choco uninstall nginx -y --force

# Install nginx
choco install nginx -y --params="'/InstallLocation:C:\nginx /Port:8080'"

# Create custom nginx config for ports 8080 (HTTP) and 8443 (HTTPS)
$nginxConfig = @"
"@

Write-Host "nginx will be available on:" -ForegroundColor Green
Write-Host "HTTP:  http://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com:8080" -ForegroundColor Yellow
Write-Host "HTTPS: https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com:8443" -ForegroundColor Yellow