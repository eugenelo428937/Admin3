# Admin3 Redis Windows Service Setup Script
# Robust Redis service installation function with comprehensive error handling

param(
    [string]$RedisDir = "C:\ProgramData\chocolatey\lib\redis\tools",
    [string]$ServiceName = "Redis"
)

# Install NSSM if not already installed
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    choco install nssm -y
    # Refresh PATH to include NSSM
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}

# Robust Redis service installation function
function Install-RedisService {
    param(
        [string]$ServiceName,
        [string]$RedisExecutable,
        [string]$ConfigFile
    )
    
    Write-Host "Installing Redis service: $ServiceName" -ForegroundColor Cyan
    
    # Step 1: Check for existing services and clean up
    $existingServices = Get-Service -Name "*Redis*" -ErrorAction SilentlyContinue
    if ($existingServices) {
        Write-Host "Found existing Redis services, cleaning up..." -ForegroundColor Yellow
        foreach ($service in $existingServices) {
            Write-Host "Stopping service: $($service.Name)" -ForegroundColor Yellow
            Stop-Service -Name $service.Name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            
            Write-Host "Removing service: $($service.Name)" -ForegroundColor Yellow
            try {
                nssm remove $service.Name confirm
            } catch {
                # Try alternative removal method
                sc.exe delete $service.Name
            }
        }
        Start-Sleep -Seconds 3
    }
    
    # Step 2: Validate prerequisites
    if (!(Test-Path $RedisExecutable)) {
        throw "Redis executable not found: $RedisExecutable"
    }
    if (!(Test-Path $ConfigFile)) {
        throw "Redis config file not found: $ConfigFile"
    }
    
    # Step 3: Install service with comprehensive configuration
    Write-Host "Installing new Redis service..." -ForegroundColor Green
    
    # Install the service
    $installResult = nssm install $ServiceName $RedisExecutable $ConfigFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Redis service. NSSM exit code: $LASTEXITCODE"
    }
    
    # Configure service parameters
    nssm set $ServiceName AppDirectory $RedisDir
    nssm set $ServiceName DisplayName "Redis Server"
    nssm set $ServiceName Description "Redis in-memory data structure store for Admin3"
    nssm set $ServiceName Start SERVICE_AUTO_START
    
    # Configure logging with proper paths
    nssm set $ServiceName AppStdout "C:\logs\redis\redis-stdout.log"
    nssm set $ServiceName AppStderr "C:\logs\redis\redis-stderr.log"
    nssm set $ServiceName AppRotateFiles 1
    nssm set $ServiceName AppRotateOnline 1
    nssm set $ServiceName AppRotateBytes 10485760  # 10MB
    
    # Configure service recovery
    nssm set $ServiceName AppThrottle 1500  # Throttle restart attempts
    nssm set $ServiceName AppExit 0 Restart  # Fixed: Use "0" instead of "Default"
    nssm set $ServiceName AppRestartDelay 5000  # 5 second delay between restarts
    
    Write-Host "Redis service configured successfully" -ForegroundColor Green
}

# Execute the installation
try {
    $redisExe = "$RedisDir\redis-server.exe"
    $redisConfig = "$RedisDir\redis.conf"
    
    Install-RedisService -ServiceName $ServiceName -RedisExecutable $redisExe -ConfigFile $redisConfig
    
    # Start the service with retry logic
    Write-Host "Starting Redis service..." -ForegroundColor Cyan
    $retryCount = 0
    $maxRetries = 3
    
    do {
        try {
            Start-Service -Name $ServiceName -ErrorAction Stop
            Set-Service -Name $ServiceName -StartupType Automatic
            break
        } catch {
            $retryCount++
            Write-Host "Service start attempt $retryCount failed: $($_.Exception.Message)" -ForegroundColor Yellow
            if ($retryCount -lt $maxRetries) {
                Write-Host "Retrying in 5 seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            } else {
                throw "Failed to start Redis service after $maxRetries attempts"
            }
        }
    } while ($retryCount -lt $maxRetries)
    
    # Verify service is running
    Start-Sleep -Seconds 5
    $redisStatus = Get-Service -Name $ServiceName
    Write-Host "Redis service status: $($redisStatus.Status)" -ForegroundColor $(if ($redisStatus.Status -eq "Running") {"Green"} else {"Red"})
    
    if ($redisStatus.Status -ne "Running") {
        throw "Redis service failed to start properly"
    }
    
    Write-Host "Redis service installation completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Error during Redis service installation: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the logs at C:\logs\redis\ for more details" -ForegroundColor Yellow
    
    # Display troubleshooting information
    Write-Host "`nTroubleshooting steps:" -ForegroundColor Cyan
    Write-Host "1. Check if Redis executable exists: Test-Path '$redisExe'" -ForegroundColor White
    Write-Host "2. Check if config file exists: Test-Path '$redisConfig'" -ForegroundColor White
    Write-Host "3. Check Windows Event Log for service errors" -ForegroundColor White
    Write-Host "4. Run: nssm status $ServiceName" -ForegroundColor White
    Write-Host "5. Check logs: Get-Content 'C:\logs\redis\redis-stderr.log' -Tail 20" -ForegroundColor White
}