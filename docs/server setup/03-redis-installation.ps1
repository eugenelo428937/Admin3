# Admin3 Redis Installation and Configuration Script
# Redis Cache Setup with Comprehensive Error Handling and Recovery

# Install Redis using chocolatey
choco install redis-64 -y

# Wait for installation to complete
Start-Sleep -Seconds 10

# Find Redis installation directory (Redis executables are in the redis folder, not redis-64)
$redisDir = "C:\ProgramData\chocolatey\lib\redis\tools"

# Verify Redis server executable exists
if (Test-Path "$redisDir\redis-server.exe") {
    Write-Host "Redis installed in: $redisDir" -ForegroundColor Green
} else {
    Write-Host "Redis installation not found, checking alternative locations..." -ForegroundColor Yellow
    # Alternative search if not in expected location
    $redisPath = Get-ChildItem -Path "C:\ProgramData\chocolatey\lib" -Recurse -Name "redis-server.exe" | Select-Object -First 1
    if ($redisPath) {
        $redisDir = Split-Path $redisPath -Parent
        Write-Host "Redis found in: $redisDir" -ForegroundColor Green
    } else {
        Write-Error "Redis installation not found. Please check chocolatey installation."
        exit 1
    }
}

# Create Redis configuration file
$redisConfig = "$redisDir\redis.conf"
$redisPassword = if ($env:REDIS_PASSWORD) { $env:REDIS_PASSWORD } else { "R3d1sP@ssW" }
$configContent = @"
# Redis Configuration for Admin3
port 6379
bind 127.0.0.1
protected-mode yes
requirepass $redisPassword

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 300 10
save 60 1000

# Logging
loglevel notice
logfile "C:\\logs\\redis\\redis.log"

# Windows specific
tcp-keepalive 60
timeout 0
"@

# Create logs directory
New-Item -ItemType Directory -Path "C:\logs\redis" -Force

# Write configuration file
$configContent | Out-File -FilePath $redisConfig -Encoding UTF8

Write-Host "Redis configuration created at: $redisConfig"