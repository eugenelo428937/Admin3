function Test-DatabasePerformance {
    try {
        $env:PGPASSWORD = $env:DB_PASSWORD
        
        # Check slow queries
        $slowQueries = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U $env:DB_USER -d $env:DB_HOST-c "
            SELECT query, calls, total_time, mean_time, rows
            FROM pg_stat_statements
            WHERE mean_time > 1000
            ORDER BY mean_time DESC
            LIMIT 10;
        "
        
        Write-Host "Top 10 Slow Queries:" -ForegroundColor "Yellow"
        Write-Host $slowQueries
        
        # Check database size
        $dbSize = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U $env:DB_APP_USER -d $env:DB_APP_NAME -c "
            SELECT pg_size_pretty(pg_database_size(current_database()));
        "
        
        Write-Host "Database Size: $dbSize" -ForegroundColor "Green"
        
    } catch {
        Write-Host "Database performance check failed: $_" -ForegroundColor "Red"
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Test-SystemResources {
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

# Run performance diagnostics
Write-Host "Admin3 Performance Diagnostics" -ForegroundColor "Cyan"
Write-Host "==============================" -ForegroundColor "Cyan"

Test-SystemResources
Test-DatabasePerformance
Test-NetworkConnectivity