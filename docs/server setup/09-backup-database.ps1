# Admin3 Database Backup Script
# Automated PostgreSQL Backup Script

param(
    [string]$DatabaseName = $env:DB_APP_NAME,
    [string]$BackupPath = "C:\backups\postgresql",
    [string]$S3Bucket = $env:AWS_S3_BUCKET,
    [int]$RetentionDays = $env:BACKUP_RETENTION_DAYS -as [int]
)

# Set defaults if environment variables are not set
if (-not $DatabaseName) { $DatabaseName = "Admin3_Production" }
if (-not $S3Bucket) { $S3Bucket = "admin3-backups" }
if (-not $RetentionDays) { $RetentionDays = 30 }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupPath\admin3_backup_$timestamp.sql"
$compressedFile = "$BackupPath\admin3_backup_$timestamp.7z"

# Create backup directory
New-Item -ItemType Directory -Path $BackupPath -Force

# Set PostgreSQL environment variables
$env:PGPASSWORD = $env:DB_BACKUP_PASSWORD
$env:PGUSER = $env:DB_BACKUP_USER
$env:PGHOST = if ($env:DB_HOST -and $env:DB_HOST -ne "acteddevdb01.crueqe6us4nv.eu-west-2.rds.amazonaws.com") { $env:DB_HOST } else { "localhost" }
$env:PGPORT = "5432"

try {
    Write-Host "Starting database backup..." -ForegroundColor Cyan
    
    # Create database backup
    & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -d $DatabaseName -f $backupFile --verbose
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database backup completed successfully" -ForegroundColor Green
        
        # Compress backup
        & "C:\Program Files\7-Zip\7z.exe" a -t7z -mx9 $compressedFile $backupFile
        
        # Remove uncompressed file
        Remove-Item $backupFile -Force
        
        # Upload to S3 (if AWS CLI is configured)
        if (Get-Command aws -ErrorAction SilentlyContinue) {
            aws s3 cp $compressedFile "s3://$S3Bucket/database/"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Backup uploaded to S3 successfully" -ForegroundColor Green
            } else {
                Write-Error "Failed to upload backup to S3"
            }
        } else {
            Write-Host "AWS CLI not found, skipping S3 upload" -ForegroundColor Yellow
        }
        
        # Clean up old local backups
        Get-ChildItem -Path $BackupPath -Filter "*.7z" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
        
    } else {
        Write-Error "Database backup failed"
        exit 1
    }
    
} catch {
    Write-Error "Backup process failed: $_"
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}