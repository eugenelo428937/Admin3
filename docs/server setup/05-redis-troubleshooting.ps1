# Admin3 Redis Troubleshooting and Recovery Script
# Comprehensive Redis service diagnostics and recovery procedures

param(
    [string]$ServiceName = "Redis",
    [switch]$DiagnoseOnly,
    [switch]$ForceReset
)

# Test Redis connection with fallback for password/no-password configurations
function Test-RedisConnection {
    try {
        # Install Redis CLI if not available
        if (-not (Get-Command redis-cli -ErrorAction SilentlyContinue)) {
            $env:PATH += ";C:\ProgramData\chocolatey\lib\redis\tools"
        }
        
        Write-Host "Testing Redis connection..." -ForegroundColor Cyan
        
        # First try without password (common in minimal configs)
        $result = redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Write-Host "✅ Redis connection successful (no password)" -ForegroundColor Green
            return $true
        } else {
            # Try with password if no-password failed
            Write-Host "Trying with password..." -ForegroundColor Yellow
            $redisPassword = if ($env:REDIS_PASSWORD) { $env:REDIS_PASSWORD } else { "R3d1sP@ssW" }
            $result = redis-cli -a "$redisPassword" ping 2>$null
            if ($result -eq "PONG") {
                Write-Host "✅ Redis connection successful (with password)" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Redis connection failed" -ForegroundColor Red
                
                # Additional diagnostics
                Write-Host "`nDiagnostic information:" -ForegroundColor Cyan
                Write-Host "- Check if Redis service is running: nssm status Redis" -ForegroundColor White
                Write-Host "- Check Redis logs: Get-Content 'C:\logs\redis\redis.log' -Tail 10" -ForegroundColor White
                Write-Host "- Test basic connectivity: redis-cli ping" -ForegroundColor White
                return $false
            }
        }
    } catch {
        Write-Host "❌ Redis connection error: $_" -ForegroundColor Red
        return $false
    }
}

# Comprehensive Redis service diagnostics
function Diagnose-RedisService {
    param([string]$ServiceName = "Redis")
    
    Write-Host "Redis Service Diagnostics" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    # 1. Check service configuration
    Write-Host "`n1. Service Configuration:" -ForegroundColor Yellow
    try {
        $serviceInfo = nssm dump $ServiceName
        Write-Host "Service exists and configuration:" -ForegroundColor Green
        $serviceInfo | Select-String "Application|AppDirectory|AppParameters" | ForEach-Object { Write-Host "  $_" }
    } catch {
        Write-Host "Service not found or NSSM error: $_" -ForegroundColor Red
        return
    }
    
    # 2. Check executable and config files
    Write-Host "`n2. File Validation:" -ForegroundColor Yellow
    $appPath = (nssm get $ServiceName Application)
    $configPath = (nssm get $ServiceName AppParameters) -replace '--config ', ''
    
    if (Test-Path $appPath) {
        Write-Host "Redis executable found: $appPath" -ForegroundColor Green
    } else {
        Write-Host "Redis executable MISSING: $appPath" -ForegroundColor Red
    }
    
    if (Test-Path $configPath) {
        Write-Host "Redis config found: $configPath" -ForegroundColor Green
    } else {
        Write-Host "Redis config MISSING: $configPath" -ForegroundColor Red
    }
    
    # 3. Check port availability
    Write-Host "`n3. Port Check:" -ForegroundColor Yellow
    $portInUse = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
    if ($portInUse) {
        $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "Port 6379 in use by: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
    } else {
        Write-Host "Port 6379 available" -ForegroundColor Green
    }
    
    # 4. Check logs
    Write-Host "`n4. Recent Logs:" -ForegroundColor Yellow
    $logPaths = @(
        "C:\logs\redis\redis-stderr.log",
        "C:\logs\redis\redis-stdout.log",
        "C:\logs\redis\redis.log"
    )
    
    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath) {
            Write-Host "  $logPath (last 3 lines):" -ForegroundColor Cyan
            Get-Content $logPath -Tail 3 | ForEach-Object { Write-Host "    $_" }
        }
    }
    
    # 5. Windows Event Log
    Write-Host "`n5. Windows Event Log (System):" -ForegroundColor Yellow
    try {
        $events = Get-WinEvent -FilterHashtable @{LogName='System'; ID=7000,7001,7009,7023,7024; StartTime=(Get-Date).AddHours(-1)} -MaxEvents 5 -ErrorAction SilentlyContinue
        if ($events) {
            $events | Where-Object {$_.Message -like "*Redis*"} | ForEach-Object {
                Write-Host "  $($_.TimeCreated): $($_.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  No recent service errors found" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Could not access event log" -ForegroundColor Yellow
    }
}

# Complete Redis service reset (Most Effective Fix)
function Reset-RedisServiceComplete {
    Write-Host "Performing complete Redis service reset..." -ForegroundColor Cyan
    
    # Step 1: Stop and remove existing service
    try {
        $service = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "Stopping Redis service..." -ForegroundColor Yellow
            Stop-Service -Name "Redis" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            Write-Host "Removing Redis service..." -ForegroundColor Yellow
            nssm remove Redis confirm
        }
    } catch {
        Write-Host "Service removal: $_" -ForegroundColor Yellow
    }
    
    # Step 2: Kill any Redis processes
    Get-Process -Name "*redis*" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Step 3: Auto-detect Redis installation
    $redisDir = $null
    $possiblePaths = @(
        "C:\ProgramData\chocolatey\lib\redis-64\tools",
        "C:\ProgramData\chocolatey\lib\redis\tools", 
        "C:\Program Files\Redis",
        "C:\Redis"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\redis-server.exe") {
            $redisDir = $path
            Write-Host "Found Redis installation at: $redisDir" -ForegroundColor Green
            break
        }
    }
    
    if (-not $redisDir) {
        Write-Error "Redis installation not found. Install with: choco install redis-64 -y"
        return
    }
    
    # Step 4: Create minimal working config
    $redisExe = "$redisDir\redis-server.exe"
    $configFile = "$redisDir\redis-minimal.conf"
    
    $minimalConfig = @"
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300
loglevel notice
databases 16
save 900 1
save 300 10
save 60 10000
maxmemory 256mb
maxmemory-policy allkeys-lru
"@
    
    $minimalConfig | Out-File -FilePath $configFile -Encoding ASCII
    Write-Host "Created minimal Redis config: $configFile" -ForegroundColor Green
    
    # Step 5: Install service with minimal config
    Write-Host "Installing Redis service with minimal configuration..." -ForegroundColor Cyan
    nssm install Redis $redisExe $configFile
    nssm set Redis AppDirectory $redisDir
    nssm set Redis DisplayName "Redis Server"
    nssm set Redis Start SERVICE_AUTO_START
    nssm set Redis AppExit 0 Restart  # Fixed syntax
    
    # Step 6: Start service
    Write-Host "Starting Redis service..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    nssm start Redis
    
    # Step 7: Verify
    Start-Sleep -Seconds 3
    $status = nssm status Redis
    Write-Host "Redis service status: $status" -ForegroundColor $(if($status -eq 'SERVICE_RUNNING') {'Green'} else {'Red'})
    
    if ($status -eq 'SERVICE_RUNNING') {
        Write-Host "✅ Redis service reset completed successfully!" -ForegroundColor Green
        
        # Test connection
        try {
            $redisCliPath = "$redisDir\redis-cli.exe"
            if (Test-Path $redisCliPath) {
                $result = & $redisCliPath ping
                if ($result -eq "PONG") {
                    Write-Host "✅ Redis connection test successful" -ForegroundColor Green
                }
            }
        } catch {
            Write-Host "⚠️ Could not test Redis connection, but service is running" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Redis service failed to start. Check Windows Event Log." -ForegroundColor Red
    }
}

# Quick status check
function Test-RedisHealth {
    $service = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
    $process = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    $port = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
    
    Write-Host "Redis Health Status:" -ForegroundColor Cyan
    Write-Host "Service: $($service.Status -replace '^$', 'Not Found')" -ForegroundColor $(if ($service.Status -eq 'Running') {'Green'} else {'Red'})
    Write-Host "Process: $(if($process) {'Running'} else {'Not Running'})" -ForegroundColor $(if($process) {'Green'} else {'Red'})
    Write-Host "Port 6379: $(if($port) {'Listening'} else {'Not Listening'})" -ForegroundColor $(if($port) {'Green'} else {'Red'})
}

# Main execution logic
if ($ForceReset) {
    Reset-RedisServiceComplete
} elseif ($DiagnoseOnly) {
    Test-RedisHealth
    Diagnose-RedisService -ServiceName $ServiceName
} else {
    # Full troubleshooting and recovery
    Test-RedisHealth
    
    if (Test-RedisConnection) {
        Write-Host "✅ Redis is working properly!" -ForegroundColor Green
    } else {
        Write-Host "🔧 Redis issues detected. Running diagnostics..." -ForegroundColor Yellow
        Diagnose-RedisService -ServiceName $ServiceName
        
        Write-Host "`nWould you like to perform a complete service reset? (y/n): " -ForegroundColor Yellow -NoNewline
        $choice = Read-Host
        if ($choice -eq 'y' -or $choice -eq 'Y') {
            Reset-RedisServiceComplete
        }
    }
}