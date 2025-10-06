# Start both Django and React servers in separate terminals
Write-Host "Starting Django and React servers..." -ForegroundColor Green

# Read backend port from .env.development
$backendEnvPath = "backend/django_Admin3/.env.development"
$backendPort = 8888  # Default port
if (Test-Path $backendEnvPath) {
    $backendEnvContent = Get-Content $backendEnvPath
    $portLine = $backendEnvContent | Select-String -Pattern "^PORT=(.*)$"
    if ($portLine) {
        $backendPort = $portLine.Matches.Groups[1].Value.Trim()
        Write-Host "Backend port from .env: $backendPort" -ForegroundColor Cyan
    } else {
        Write-Host "Backend port not found in .env, using default: $backendPort" -ForegroundColor Yellow
    }
} else {
    Write-Host "Backend .env not found, using default port: $backendPort" -ForegroundColor Yellow
}

# Read frontend port from .env
$frontendEnvPath = "frontend/react-Admin3/.env"
$frontendPort = 3000  # Default port
if (Test-Path $frontendEnvPath) {
    $frontendEnvContent = Get-Content $frontendEnvPath
    $portLine = $frontendEnvContent | Select-String -Pattern "^PORT=(.*)$"
    if ($portLine) {
        $frontendPort = $portLine.Matches.Groups[1].Value.Trim()
        Write-Host "Frontend port from .env: $frontendPort" -ForegroundColor Cyan
    } else {
        Write-Host "Frontend port not found in .env, using default: $frontendPort" -ForegroundColor Yellow
    }
} else {
    Write-Host "Frontend .env not found, using default port: $frontendPort" -ForegroundColor Yellow
}

# Find Python virtual environment (same logic as create-worktree.ps1)
$currentDir = Get-Location
$localVenv = Join-Path $currentDir ".venv\Scripts\activate.ps1"

# Try to find main worktree venv (for worktrees that share venv)
$parentDir = Split-Path $currentDir -Parent
$mainWorktree = Join-Path $parentDir "Admin3"
$mainVenv = Join-Path $mainWorktree ".venv\Scripts\activate.ps1"

if (Test-Path $localVenv) {
    $venvPath = $localVenv
    $venvType = "local"
    Write-Host "Using local venv: $venvPath" -ForegroundColor Cyan
} elseif (Test-Path $mainVenv) {
    $venvPath = $mainVenv
    $venvType = "main"
    Write-Host "Using main worktree venv: $venvPath" -ForegroundColor Cyan
} else {
    Write-Host "⚠ No Python virtual environment found." -ForegroundColor Red
    Write-Host "  Tried: $localVenv" -ForegroundColor Gray
    Write-Host "  Tried: $mainVenv" -ForegroundColor Gray
    Write-Host "  Please create a virtual environment or run from the correct directory." -ForegroundColor Yellow
    exit 1
}

# Detect OS and launch servers accordingly
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    # Windows - use PowerShell
    Write-Host "Detected Windows OS" -ForegroundColor Cyan

    # Start Django server in new PowerShell window
    Write-Host "Starting Django on port $backendPort..." -ForegroundColor Green
    if ($venvType -eq "local") {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; & '$venvPath'; cd '.\backend\django_Admin3\'; python .\manage.py runserver $backendPort"
    } else {
        # Using main worktree venv
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mainWorktree'; & '$venvPath'; cd '$currentDir\backend\django_Admin3\'; python .\manage.py runserver $backendPort"
    }

    # Start React server in new PowerShell window
    Write-Host "Starting React on port $frontendPort..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\frontend\react-Admin3\'; npm start"

} else {
    # Mac/Linux - use bash
    Write-Host "Detected Unix-like OS (Mac/Linux)" -ForegroundColor Cyan

    # Convert venv path for Unix
    if ($venvType -eq "local") {
        $unixVenvPath = ".venv/bin/activate"
        $activateCmd = "source $unixVenvPath"
    } else {
        $unixVenvPath = "$mainWorktree/.venv/bin/activate"
        $activateCmd = "source $unixVenvPath"
    }

    # Check if running on macOS
    if ($IsMacOS -or (uname) -match "Darwin") {
        Write-Host "Using macOS Terminal..." -ForegroundColor Cyan

        # Start Django server in new Terminal tab (macOS)
        Write-Host "Starting Django on port $backendPort..." -ForegroundColor Green
        if ($venvType -eq "local") {
            $djangoScript = @"
cd '$currentDir/backend/django_Admin3'
cd ../..
$activateCmd
cd backend/django_Admin3
python manage.py runserver $backendPort
"@
        } else {
            $djangoScript = @"
cd '$mainWorktree'
$activateCmd
cd '$currentDir/backend/django_Admin3'
python manage.py runserver $backendPort
"@
        }
        osascript -e "tell application `"Terminal`" to do script `"$djangoScript`""

        # Start React server in new Terminal tab (macOS)
        Write-Host "Starting React on port $frontendPort..." -ForegroundColor Green
        $reactScript = @"
cd '$currentDir/frontend/react-Admin3'
npm start
"@
        osascript -e "tell application `"Terminal`" to do script `"$reactScript`""

    } else {
        # Linux - try common terminal emulators
        Write-Host "Using Linux terminal..." -ForegroundColor Cyan

        # Detect available terminal emulator
        $terminal = $null
        $terminalOptions = @("gnome-terminal", "konsole", "xterm", "x-terminal-emulator")
        foreach ($term in $terminalOptions) {
            if (Get-Command $term -ErrorAction SilentlyContinue) {
                $terminal = $term
                break
            }
        }

        if ($terminal) {
            Write-Host "Using terminal: $terminal" -ForegroundColor Cyan

            # Start Django server
            Write-Host "Starting Django on port $backendPort..." -ForegroundColor Green
            if ($venvType -eq "local") {
                $djangoCmd = "cd '$currentDir/backend/django_Admin3'; cd ../..; $activateCmd; cd backend/django_Admin3; python manage.py runserver $backendPort; exec bash"
            } else {
                $djangoCmd = "cd '$mainWorktree'; $activateCmd; cd '$currentDir/backend/django_Admin3'; python manage.py runserver $backendPort; exec bash"
            }

            if ($terminal -eq "gnome-terminal") {
                & $terminal -- bash -c $djangoCmd
            } else {
                & $terminal -e bash -c $djangoCmd
            }

            # Start React server
            Write-Host "Starting React on port $frontendPort..." -ForegroundColor Green
            if ($terminal -eq "gnome-terminal") {
                & $terminal -- bash -c "cd '$currentDir/frontend/react-Admin3'; npm start; exec bash"
            } else {
                & $terminal -e bash -c "cd '$currentDir/frontend/react-Admin3'; npm start; exec bash"
            }
        } else {
            Write-Host "No suitable terminal emulator found. Please install gnome-terminal, konsole, or xterm." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "`nBoth servers starting in separate windows..." -ForegroundColor Yellow
Write-Host "Backend: http://127.0.0.1:$backendPort" -ForegroundColor Cyan
Write-Host "Frontend: http://127.0.0.1:$frontendPort" -ForegroundColor Cyan