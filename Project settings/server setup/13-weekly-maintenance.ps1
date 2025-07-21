# Admin3 Weekly Maintenance Script
# Regular Maintenance Tasks

param(
    [string]$LogPath = "C:\logs\admin3",
    [string]$BackupPath = "C:\backups",
    [int]$LogRetentionDays = $env:LOG_RETENTION_DAYS -as [int],
    [int]$BackupRetentionDays = $env:BACKUP_RETENTION_DAYS -as [int]
)

# Set defaults if environment variables are not set
if (-not $LogRetentionDays) { $LogRetentionDays = 30 }
if (-not $BackupRetentionDays) { $BackupRetentionDays = 90 }

function Write-MaintenanceLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [MAINTENANCE] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path "$LogPath\maintenance.log" -Value $logEntry
}

function Clean-OldLogs {
    Write-MaintenanceLog "Cleaning old log files..."
    $cutoffDate = (Get-Date).AddDays(-$LogRetentionDays)
    
    Get-ChildItem -Path $LogPath -Filter "*.log" | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
        Write-MaintenanceLog "Removing old log file: $($_.Name)"
        Remove-Item $_.FullName -Force
    }
}

function Clean-OldBackups {
    Write-MaintenanceLog "Cleaning old backup files..."
    $cutoffDate = (Get-Date).AddDays(-$BackupRetentionDays)
    
    Get-ChildItem -Path $BackupPath -Filter "*.7z" -Recurse | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
        Write-MaintenanceLog "Removing old backup file: $($_.Name)"
        Remove-Item $_.FullName -Force
    }
}

function Update-SystemPatches {
    Write-MaintenanceLog "Checking for Windows updates..."
    try {
        if (Get-Module -ListAvailable -Name PSWindowsUpdate) {
            Get-WindowsUpdate -List | ForEach-Object {
                Write-MaintenanceLog "Available update: $($_.Title)"
            }
            
            # Install important updates only
            Get-WindowsUpdate -Install -AcceptAll -IgnoreReboot -Category "Important"
            Write-MaintenanceLog "Windows updates installed successfully"
        } else {
            Write-MaintenanceLog "PSWindowsUpdate module not available" -Level "WARNING"
        }
    } catch {
        Write-MaintenanceLog "Failed to install Windows updates: $_" -Level "ERROR"
    }
}

function Optimize-Database {
    Write-MaintenanceLog "Optimizing database..."
    try {
        $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
        
        $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "admin3_user" }
        $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "Admin3_Production" }
        $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
        
        # Update table statistics
        & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "ANALYZE;"
        
        # Vacuum database
        & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "VACUUM;"
        
        Write-MaintenanceLog "Database optimization completed"
    } catch {
        Write-MaintenanceLog "Database optimization failed: $_" -Level "ERROR"
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Check-DiskSpace {
    Write-MaintenanceLog "Checking disk space..."
    $drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    
    foreach ($drive in $drives) {
        $freeSpacePercent = ($drive.FreeSpace / $drive.Size) * 100
        Write-MaintenanceLog "Drive $($drive.DeviceID): $([math]::Round($freeSpacePercent, 2))% free"
        
        if ($freeSpacePercent -lt 15) {
            Write-MaintenanceLog "Low disk space warning for drive $($drive.DeviceID)" -Level "WARNING"
        }
    }
}

function Test-ApplicationHealth {
    Write-MaintenanceLog "Testing application health..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-MaintenanceLog "Application health check passed"
        } else {
            Write-MaintenanceLog "Application health check failed with status: $($response.StatusCode)" -Level "WARNING"
        }
    } catch {
        Write-MaintenanceLog "Application health check failed: $_" -Level "ERROR"
    }
}

# Run maintenance tasks
Write-MaintenanceLog "Starting weekly maintenance..."

Clean-OldLogs
Clean-OldBackups
Update-SystemPatches
Optimize-Database
Check-DiskSpace
Test-ApplicationHealth

Write-MaintenanceLog "Weekly maintenance completed"