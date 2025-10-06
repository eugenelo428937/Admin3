# Admin3 Environment Loader Script
# This script loads environment variables from .env files
# Usage: . .\load-environment.ps1

param(
    [string]$EnvFile = ".env"
)

function Load-EnvironmentVariables {
    param([string]$EnvFilePath)
    
    # Check for .env file in the script directory
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $envPath = Join-Path $scriptDir $EnvFilePath
    
    if (-not (Test-Path $envPath)) {
        # Try .env.uat as fallback
        $envPath = Join-Path $scriptDir ".env.uat"
        if (-not (Test-Path $envPath)) {
            Write-Warning "Environment file not found: $EnvFilePath"
            Write-Host "Available files:" -ForegroundColor Yellow
            Get-ChildItem -Path $scriptDir -Filter "*.env*" | ForEach-Object {
                Write-Host "  $($_.Name)" -ForegroundColor Cyan
            }
            return $false
        } else {
            Write-Host "Using fallback environment file: .env.uat" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Loading environment variables from: $(Split-Path -Leaf $envPath)" -ForegroundColor Green
    
    $loadedVars = 0
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        # Skip comments and empty lines
        if ($line -and -not $line.StartsWith('#')) {
            if ($line -match '^([^=]+)\s*=\s*(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                
                # Remove quotes if present
                $value = $value -replace '^["'']|["'']$'
                
                # Set environment variable
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
                $loadedVars++
                
                # Show loaded variable (mask sensitive ones)
                if ($name -match "(PASSWORD|KEY|SECRET|TOKEN)") {
                    Write-Host "  $name = ***MASKED***" -ForegroundColor Yellow
                } else {
                    Write-Host "  $name = $value" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host "Loaded $loadedVars environment variables" -ForegroundColor Green
    return $true
}

# Auto-load environment if script is run directly
if ($MyInvocation.InvocationName -ne '.') {
    Load-EnvironmentVariables -EnvFilePath $EnvFile
}