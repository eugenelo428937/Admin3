# Start both Django and React servers in separate terminals
Write-Host "Starting Django and React servers..." -ForegroundColor Green

# Detect OS and set activation command
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $activateCmd = ".\.venv\Scripts\activate"
} else {
    $activateCmd = "source .venv/bin/activate"
}

# Start Django server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$activateCmd; cd '.\backend\django_Admin3\'; python .\manage.py runserver 8888"

# Start React server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\frontend\react-Admin3\'; npm start"

Write-Host "Both servers starting in separate windows..." -ForegroundColor Yellow