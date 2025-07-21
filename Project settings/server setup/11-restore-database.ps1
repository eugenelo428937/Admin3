# Admin3 Database Recovery Script
# Database Recovery Script

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DatabaseName = "Admin3_Production",
    [string]$NewDatabaseName = "Admin3_Production_Restored",
    [switch]$Force
)

# Set PostgreSQL environment variables
$env:PGPASSWORD = $env:DB_PASSWORD
$env:PGUSER = "postgres"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"

try {
    Write-Host "Starting database restore..." -ForegroundColor Cyan
    
    # Check if backup file exists
    if (-not (Test-Path $BackupFile)) {
        Write-Error "Backup file not found: $BackupFile"
        exit 1
    }
    
    # Decompress if needed
    if ($BackupFile.EndsWith(".7z")) {
        $extractPath = Split-Path $BackupFile -Parent
        $extractedFile = $BackupFile.Replace(".7z", "")
        
        Write-Host "Extracting backup file..." -ForegroundColor Yellow
        & "C:\Program Files\7-Zip\7z.exe" x $BackupFile -o$extractPath
        $BackupFile = $extractedFile
    }
    
    # Create new database
    Write-Host "Creating database: $NewDatabaseName" -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres $NewDatabaseName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database created successfully" -ForegroundColor Green
        
        # Restore from backup
        Write-Host "Restoring from backup..." -ForegroundColor Yellow
        & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d $NewDatabaseName -f $BackupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database restored successfully" -ForegroundColor Green
            
            if ($Force) {
                Write-Host "Dropping original database and renaming restored database..." -ForegroundColor Yellow
                & "C:\Program Files\PostgreSQL\16\bin\dropdb.exe" -U postgres $DatabaseName
                & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "ALTER DATABASE `"$NewDatabaseName`" RENAME TO `"$DatabaseName`";"
            }
            
        } else {
            Write-Error "Database restore failed"
            exit 1
        }
        
    } else {
        Write-Error "Failed to create database"
        exit 1
    }
    
} catch {
    Write-Error "Database restore process failed: $_"
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}