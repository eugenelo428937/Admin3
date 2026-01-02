# Railway Deployment Script for Admin3 UAT Environment
# This script automates the initial deployment of Admin3 to Railway
#
# Prerequisites:
# - Railway CLI installed and authenticated
# - Railway token in .env file (RAILWAY_TOKEN)
# - Git repository initialized with 'uat' branch

param(
    [switch]$Init,         # Initialize new Railway project
    [switch]$Deploy,       # Deploy to existing Railway project
    [switch]$SetupDB,      # Run database migrations and setup
    [switch]$Full          # Run full deployment (init, deploy, setupdb)
)

# Color output functions
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

# Banner
Write-Info "========================================="
Write-Info "  Railway Deployment Script - Admin3 UAT"
Write-Info "========================================="
Write-Host ""

# Check if Railway CLI is installed
function Test-RailwayCLI {
    Write-Info "Checking Railway CLI..."
    try {
        $railwayVersion = railway --version
        Write-Success "✓ Railway CLI installed: $railwayVersion"
        return $true
    } catch {
        Write-Error "✗ Railway CLI not found. Please install it first:"
        Write-Info "  npm install -g @railway/cli"
        return $false
    }
}

# Check if authenticated
function Test-RailwayAuth {
    Write-Info "Checking Railway authentication..."
    try {
        railway whoami | Out-Null
        Write-Success "✓ Railway CLI authenticated"
        return $true
    } catch {
        Write-Error "✗ Not authenticated with Railway"
        Write-Info "  Run: railway login"
        return $false
    }
}

# Initialize new Railway project
function Initialize-RailwayProject {
    Write-Info "`nInitializing new Railway project..."

    # Create project
    Write-Info "Creating Railway project 'admin3-uat'..."
    railway init --name admin3-uat

    # Create UAT environment
    Write-Info "Creating UAT environment..."
    railway environment create uat
    railway environment uat

    # Add PostgreSQL database
    Write-Info "Adding PostgreSQL database..."
    railway add --database postgresql

    Write-Success "✓ Railway project initialized"
}

# Deploy backend service
function Deploy-BackendService {
    Write-Info "`nDeploying Django backend service..."

    # Navigate to backend
    Set-Location backend\django_Admin3

    # Create backend service
    Write-Info "Creating backend service..."
    railway service create admin3-backend
    railway service admin3-backend

    # Set environment variables
    Write-Info "Setting environment variables..."
    railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
    railway variables set DJANGO_ENV=uat
    railway variables set DEBUG=False

    # Generate Django secret key
    $secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
    railway variables set DJANGO_SECRET_KEY=$secretKey

    # Deploy backend
    Write-Info "Deploying backend..."
    railway up --detach

    # Generate domain
    Write-Info "Generating backend domain..."
    $backendDomain = railway domain generate
    Write-Success "✓ Backend deployed to: $backendDomain"

    Set-Location ..\..
    return $backendDomain
}

# Deploy frontend service
function Deploy-FrontendService {
    param([string]$BackendDomain)

    Write-Info "`nDeploying React frontend service..."

    # Navigate to frontend
    Set-Location frontend\react-Admin3

    # Create frontend service
    Write-Info "Creating frontend service..."
    railway service create admin3-frontend
    railway service admin3-frontend

    # Set environment variables
    Write-Info "Setting environment variables..."
    railway variables set NODE_ENV=production
    railway variables set REACT_APP_ENVIRONMENT=uat
    railway variables set GENERATE_SOURCEMAP=false
    railway variables set "REACT_APP_API_URL=https://$BackendDomain"
    railway variables set "REACT_APP_BACKEND_URL=https://$BackendDomain"

    # Deploy frontend
    Write-Info "Deploying frontend..."
    railway up --detach

    # Generate domain
    Write-Info "Generating frontend domain..."
    $frontendDomain = railway domain generate
    Write-Success "✓ Frontend deployed to: $frontendDomain"

    Set-Location ..\..
    return $frontendDomain
}

# Update backend CORS settings
function Update-BackendCORS {
    param([string]$FrontendDomain)

    Write-Info "`nUpdating backend CORS configuration..."

    Set-Location backend\django_Admin3
    railway service admin3-backend

    railway variables set "CORS_ALLOWED_ORIGINS=https://$FrontendDomain"
    railway variables set "CSRF_TRUSTED_ORIGINS=https://$FrontendDomain"
    railway variables set "FRONTEND_URL=https://$FrontendDomain"

    Write-Success "✓ CORS configuration updated"

    Set-Location ..\..
}

# Run database migrations
function Setup-Database {
    Write-Info "`nRunning database migrations..."

    Set-Location backend\django_Admin3
    railway service admin3-backend

    # Run migrations
    Write-Info "Running migrations..."
    railway run python manage.py migrate

    # Create cache table for database caching
    Write-Info "Creating cache table..."
    railway run python manage.py createcachetable

    # Collect static files
    Write-Info "Collecting static files..."
    railway run python manage.py collectstatic --noinput

    Write-Success "✓ Database setup completed"

    Set-Location ..\..
}

# Main execution
if (-not (Test-RailwayCLI)) { exit 1 }
if (-not (Test-RailwayAuth)) { exit 1 }

# Determine what to run
$runInit = $Init -or $Full
$runDeploy = $Deploy -or $Full
$runSetupDB = $SetupDB -or $Full

if (-not ($runInit -or $runDeploy -or $runSetupDB)) {
    Write-Warning "No action specified. Use one of the following:"
    Write-Info "  -Init      Initialize new Railway project"
    Write-Info "  -Deploy    Deploy services to existing project"
    Write-Info "  -SetupDB   Run database migrations and setup"
    Write-Info "  -Full      Run complete deployment (init + deploy + setupdb)"
    Write-Host ""
    Write-Info "Example: .\deploy-to-railway.ps1 -Full"
    exit 0
}

try {
    if ($runInit) {
        Initialize-RailwayProject
    }

    if ($runDeploy) {
        $backendDomain = Deploy-BackendService
        $frontendDomain = Deploy-FrontendService -BackendDomain $backendDomain
        Update-BackendCORS -FrontendDomain $frontendDomain

        Write-Host ""
        Write-Success "========================================="
        Write-Success "  Deployment Complete!"
        Write-Success "========================================="
        Write-Info "Backend URL:  https://$backendDomain"
        Write-Info "Frontend URL: https://$frontendDomain"
        Write-Warning "`nNext steps:"
        Write-Info "1. Run database migrations: .\deploy-to-railway.ps1 -SetupDB"
        Write-Info "2. Create superuser: railway run python manage.py createsuperuser"
        Write-Info "3. Test the application at the frontend URL"
    }

    if ($runSetupDB) {
        Setup-Database
        Write-Success "`n✓ All done! Your application should be live now."
    }
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}

Write-Host ""
Write-Success "Deployment script completed successfully!"
