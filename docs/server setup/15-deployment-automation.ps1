# Admin3 Deployment Automation Script
# Automated Deployment Script

param(
    [string]$Branch = "main",
    [string]$AppPath = "C:\inetpub\wwwroot\Admin3",
    [switch]$SkipBackup = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"

function Write-DeployLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path "C:\logs\admin3\deploy.log" -Value $logEntry
}

function Stop-ApplicationServices {
    Write-DeployLog "Stopping application services..."
    try {
        Stop-Service -Name "Admin3-Waitress" -Force -ErrorAction SilentlyContinue
        Stop-WebSite -Name "Admin3" -ErrorAction SilentlyContinue
    } catch {
        Write-DeployLog "Error stopping services: $_" -Level "WARNING"
    }
}

function Start-ApplicationServices {
    Write-DeployLog "Starting application services..."
    try {
        Start-Service -Name "Admin3-Waitress"
        Start-WebSite -Name "Admin3"
    } catch {
        Write-DeployLog "Error starting services: $_" -Level "ERROR"
        throw
    }
}

function Test-ApplicationHealth {
    Write-DeployLog "Testing application health..."
    $maxRetries = 10
    $retryCount = 0
    
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-DeployLog "Application is healthy"
                return $true
            }
        } catch {
            Write-DeployLog "Health check failed, retrying... ($retryCount/$maxRetries)"
            Start-Sleep -Seconds 5
        }
        $retryCount++
    } while ($retryCount -lt $maxRetries)
    
    Write-DeployLog "Application health check failed after $maxRetries attempts" -Level "ERROR"
    return $false
}

try {
    Write-DeployLog "Starting deployment process..."
    
    # Create backup if not skipped
    if (-not $SkipBackup) {
        Write-DeployLog "Creating backup..."
        if (Test-Path ".\09-backup-database.ps1") {
            & ".\09-backup-database.ps1"
        }
        if (Test-Path ".\10-backup-application.ps1") {
            & ".\10-backup-application.ps1"
        }
    }
    
    # Stop services
    Stop-ApplicationServices
    
    # Update code
    Write-DeployLog "Updating code from repository..."
    cd $AppPath
    git fetch origin
    git checkout $Branch
    git pull origin $Branch
    
    # Update Python dependencies
    Write-DeployLog "Updating Python dependencies..."
    cd "$AppPath\backend\django_Admin3"
    .\.venv\Scripts\activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Run migrations
    Write-DeployLog "Running database migrations..."
    python manage.py migrate --noinput
    
    # Collect static files
    Write-DeployLog "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Update Node dependencies and build
    Write-DeployLog "Building React application..."
    cd "$AppPath\frontend\react-Admin3"
    npm install
    npm run build
    
    # Copy build files
    Copy-Item -Path "build\*" -Destination "C:\inetpub\wwwroot\Admin3\static" -Recurse -Force
    
    # Run tests if not skipped
    if (-not $SkipTests) {
        Write-DeployLog "Running tests..."
        cd "$AppPath\backend\django_Admin3"
        python manage.py test --keepdb
    }
    
    # Start services
    Start-ApplicationServices
    
    # Wait for services to start
    Start-Sleep -Seconds 30
    
    # Test application health
    if (Test-ApplicationHealth) {
        Write-DeployLog "Deployment completed successfully!"
        
        # Clear cache
        Write-DeployLog "Clearing application cache..."
        python manage.py shell -c "from django.core.cache import cache; cache.clear()"
        
    } else {
        Write-DeployLog "Deployment failed - application health check failed" -Level "ERROR"
        
        # Rollback if possible
        Write-DeployLog "Attempting rollback..."
        git checkout HEAD~1
        Start-ApplicationServices
        
        exit 1
    }
    
} catch {
    Write-DeployLog "Deployment failed: $_" -Level "ERROR"
    
    # Attempt to restart services
    try {
        Start-ApplicationServices
    } catch {
        Write-DeployLog "Failed to restart services: $_" -Level "ERROR"
    }
    
    exit 1
}