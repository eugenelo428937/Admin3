# C:\scripts\emergency_rollback.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupTimestamp,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-EmergencyLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [EMERGENCY] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor "Red"
    Add-Content -Path "C:\logs\admin3\emergency.log" -Value $logEntry
}

try {
    Write-EmergencyLog "Starting emergency rollback procedure..."
    
    if (-not $Force) {
        $confirm = Read-Host "Are you sure you want to perform emergency rollback? (yes/no)"
        if ($confirm -ne "yes") {
            Write-EmergencyLog "Emergency rollback cancelled by user"
            exit 0
        }
    }
    
    # Stop all services
    Write-EmergencyLog "Stopping all services..."
    Stop-Service -Name "Admin3-Waitress" -Force
    Stop-WebSite -Name "Admin3"
    Stop-Service -Name "postgresql-x64-16" -Force
    
    # Restore database
    Write-EmergencyLog "Restoring database from backup..."
    $databaseBackup = "C:\backups\postgresql\admin3_backup_$BackupTimestamp.7z"
    & "C:\scripts\restore_database.ps1" -BackupFile $databaseBackup -Force
    
    # Restore application files
    Write-EmergencyLog "Restoring application files..."
    $appBackup = "C:\backups\application\admin3_app_backup_$BackupTimestamp.7z"
    & "C:\Program Files\7-Zip\7z.exe" x $appBackup -o"C:\inetpub\wwwroot -aoa
    
    # Start services
    Write-EmergencyLog "Starting services..."
    Start-Service -Name "postgresql-x64-16"
    Start-Sleep -Seconds 30
    Start-Service -Name "Admin3-Waitress"
    Start-WebSite -Name "Admin3"
    
    # Wait and test
    Start-Sleep -Seconds 60
    
    # Health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-EmergencyLog "Emergency rollback completed successfully!"
        } else {
            Write-EmergencyLog "Emergency rollback completed but health check failed" -Level "WARNING"
        }
    } catch {
        Write-EmergencyLog "Emergency rollback completed but health check failed: $_" -Level "ERROR"
    }
    
} catch {
    Write-EmergencyLog "Emergency rollback failed: $_" -Level "ERROR"
    exit 1
}