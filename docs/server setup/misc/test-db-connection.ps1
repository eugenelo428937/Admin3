# Test database connection and permissions
function Test-DatabaseConnection {
    param(
        [string]$Host = "acteddevdb01.crueqe6us4nv.eu-west-2.rds.amazonaws.com",
        [string]$Database = "acteddbdev01",
        [string]$Username = "actedadmin",
        [string]$Password = "Act3d@dm1n0EEoo"
    )
    
    Write-Host "Testing database connection..." -ForegroundColor Cyan
    
    # Set environment variables
    $env:PGHOST = $Host
    $env:PGPORT = "5432"
    $env:PGDATABASE = $Database
    $env:PGUSER = $Username
    $env:PGPASSWORD = $Password
    
    try {
        # Test basic connection
        Write-Host "Testing basic connection..." -ForegroundColor Yellow
        $result = psql -c "SELECT version();" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database connection successful" -ForegroundColor Green
        } else {
            Write-Host "✗ Database connection failed" -ForegroundColor Red
            Write-Host "Error: $result" -ForegroundColor Red
            return $false
        }
        
        # Test permissions
        Write-Host "Testing permissions..." -ForegroundColor Yellow
        $result = psql -c "SELECT current_user, current_database();" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database permissions verified" -ForegroundColor Green
        } else {
            Write-Host "✗ Database permissions check failed" -ForegroundColor Red
            Write-Host "Error: $result" -ForegroundColor Red
        }
        
        # Test table creation (and cleanup)
        Write-Host "Testing write permissions..." -ForegroundColor Yellow
        $result = psql -c "CREATE TABLE test_connection (id INT); DROP TABLE test_connection;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database write permissions verified" -ForegroundColor Green
        } else {
            Write-Host "✗ Database write permissions failed" -ForegroundColor Red
            Write-Host "Error: $result" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "✗ Database connection error: $_" -ForegroundColor Red
        return $false
    } finally {
        # Clear sensitive environment variables
        $env:PGHOST = $null
        $env:PGPORT = $null
        $env:PGDATABASE = $null
        $env:PGUSER = $null
        $env:PGPASSWORD = $null
    }
    
    return $true
}

# Run database connection test
Test-DatabaseConnection