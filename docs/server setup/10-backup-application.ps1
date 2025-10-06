# Admin3 Application Files Backup Script
# Application Files Backup

param(
    [string]$ApplicationPath = "C:\inetpub\wwwroot\Admin3",
    [string]$BackupPath = "C:\backups\application",
    [string]$S3Bucket = $env:AWS_S3_BUCKET,
    [int]$RetentionDays = $env:APP_BACKUP_RETENTION_DAYS -as [int]
)

# Set defaults if environment variables are not set
if (-not $S3Bucket) { $S3Bucket = "admin3-backups" }
if (-not $RetentionDays) { $RetentionDays = 7 }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupPath\admin3_app_backup_$timestamp.7z"

# Create backup directory
New-Item -ItemType Directory -Path $BackupPath -Force

# Exclude patterns
$excludePatterns = @(
    "*.pyc",
    "__pycache__",
    "node_modules",
    "*.log",
    ".git",
    ".venv"
)

try {
    Write-Host "Starting application backup..." -ForegroundColor Cyan
    
    # Create exclusion file for 7zip
    $excludeFile = "$BackupPath\exclude.txt"
    $excludePatterns | Out-File -FilePath $excludeFile -Encoding UTF8
    
    # Create compressed backup
    & "C:\Program Files\7-Zip\7z.exe" a -t7z -mx9 $backupFile $ApplicationPath "-xr@$excludeFile"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Application backup completed successfully" -ForegroundColor Green
        
        # Upload to S3 (if AWS CLI is configured)
        if (Get-Command aws -ErrorAction SilentlyContinue) {
            aws s3 cp $backupFile "s3://$S3Bucket/application/"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Application backup uploaded to S3 successfully" -ForegroundColor Green
            } else {
                Write-Error "Failed to upload application backup to S3"
            }
        } else {
            Write-Host "AWS CLI not found, skipping S3 upload" -ForegroundColor Yellow
        }
        
        # Clean up old local backups
        Get-ChildItem -Path $BackupPath -Filter "*app_backup*.7z" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
        
    } else {
        Write-Error "Application backup failed"
        exit 1
    }
    
} catch {
    Write-Error "Application backup process failed: $_"
    exit 1
} finally {
    # Clean up temp files
    if (Test-Path $excludeFile) {
        Remove-Item $excludeFile -Force
    }
}