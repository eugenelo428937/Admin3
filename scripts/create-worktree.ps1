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
    [ValidateRange(1,8)]
    [int]$StartFromStep = 1
)

# Set default worktree path if not provided
if (-not $WorktreePath) {
    $WorktreePath = "..\Admin3-$BranchName"
}

# Read PostgreSQL credentials from .env file
$mainEnvPath = "backend\django_Admin3\.env.development"
if (-not (Test-Path $mainEnvPath)) {
    Write-Host "⚠ Environment file not found at $mainEnvPath" -ForegroundColor Red
    Write-Host "Cannot read PostgreSQL credentials. Please ensure the file exists." -ForegroundColor Red
    exit 1
}

# Parse .env file for DB credentials
$envContent = Get-Content $mainEnvPath
$PostgresUser = ($envContent | Select-String -Pattern "^DB_USER=(.*)$").Matches.Groups[1].Value
$PostgresPassword = ($envContent | Select-String -Pattern "^DB_PASSWORD=(.*)$").Matches.Groups[1].Value

if (-not $PostgresUser -or -not $PostgresPassword) {
    Write-Host "⚠ Could not read DB_USER or DB_PASSWORD from $mainEnvPath" -ForegroundColor Red
    exit 1
}

# Database name from branch (replace slashes and hyphens with underscores)
$DbName = "admin3_$($BranchName.Replace('/', '_').Replace('-', '_'))"

Write-Host "`n=== Admin3 Worktree Setup ===" -ForegroundColor Green
Write-Host "Branch: $BranchName" -ForegroundColor Cyan
Write-Host "Worktree path: $WorktreePath" -ForegroundColor Cyan
Write-Host "Database name: $DbName" -ForegroundColor Cyan
Write-Host "Database user: $PostgresUser" -ForegroundColor Cyan
Write-Host "Backend port: $BackendPort" -ForegroundColor Cyan
Write-Host "Frontend port: $FrontendPort" -ForegroundColor Cyan
Write-Host "Starting from step: $StartFromStep" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Cyan

# Create logs directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logsDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $logsDir "worktree-setup-$timestamp.log"

# Initialize log file
@"
================================================================================
Admin3 Worktree Setup Log
Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Branch: $BranchName
Database: $DbName
================================================================================

"@ | Out-File $logFile

Write-Host "Log file: $logFile" -ForegroundColor Gray

# Find PostgreSQL tools (used by multiple steps)
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
    $psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
}
$pgDumpPath = $null
if ($psqlPath) {
    $pgDumpPath = Join-Path (Split-Path $psqlPath -Parent) "pg_dump.exe"
    if (-not (Test-Path $pgDumpPath)) {
        $pgDumpPath = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
    }
}

# Step 1: Create git worktree
if ($StartFromStep -le 1) {
    Write-Host "[1/8] Creating git worktree..." -ForegroundColor Yellow
    if (Test-Path $WorktreePath) {
        Write-Host "✓ Worktree already exists at $WorktreePath" -ForegroundColor Cyan
    } else {
        git worktree add $WorktreePath $BranchName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create worktree. Does the branch exist?" -ForegroundColor Red
            Write-Host "Try: git worktree add $WorktreePath -b $BranchName" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "✓ Worktree created successfully" -ForegroundColor Green
    }
} else {
    Write-Host "[1/8] Skipping git worktree creation" -ForegroundColor Gray
}

# Step 2: Create PostgreSQL database
if ($StartFromStep -le 2) {
    Write-Host "`n[2/8] Creating PostgreSQL database..." -ForegroundColor Yellow

    # Check if psql exists
    if (-not $psqlPath) {
        Write-Host "psql not found. Please ensure PostgreSQL is installed." -ForegroundColor Red
        exit 1
    }

    # Debug: Print credentials
    Write-Host "DEBUG: PostgresUser = '$PostgresUser'" -ForegroundColor Magenta
    Write-Host "DEBUG: PostgresPassword = '$PostgresPassword'" -ForegroundColor Magenta
    Write-Host "DEBUG: DbName = '$DbName'" -ForegroundColor Magenta

    # Set PGPASSWORD environment variable for psql authentication
    $env:PGPASSWORD = $PostgresPassword

    # Check if database exists (connect to postgres database to query)
    $checkDbCmd = "SELECT 1 FROM pg_database WHERE datname='$DbName';"
    Write-Host "DEBUG: Running check command..." -ForegroundColor Magenta
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Checking if database exists..." | Out-File -Append $logFile
    $dbCheckOutput = & $psqlPath -U $PostgresUser -d postgres -t -c $checkDbCmd 2>&1 | Tee-Object -Append -FilePath $logFile
    Write-Host "DEBUG: Check output: $dbCheckOutput" -ForegroundColor Magenta
    Write-Host "DEBUG: Check exit code: $LASTEXITCODE" -ForegroundColor Magenta

    if ($dbCheckOutput -match "1") {
        Write-Host "✓ Database '$DbName' already exists" -ForegroundColor Cyan
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database already exists" | Out-File -Append $logFile
    } else {
        # Create database (connect to postgres database to create)
        $createDbCmd = "CREATE DATABASE $DbName;"
        Write-Host "DEBUG: Running create command..." -ForegroundColor Magenta
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Creating database..." | Out-File -Append $logFile
        $createOutput = & $psqlPath -U $PostgresUser -d postgres -c $createDbCmd 2>&1 | Tee-Object -Append -FilePath $logFile
        Write-Host "DEBUG: Create output: $createOutput" -ForegroundColor Magenta
        Write-Host "DEBUG: Create exit code: $LASTEXITCODE" -ForegroundColor Magenta

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database '$DbName' created successfully" -ForegroundColor Green
            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database created successfully" | Out-File -Append $logFile
        } else {
            Write-Host "⚠ Database creation failed" -ForegroundColor Yellow
            Write-Host "Error details: $createOutput" -ForegroundColor Red
            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database creation failed: $createOutput" | Out-File -Append $logFile
        }
    }

    # Clear password from environment
    $env:PGPASSWORD = $null
} else {
    Write-Host "`n[2/8] Skipping database creation" -ForegroundColor Gray
}

# Step 3: Setup backend environment file
$backendDir = Join-Path $WorktreePath "backend\django_Admin3"
if ($StartFromStep -le 3) {
    Write-Host "`n[3/8] Configuring backend environment..." -ForegroundColor Yellow
    $envPath = Join-Path $backendDir ".env.development"
    $mainEnvPath = "backend\django_Admin3\.env.development"

    # Copy and modify environment file
    if (Test-Path $mainEnvPath) {
        Copy-Item $mainEnvPath $envPath

        # Update database name and ports
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace 'DB_NAME=.*', "DB_NAME=$DbName" `
                                   -replace 'DATABASE_URL=.*', "DATABASE_URL=postgres://${PostgresUser}:${PostgresPassword}@127.0.0.1:5432/${DbName}"

        # Add or update BACKEND_PORT and FRONTEND_PORT settings
        if ($envContent -match '^BACKEND_PORT=') {
            $envContent = $envContent -replace '^BACKEND_PORT=.*', "BACKEND_PORT=$BackendPort"
        } else {
            $envContent += "`nBACKEND_PORT=$BackendPort"
        }

        if ($envContent -match '^FRONTEND_PORT=') {
            $envContent = $envContent -replace '^FRONTEND_PORT=.*', "FRONTEND_PORT=$FrontendPort"
        } else {
            $envContent += "`nFRONTEND_PORT=$FrontendPort"
        }

        $envContent | Set-Content $envPath

        Write-Host "✓ Backend environment configured" -ForegroundColor Green
    } else {
        Write-Host "⚠ Main environment file not found at $mainEnvPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/8] Skipping backend environment configuration" -ForegroundColor Gray
}

# Step 4: Setup Python virtual environment
if ($StartFromStep -le 4) {
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
} else {
    Write-Host "`n[4/8] Skipping Python virtual environment setup" -ForegroundColor Gray
}

# Step 5: Run migrations
if ($StartFromStep -le 5) {
    Write-Host "`n[5/8] Running database migrations..." -ForegroundColor Yellow
    Push-Location $backendDir

    # Use appropriate python executable
    # Get absolute path from current location (we're in backend/django_Admin3)
    $currentLocation = Get-Location
    $worktreeRoot = Split-Path (Split-Path $currentLocation -Parent) -Parent
    $localVenv = Join-Path $worktreeRoot ".venv\Scripts\python.exe"

    # Main worktree is typically in same parent directory
    $parentDir = Split-Path $worktreeRoot -Parent
    $mainWorktree = Join-Path $parentDir "Admin3"
    $mainVenv = Join-Path $mainWorktree ".venv\Scripts\python.exe"

    if (Test-Path $localVenv) {
        $pythonExe = $localVenv
        Write-Host "Using local venv: $pythonExe" -ForegroundColor Gray
    } elseif (Test-Path $mainVenv) {
        $pythonExe = $mainVenv
        Write-Host "Using main worktree venv: $pythonExe" -ForegroundColor Gray
    } else {
        Write-Host "⚠ No Python virtual environment found." -ForegroundColor Yellow
        Write-Host "  Tried: $localVenv" -ForegroundColor Gray
        Write-Host "  Tried: $mainVenv" -ForegroundColor Gray
        Write-Host "⚠ Skipping migrations. Run them manually after activating venv." -ForegroundColor Yellow
        Pop-Location
        $pythonExe = $null
    }

    if ($pythonExe) {
        & $pythonExe manage.py migrate --no-input
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Migrations failed. You may need to run them manually." -ForegroundColor Yellow
        }
    }

    Pop-Location
} else {
    Write-Host "`n[5/8] Skipping database migrations" -ForegroundColor Gray
}

# Step 6: Copy data from main database (optional)
if ($StartFromStep -le 6) {
    Write-Host "`n[6/8] Copy data from main database?" -ForegroundColor Yellow
    $copyData = Read-Host "Copy data from ACTEDDBDEV01? (y/N) [default: n]"
    if ($copyData -eq "Y" -or $copyData -eq "y") {
        if (-not $psqlPath -or -not $pgDumpPath) {
            Write-Host "⚠ PostgreSQL tools not found. Cannot copy data." -ForegroundColor Yellow
            Write-Host "  psql: $psqlPath" -ForegroundColor Gray
            Write-Host "  pg_dump: $pgDumpPath" -ForegroundColor Gray
        } else {
            # Set password for pg_dump and psql commands
            $env:PGPASSWORD = $PostgresPassword

            $dumpFile = "admin3_main_dump.sql"
            Write-Host "Exporting data from ACTEDDBDEV01 using pg_dump..." -ForegroundColor Cyan
            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starting pg_dump from ACTEDDBDEV01..." | Out-File -Append $logFile

            $exportErrors = & $pgDumpPath -U $PostgresUser -d ACTEDDBDEV01 --data-only --column-inserts -f $dumpFile 2>&1
            $exportErrors | Out-File -Append $logFile

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Data exported successfully" -ForegroundColor Green
                "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Data exported successfully" | Out-File -Append $logFile

                # Clear existing data by dropping and recreating the database
                Write-Host "Clearing existing data in $DbName..." -ForegroundColor Cyan
                "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Dropping database $DbName to clear existing data..." | Out-File -Append $logFile

                $dropOutput = & $psqlPath -U $PostgresUser -d postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>&1
                $dropOutput | Out-File -Append $logFile

                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ Database cleared" -ForegroundColor Green
                    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database dropped successfully" | Out-File -Append $logFile

                    # Recreate the database
                    Write-Host "Recreating database $DbName..." -ForegroundColor Cyan
                    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Recreating database $DbName..." | Out-File -Append $logFile

                    $recreateOutput = & $psqlPath -U $PostgresUser -d postgres -c "CREATE DATABASE $DbName;" 2>&1
                    $recreateOutput | Out-File -Append $logFile

                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✓ Database recreated" -ForegroundColor Green
                        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database recreated successfully" | Out-File -Append $logFile

                        # Run migrations on fresh database
                        Write-Host "Running migrations on fresh database..." -ForegroundColor Cyan
                        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Running migrations..." | Out-File -Append $logFile

                        Push-Location $backendDir
                        # Find Python executable
                        $currentLocation = Get-Location
                        $worktreeRoot = Split-Path (Split-Path $currentLocation -Parent) -Parent
                        $localVenv = Join-Path $worktreeRoot ".venv\Scripts\python.exe"
                        $parentDir = Split-Path $worktreeRoot -Parent
                        $mainWorktree = Join-Path $parentDir "Admin3"
                        $mainVenv = Join-Path $mainWorktree ".venv\Scripts\python.exe"

                        if (Test-Path $localVenv) {
                            $pythonExe = $localVenv
                        } elseif (Test-Path $mainVenv) {
                            $pythonExe = $mainVenv
                        } else {
                            $pythonExe = $null
                        }

                        if ($pythonExe) {
                            $migrateOutput = & $pythonExe manage.py migrate --no-input 2>&1
                            $migrateOutput | Out-File -Append $logFile

                            if ($LASTEXITCODE -eq 0) {
                                Write-Host "✓ Migrations completed" -ForegroundColor Green
                                "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Migrations completed successfully" | Out-File -Append $logFile
                            } else {
                                Write-Host "⚠ Migrations failed - check log file" -ForegroundColor Yellow
                                "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Migrations failed" | Out-File -Append $logFile
                            }
                        } else {
                            Write-Host "⚠ Python not found, skipping migrations" -ForegroundColor Yellow
                            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Python not found, skipping migrations" | Out-File -Append $logFile
                        }
                        Pop-Location

                        # Now import the data
                        Write-Host "Importing data to $DbName..." -ForegroundColor Cyan
                        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starting psql import to $DbName..." | Out-File -Append $logFile

                        $importErrors = & $psqlPath -U $PostgresUser -d $DbName -f $dumpFile 2>&1
                        $importErrors | Out-File -Append $logFile

                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "✓ Data copied successfully" -ForegroundColor Green
                            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Data imported successfully" | Out-File -Append $logFile
                        } else {
                            Write-Host "⚠ Data import failed - check log file for details" -ForegroundColor Yellow
                            "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Data import failed with exit code $LASTEXITCODE" | Out-File -Append $logFile
                        }
                    } else {
                        Write-Host "⚠ Failed to recreate database - check log file" -ForegroundColor Yellow
                        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database recreation failed" | Out-File -Append $logFile
                    }
                } else {
                    Write-Host "⚠ Failed to clear database - check log file" -ForegroundColor Yellow
                    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Database drop failed" | Out-File -Append $logFile
                }
            } else {
                Write-Host "⚠ Data export failed - check log file for details" -ForegroundColor Yellow
                "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Data export failed with exit code $LASTEXITCODE" | Out-File -Append $logFile
            }

            Remove-Item $dumpFile -ErrorAction SilentlyContinue

            # Clear password from environment
            $env:PGPASSWORD = $null
        }
    } else {
        Write-Host "✓ Skipped data copy" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n[6/8] Skipping data copy" -ForegroundColor Gray
}

# Step 7: Setup frontend environment
if ($StartFromStep -le 7) {
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
} else {
    Write-Host "`n[7/8] Skipping frontend environment configuration" -ForegroundColor Gray
}

# Step 8: Install frontend dependencies (optional)
if ($StartFromStep -le 8) {
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
} else {
    Write-Host "`n[8/8] Skipping npm install" -ForegroundColor Gray
}

# Close log file
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Setup completed successfully" | Out-File -Append $logFile
"================================================================================`n" | Out-File -Append $logFile

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

Write-Host "`nLog file: $logFile" -ForegroundColor Cyan

Write-Host "`nTo remove this worktree later:" -ForegroundColor Cyan
Write-Host "  git worktree remove $WorktreePath" -ForegroundColor Gray
Write-Host "  `$env:PGPASSWORD='<password>'; psql -U $PostgresUser -c `"DROP DATABASE $DbName;`"; `$env:PGPASSWORD=`$null" -ForegroundColor Gray
Write-Host "`n"
