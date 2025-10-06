# Simple database connection test
Write-Host "Testing database connection..." -ForegroundColor Cyan

# Set connection parameters
$env:PGHOST = "acteddevdb01.crueqe6us4nv.eu-west-2.rds.amazonaws.com"
$env:PGPORT = "5432"
$env:PGDATABASE = "acteddbdev01"
$env:PGUSER = "actedadmin"
$env:PGPASSWORD = "Act3d@dm1n0EEoo"

try {
    Write-Host "Testing basic connection..." -ForegroundColor Yellow
    $result = psql -c "SELECT version();"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Database connection working!" -ForegroundColor Green
        
        Write-Host "Testing permissions..." -ForegroundColor Yellow
        $userResult = psql -c "SELECT current_user, current_database();"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Database permissions verified!" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Permission check failed" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "FAILED: Cannot connect to database" -ForegroundColor Red
        Write-Host "Check your connection settings and security groups" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clear passwords
    $env:PGPASSWORD = $null
    $env:PGHOST = $null
    $env:PGPORT = $null
    $env:PGDATABASE = $null
    $env:PGUSER = $null
}

Write-Host "Test completed." -ForegroundColor Cyan