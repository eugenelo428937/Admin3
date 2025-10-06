# Admin3 RDS Database Setup Script
# Database Setup via RDS Console or CLI

param(
    [string]$RDSEndpoint = $env:DB_HOST,
    [string]$MasterPassword = $env:DB_POSTGRE_PASSWORD,
    [string]$AppUserPassword = $env:DB_APP_PASSWORD,
    [string]$BackupUserPassword = $env:DB_BACKUP_PASSWORD
)

# Install PostgreSQL client tools only (no server needed)
choco install postgresql --params '/Password:NotUsed /ClientOnly:true'

# Or install just the client tools
choco install postgresql-client

# Install OpenSSL for SSL connections
choco install openssl

# Set environment variables for RDS connection
$env:PGHOST = $RDSEndpoint
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGPASSWORD = $MasterPassword
$env:PGDATABASE = "postgres"

try {
    Write-Host "Setting up RDS database..." -ForegroundColor Cyan
    
    # Connect to RDS and create database (quoted to preserve case)
    psql -h $env:PGHOST -U $env:PGUSER -c "CREATE DATABASE $env:DB_APP_NAME;"
    
    # Create application user
    psql -h $env:PGHOST -U $env:PGUSER -c "CREATE USER $env:DB_APP_USER WITH PASSWORD '$AppUserPassword';"
    
    # Grant database-level privileges (while connected to postgres)
    psql -h $env:PGHOST -U $env:PGUSER -c "GRANT ALL PRIVILEGES ON DATABASE $env:DB_APP_NAME TO $env:DB_APP_USER;"
    
    # NOW connect to the application database for schema permissions
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "GRANT USAGE ON SCHEMA public TO $env:DB_APP_USER;"
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "GRANT CREATE ON SCHEMA public TO $env:DB_APP_USER;"
    
    # Create backup user and set permissions
    psql -h $env:PGHOST -U $env:PGUSER -c "CREATE USER $env:DB_BACKUP_USER WITH PASSWORD '$BackupUserPassword';"
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "GRANT CONNECT ON DATABASE $env:DB_APP_NAME TO $env:DB_BACKUP_USER;"
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "GRANT USAGE ON SCHEMA public TO $env:DB_BACKUP_USER;"
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $env:DB_BACKUP_USER;"
    psql -h $env:PGHOST -U $env:PGUSER -d $env:DB_APP_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO $env:DB_BACKUP_USER;"
    
    Write-Host "Database setup completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Database setup failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear sensitive environment variables
    $env:PGPASSWORD = $null
}

# Test RDS connection from EC2
function Test-RDSConnection {
    param([string]$Endpoint)
    
    $testConnection = Test-NetConnection -ComputerName $Endpoint -Port 5432
    
    if ($testConnection.TcpTestSucceeded) {
        Write-Host "RDS connection successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "RDS connection failed - check security groups" -ForegroundColor Red
        return $false
    }
}

# Test database connection
function Test-DatabaseConnection {
    param(
        [string]$Host = $RDSEndpoint,
        [string]$Database = $env:DB_APP_NAME,
        [string]$Username = $env:DB_APP_USER,
        [string]$Password = $AppUserPassword
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

# Run tests
Test-RDSConnection -Endpoint $RDSEndpoint
Test-DatabaseConnection