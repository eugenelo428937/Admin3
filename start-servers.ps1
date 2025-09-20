# Start both Django and React servers in separate terminals
Write-Host "Starting Django and React servers..." -ForegroundColor Green

# Detect OS and set activation command
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $activateCmd = ".\.venv\Scripts\Activate.ps1"
} else {
    $activateCmd = "source .venv/bin/activate"
}

# Start Django server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\backend\django_Admin3\'; $activateCmd; python .\manage.py runserver 8888"

# Start React server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\frontend\react-Admin3\'; npm start"

Write-Host "Both servers starting in separate windows..." -ForegroundColor Yellow