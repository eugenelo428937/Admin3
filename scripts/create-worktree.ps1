# Admin3 Git Worktree Setup Script
# Automates creation of git worktree with isolated PostgreSQL database

param(
    [Parameter(Mandatory=$true)]
    [string]$BranchName,

    [Parameter(Mandatory=$false)]
    [string]$WorktreePath,

    [Parameter(Mandatory=$false)]
    [int]$BackendPort = 8889,

    [Parameter(Mandatory=$false)]
    [int]$FrontendPort = 3001,

    [Parameter(Mandatory=$false)]
    [string]$PostgresUser = "actedadmin",

    [Parameter(Mandatory=$false)]
    [string]$PostgresPassword = "Act3d@dm1n0EEoo"
)

# Set default worktree path if not provided
if (-not $WorktreePath) {
    $WorktreePath = "..\Admin3-$BranchName"
}

# Database name from branch (replace slashes and hyphens with underscores)
$DbName = "admin3_$($BranchName.Replace('/', '_').Replace('-', '_'))"

Write-Host "`n=== Admin3 Worktree Setup ===" -ForegroundColor Green
Write-Host "Branch: $BranchName" -ForegroundColor Cyan
Write-Host "Worktree path: $WorktreePath" -ForegroundColor Cyan
Write-Host "Database name: $DbName" -ForegroundColor Cyan
Write-Host "Backend port: $BackendPort" -ForegroundColor Cyan
Write-Host "Frontend port: $FrontendPort" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Cyan

# Step 1: Create git worktree
Write-Host "[1/8] Creating git worktree..." -ForegroundColor Yellow
git worktree add $WorktreePath $BranchName
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create worktree. Does the branch exist?" -ForegroundColor Red
    Write-Host "Try: git worktree add $WorktreePath -b $BranchName" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Worktree created successfully" -ForegroundColor Green

# Step 2: Create PostgreSQL database
Write-Host "`n[2/8] Creating PostgreSQL database..." -ForegroundColor Yellow
$psqlPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe"

# Check if psql exists
if (-not (Test-Path $psqlPath)) {
    # Try to find psql in PATH
    $psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
    if (-not $psqlPath) {
        Write-Host "psql not found. Please ensure PostgreSQL is installed." -ForegroundColor Red
        exit 1
    }
}

# Create database
$createDbCmd = "CREATE DATABASE $DbName;"
& $psqlPath -U $PostgresUser -c $createDbCmd 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database '$DbName' created successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Database creation failed (may already exist)" -ForegroundColor Yellow
}

# Step 3: Setup backend environment file
Write-Host "`n[3/8] Configuring backend environment..." -ForegroundColor Yellow
$backendDir = Join-Path $WorktreePath "backend\django_Admin3"
$envPath = Join-Path $backendDir ".env.development"
$mainEnvPath = "backend\django_Admin3\.env.development"

# Copy and modify environment file
if (Test-Path $mainEnvPath) {
    Copy-Item $mainEnvPath $envPath

    # Update database name
    (Get-Content $envPath) -replace 'DB_NAME=.*', "DB_NAME=$DbName" `
                            -replace 'DATABASE_URL=.*', "DATABASE_URL=postgres://${PostgresUser}:${PostgresPassword}@127.0.0.1:5432/${DbName}" `
                            | Set-Content $envPath

    Write-Host "✓ Backend environment configured" -ForegroundColor Green
} else {
    Write-Host "⚠ Main environment file not found at $mainEnvPath" -ForegroundColor Yellow
}

# Step 4: Setup Python virtual environment
Write-Host "`n[4/8] Setting up Python virtual environment..." -ForegroundColor Yellow
Push-Location $backendDir

# Check if we should create new venv or reuse
$createVenv = Read-Host "Create new virtual environment? (Y/n) [default: n]"
if ($createVenv -eq "Y" -or $createVenv -eq "y") {
    python -m venv .venv
    & ".venv\Scripts\activate"
    pip install -r requirements.txt
    Write-Host "✓ New virtual environment created and packages installed" -ForegroundColor Green
} else {
    Write-Host "✓ Skipping virtual environment creation (will reuse main worktree)" -ForegroundColor Cyan
}

Pop-Location

# Step 5: Run migrations
Write-Host "`n[5/8] Running database migrations..." -ForegroundColor Yellow
Push-Location $backendDir

# Use appropriate python executable
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonExe = ".venv\Scripts\python.exe"
} else {
    # Fallback to main worktree venv
    $pythonExe = "..\..\..\.venv\Scripts\python.exe"
}

& $pythonExe manage.py migrate --no-input
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Migrations failed. You may need to run them manually." -ForegroundColor Yellow
}

Pop-Location

# Step 6: Copy data from main database (optional)
Write-Host "`n[6/8] Copy data from main database?" -ForegroundColor Yellow
$copyData = Read-Host "Copy data from ACTEDDBDEV01? (y/N) [default: n]"
if ($copyData -eq "Y" -or $copyData -eq "y") {
    $dumpFile = "admin3_main_dump.sql"
    Write-Host "Exporting data from ACTEDDBDEV01..." -ForegroundColor Cyan
    & $psqlPath -U $PostgresUser -d ACTEDDBDEV01 -c "\copy (SELECT * FROM products) TO '$dumpFile'"
    Write-Host "Importing data to $DbName..." -ForegroundColor Cyan
    & $psqlPath -U $PostgresUser -d $DbName -f $dumpFile
    Remove-Item $dumpFile -ErrorAction SilentlyContinue
    Write-Host "✓ Data copied" -ForegroundColor Green
} else {
    Write-Host "✓ Skipped data copy" -ForegroundColor Cyan
}

# Step 7: Setup frontend environment
Write-Host "`n[7/8] Configuring frontend environment..." -ForegroundColor Yellow
$frontendEnvPath = Join-Path $WorktreePath "frontend\react-Admin3\.env"
$frontendEnvContent = @"
REACT_APP_API_BASE_URL=http://127.0.0.1:$BackendPort
REACT_APP_API_AUTH_URL=/api/auth
REACT_APP_API_USER_URL=/api/users
REACT_APP_API_EXAM_SESSION_URL=/api/exam-sessions
REACT_APP_API_PRODUCT_URL=/api/products
REACT_APP_API_SUBJECT_URL=/api/subjects
REACT_APP_API_EXAM_SESSION_SUBJECT_URL=/api/exam-sessions-subjects
REACT_APP_API_CART_URL=/api/cart
REACT_APP_API_COUNTRIES_URL=/api/countries
REACT_APP_API_MARKING_URL=/api/marking
REACT_APP_API_TUTORIAL_URL=/api/tutorials
REACT_APP_API_PAGE_SIZE=20
PORT=$FrontendPort
"@
$frontendEnvContent | Set-Content $frontendEnvPath
Write-Host "✓ Frontend environment configured" -ForegroundColor Green

# Step 8: Install frontend dependencies (optional)
Write-Host "`n[8/8] Frontend dependencies..." -ForegroundColor Yellow
$installNpm = Read-Host "Install npm dependencies? (y/N) [default: n, reuse from main]"
if ($installNpm -eq "Y" -or $installNpm -eq "y") {
    Push-Location (Join-Path $WorktreePath "frontend\react-Admin3")
    npm install
    Pop-Location
    Write-Host "✓ npm packages installed" -ForegroundColor Green
} else {
    Write-Host "✓ Skipping npm install (reusing node_modules from main)" -ForegroundColor Cyan
}

# Summary
Write-Host "`n=== ✓ Worktree Setup Complete! ===" -ForegroundColor Green
Write-Host "`nTo start development servers:" -ForegroundColor Cyan
Write-Host "`nBackend:" -ForegroundColor White
Write-Host "  cd $WorktreePath\backend\django_Admin3" -ForegroundColor Gray
if (Test-Path (Join-Path $backendDir ".venv\Scripts\activate.ps1")) {
    Write-Host "  .\.venv\Scripts\activate" -ForegroundColor Gray
} else {
    Write-Host "  ..\..\..\Admin3\backend\django_Admin3\.venv\Scripts\activate" -ForegroundColor Gray
}
Write-Host "  python manage.py runserver $BackendPort" -ForegroundColor Gray

Write-Host "`nFrontend:" -ForegroundColor White
Write-Host "  cd $WorktreePath\frontend\react-Admin3" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray

Write-Host "`nDatabase: $DbName" -ForegroundColor White
Write-Host "Backend Port: $BackendPort | Frontend Port: $FrontendPort" -ForegroundColor White

Write-Host "`nTo remove this worktree later:" -ForegroundColor Cyan
Write-Host "  git worktree remove $WorktreePath" -ForegroundColor Gray
Write-Host "  psql -U $PostgresUser -c `"DROP DATABASE $DbName;`"" -ForegroundColor Gray
Write-Host "`n"
