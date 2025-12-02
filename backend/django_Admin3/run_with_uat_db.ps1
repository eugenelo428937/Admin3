# PowerShell script to run Django commands against UAT database locally
# Usage: .\run_with_uat_db.ps1 "shell"
# Usage: .\run_with_uat_db.ps1 "export_orders_to_dbf --output exports/orders.dbf"

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

# Load environment from .env.uat.local
$envFile = Join-Path $PSScriptRoot ".env.uat.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "Loaded environment from: $envFile" -ForegroundColor Green
} else {
    Write-Host "Error: $envFile not found!" -ForegroundColor Red
    exit 1
}

# Ensure we use UAT settings
$env:DJANGO_SETTINGS_MODULE = "django_Admin3.settings.uat"

Write-Host "Connecting to UAT database: $env:DB_HOST`:$env:DB_PORT/$env:DB_NAME" -ForegroundColor Cyan

# Run the Django command
$fullCommand = "python manage.py $Command"
Write-Host "Running: $fullCommand" -ForegroundColor Yellow
Invoke-Expression $fullCommand
