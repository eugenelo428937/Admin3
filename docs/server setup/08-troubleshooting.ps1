# Admin3 Troubleshooting Script
# Comprehensive system health checks and diagnostics

# Troubleshooting checklist script
function Test-ServiceStatus {
    $services = @("Admin3-Waitress", "Redis", "W3SVC")
    
    Write-Host "Service Status Check:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    foreach ($service in $services) {
        $status = Get-Service -Name $service -ErrorAction SilentlyContinue
        if ($status) {
            Write-Host "$service`: $($status.Status)" -ForegroundColor $(if ($status.Status -eq "Running") {"Green"} else {"Red"})
        } else {
            Write-Host "$service`: Not Found" -ForegroundColor "Red"
        }
    }
}

function Test-DatabaseConnection {
    Write-Host "`nDatabase Connection Test:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    try {
        $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
        $env:PGHOST = $env:DB_HOST
        $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "actedadmin" }
        $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "acteddbdev01" }
        $result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U $dbUser -d $dbName -c "SELECT 1;"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database connection: OK" -ForegroundColor "Green"
        } else {
            Write-Host "Database connection: FAILED" -ForegroundColor "Red"
        }
    } catch {
        Write-Host "Database connection: ERROR - $_" -ForegroundColor "Red"
    } finally {
        $env:PGPASSWORD = $null
        $env:PGHOST = $null
    }
}

function Test-RedisConnection {
    Write-Host "`nRedis Connection Test:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    
    try {
        $result = redis-cli ping
        if ($result -eq "PONG") {
            Write-Host "Redis connection: OK" -ForegroundColor "Green"
        } else {
            Write-Host "Redis connection: FAILED" -ForegroundColor "Red"
        }
    } catch {
        Write-Host "Redis connection: ERROR - $_" -ForegroundColor "Red"
    }
}

function Test-WebsiteResponse {
    Write-Host "`nWebsite Response Test:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 10
        Write-Host "Website response: $($response.StatusCode)" -ForegroundColor "Green"
    } catch {
        Write-Host "Website response: ERROR - $_" -ForegroundColor "Red"
    }
}

function Test-APIResponse {
    Write-Host "`nAPI Response Test:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -TimeoutSec 10
        Write-Host "API response: $($response.StatusCode)" -ForegroundColor "Green"
    } catch {
        Write-Host "API response: ERROR - $_" -ForegroundColor "Red"
    }
}

function Show-RecentErrors {
    Write-Host "`nRecent Error Logs:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    $logPath = "C:\logs\admin3"
    
    if (-not (Test-Path $logPath)) {
        Write-Host "Log directory not found: $logPath" -ForegroundColor "Yellow"
        return
    }
    
    $logFiles = Get-ChildItem -Path $logPath -Filter "*.log"
    
    foreach ($logFile in $logFiles) {
        $errors = Get-Content $logFile.FullName | Select-String -Pattern "ERROR|CRITICAL" | Select-Object -Last 5
        if ($errors) {
            Write-Host "`nRecent errors in $($logFile.Name):" -ForegroundColor "Yellow"
            $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor "Red" }
        }
    }
}

function Test-SystemResources {
    Write-Host "`nSystem Resources:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    # CPU usage
    $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
    Write-Host "CPU Usage: $([math]::Round($cpu.Average, 2))%" -ForegroundColor $(if ($cpu.Average -gt 80) {"Red"} else {"Green"})
    
    # Memory usage
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
    Write-Host "Memory Usage: $memoryUsage%" -ForegroundColor $(if ($memoryUsage -gt 85) {"Red"} else {"Green"})
    
    # Disk usage
    $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    foreach ($drive in $disk) {
        $diskUsage = [math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
        Write-Host "Disk $($drive.DeviceID) Usage: $diskUsage%" -ForegroundColor $(if ($diskUsage -gt 90) {"Red"} else {"Green"})
    }
}

function Test-NetworkConnectivity {
    Write-Host "`nNetwork Connectivity:" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
    # Test external connectivity
    $sites = @("google.com", "github.com", "pypi.org")
    
    foreach ($site in $sites) {
        try {
            $result = Test-NetConnection -ComputerName $site -Port 443 -InformationLevel "Quiet"
            Write-Host "Connectivity to $site`: $($result)" -ForegroundColor $(if ($result) {"Green"} else {"Red"})
        } catch {
            Write-Host "Connectivity to $site`: ERROR" -ForegroundColor "Red"
        }
    }
}

# Performance diagnosis script
function Test-DatabasePerformance {
    Write-Host "`nDatabase Performance:" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
    try {
        $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
        
        # Check database size
        $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "admin3_user" }
        $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "Admin3_Production" }
        $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
        $dbSize = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
        
        Write-Host "Database Size: $dbSize" -ForegroundColor "Green"
        
    } catch {
        Write-Host "Database performance check failed: $_" -ForegroundColor "Red"
    } finally {
        $env:PGPASSWORD = $null
    }
}

# Run all tests
Write-Host "Admin3 System Health Check" -ForegroundColor "Cyan"
Write-Host "=========================" -ForegroundColor "Cyan"

Test-ServiceStatus
Test-DatabaseConnection
Test-RedisConnection
Test-WebsiteResponse
Test-APIResponse
Test-SystemResources
Test-NetworkConnectivity
Test-DatabasePerformance
Show-RecentErrors

Write-Host "`nTroubleshooting completed!" -ForegroundColor "Green"