# Admin3 Monitoring and Logging Setup Script
# PowerShell Log Monitoring Script

param(
    [string]$LogPath = "C:\logs\admin3",
    [string]$AlertEmail = $env:ALERT_EMAIL,
    [int]$CheckInterval = $env:MONITORING_CHECK_INTERVAL -as [int]
)

# Set defaults if environment variables are not set
if (-not $AlertEmail) { $AlertEmail = "admin@yourdomain.com" }
if (-not $CheckInterval) { $CheckInterval = 300 }

function Send-Alert {
    param([string]$Subject, [string]$Body)
    
    try {
        $smtpServer = if ($env:SMTP_HOST) { $env:SMTP_HOST } else { "smtp.yourdomain.com" }
        $fromEmail = if ($env:SERVER_EMAIL) { $env:SERVER_EMAIL } else { "server@yourdomain.com" }
        $smtpPort = if ($env:SMTP_PORT) { $env:SMTP_PORT -as [int] } else { 587 }
        
        Send-MailMessage -To $AlertEmail -From $fromEmail -Subject $Subject -Body $Body -SmtpServer $smtpServer -Port $smtpPort -UseSsl
        Write-Host "Alert sent: $Subject"
    } catch {
        Write-Error "Failed to send alert: $_"
    }
}

function Check-LogErrors {
    $logFiles = Get-ChildItem -Path $LogPath -Filter "*.log" -Recurse
    
    foreach ($logFile in $logFiles) {
        $recentErrors = Get-Content $logFile.FullName | Select-String -Pattern "ERROR|CRITICAL" | Select-Object -Last 10
        
        if ($recentErrors.Count -gt 0) {
            $subject = "Log Errors Detected - $($logFile.Name)"
            $body = "Recent errors found in $($logFile.FullName):`n`n$($recentErrors -join "`n")"
            Send-Alert -Subject $subject -Body $body
        }
    }
}

function Check-ServiceHealth {
    $services = @("Admin3-Waitress", "Redis")
    
    foreach ($service in $services) {
        $serviceStatus = Get-Service -Name $service -ErrorAction SilentlyContinue
        
        if ($serviceStatus.Status -ne "Running") {
            $subject = "Service Alert - $service"
            $body = "Service $service is not running. Status: $($serviceStatus.Status)"
            Send-Alert -Subject $subject -Body $body
            
            # Attempt to restart service
            try {
                Start-Service -Name $service
                Write-Host "Restarted service: $service"
            } catch {
                Write-Error "Failed to restart service $service: $_"
            }
        }
    }
}

function Check-DiskSpace {
    $drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    
    foreach ($drive in $drives) {
        $freeSpacePercent = ($drive.FreeSpace / $drive.Size) * 100
        
        if ($freeSpacePercent -lt 10) {
            $subject = "Low Disk Space Alert - Drive $($drive.DeviceID)"
            $body = "Drive $($drive.DeviceID) has only $([math]::Round($freeSpacePercent, 2))% free space remaining."
            Send-Alert -Subject $subject -Body $body
        }
    }
}

function Setup-Monitoring {
    Write-Host "Setting up monitoring and logging..." -ForegroundColor Cyan
    
    # Create log directories
    $logDirs = @("C:\logs\admin3", "C:\logs\iis", "C:\logs\system")
    
    foreach ($dir in $logDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force
        }
    }
    
    Write-Host "Log directories created successfully" -ForegroundColor Green
}

# Setup monitoring directories
Setup-Monitoring

# Main monitoring loop (if run continuously)
if ($args -contains "-Continuous") {
    while ($true) {
        Write-Host "Running health checks... $(Get-Date)"
        
        Check-LogErrors
        Check-ServiceHealth
        Check-DiskSpace
        
        Write-Host "Health checks completed. Sleeping for $CheckInterval seconds..."
        Start-Sleep -Seconds $CheckInterval
    }
} else {
    # Run once
    Write-Host "Running one-time health check..." -ForegroundColor Cyan
    Check-LogErrors
    Check-ServiceHealth
    Check-DiskSpace
    Write-Host "Health check completed." -ForegroundColor Green
}