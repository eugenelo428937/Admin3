# PowerShell script to run database migration from ACTEDDBDEVOLD to ACTEDDBDEV01
# This preserves IDs to maintain referential integrity

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Database Migration Script" -ForegroundColor Cyan
Write-Host "From: ACTEDDBDEVOLD" -ForegroundColor Yellow
Write-Host "To:   ACTEDDBDEV01" -ForegroundColor Yellow
Write-Host "Table: acted_products" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Set PostgreSQL connection parameters
$env:PGPASSWORD = "Act3d@dm1n0EEoo"
$env:PGUSER = "actedadmin"
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGDATABASE = "ACTEDDBDEV01"

Write-Host "Running migration SQL script..." -ForegroundColor Green
Write-Host ""

# Execute the migration script
$result = & psql -U $env:PGUSER -h $env:PGHOST -p $env:PGPORT -d $env:PGDATABASE -f migrate_acted_products.sql 2>&1

# Display output
$result | ForEach-Object { Write-Host $_ }

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")