# =============================================================
# Email Worker for UAT Database (runs locally)
# =============================================================
# This script runs the email queue processor on your local machine
# connecting to the Railway UAT database. Since your machine can
# access the internal SMTP server (20.49.225.55), emails will send.
# =============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Email Worker - UAT Database (Local Machine)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.uat file
$envFile = Join-Path $PSScriptRoot ".env.uat"
if (Test-Path $envFile) {
    Write-Host "Loading environment from .env.uat..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        # Skip empty lines and comments
        if ($_ -match '^\s*$' -or $_ -match '^\s*#') {
            return
        }
        # Parse KEY=VALUE or KEY="VALUE" format
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove surrounding quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            $value = $value -replace "^'(.*)'$", '$1'
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "ERROR: .env.uat file not found at $envFile" -ForegroundColor Red
    Write-Host "Please ensure .env.uat exists in the same directory as this script." -ForegroundColor Red
    exit 1
}

# Override specific settings for local worker
$env:ALLOWED_HOSTS = "$env:ALLOWED_HOSTS,127.0.0.1,localhost"

Write-Host "Settings loaded from .env.uat:" -ForegroundColor Green
Write-Host "  DJANGO_ENV: $env:DJANGO_ENV"
Write-Host "  DATABASE: Railway UAT (trolley.proxy.rlwy.net)"
Write-Host "  EMAIL_HOST: $env:EMAIL_HOST`:$env:EMAIL_PORT"
Write-Host "  EMAIL_AUTH: $env:EMAIL_AUTH_METHOD"
Write-Host "  FROM: $env:DEFAULT_FROM_EMAIL"
Write-Host ""

# Change to the Django project directory
Set-Location $PSScriptRoot

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& c:\Code\Admin3\.venv\Scripts\Activate.ps1

# Run the email queue processor
Write-Host ""
Write-Host "Starting email queue processor (continuous mode)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

python manage.py process_email_queue --continuous --interval 15
