# Admin3 Master Setup Script Runner
# This script orchestrates the entire Admin3 server setup process

param(
    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env",
    [switch]$SkipInitialSetup,
    [switch]$SkipDatabase,
    [switch]$SkipRedis,
    [switch]$SkipApplication,
    [switch]$SkipMonitoring,
    [switch]$RunTests,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                     Admin3 Server Setup                         ║
║              Comprehensive Installation Script                  ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Administrator and try again."
    exit 1
}

# Load environment variables
$envLoader = Join-Path $ScriptDir "load-environment.ps1"
if (Test-Path $envLoader) {
    . $envLoader -EnvFile $EnvFile
    Write-Host ""  # Add spacing after environment loading
} else {
    Write-Warning "Environment loader not found. Some scripts may fail without proper environment variables."
}

function Write-SetupLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(
        switch ($Level) {
            "INFO" { "White" }
            "SUCCESS" { "Green" }
            "WARNING" { "Yellow" }
            "ERROR" { "Red" }
            default { "White" }
        }
    )
}

function Run-Script {
    param(
        [string]$ScriptName,
        [string]$Description,
        [array]$Arguments = @()
    )
    
    $scriptPath = Join-Path $ScriptDir $ScriptName
    
    if (-not (Test-Path $scriptPath)) {
        Write-SetupLog "Script not found: $scriptPath" -Level "ERROR"
        return $false
    }
    
    Write-SetupLog "Running: $Description" -Level "INFO"
    
    if ($DryRun) {
        Write-SetupLog "DRY RUN: Would execute $ScriptName with arguments: $($Arguments -join ' ')" -Level "WARNING"
        return $true
    }
    
    try {
        if ($Arguments.Count -gt 0) {
            & $scriptPath @Arguments
        } else {
            & $scriptPath
        }
        
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-SetupLog "$Description completed successfully" -Level "SUCCESS"
            return $true
        } else {
            Write-SetupLog "$Description failed with exit code: $LASTEXITCODE" -Level "ERROR"
            return $false
        }
    } catch {
        Write-SetupLog "$Description failed with error: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

try {
    Write-SetupLog "Starting Admin3 server setup process..."
    
    # Step 1: Initial EC2 Setup
    if (-not $SkipInitialSetup) {
        if (-not (Run-Script "01-initial-ec2-setup.ps1" "Initial EC2 Setup and Dependencies")) {
            throw "Initial setup failed"
        }
    }
    
    # Step 2: Database Setup
    if (-not $SkipDatabase) {
        Write-Host "`nPlease ensure you have the correct database credentials before proceeding." -ForegroundColor Yellow
        $dbPassword = Read-Host "Enter RDS master password" -AsSecureString
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
        
        if (-not (Run-Script "02-rds-database-setup.ps1" "RDS Database Setup" @("-MasterPassword", $plainPassword))) {
            throw "Database setup failed"
        }
    }
    
    # Step 3: Redis Installation and Setup
    if (-not $SkipRedis) {
        if (-not (Run-Script "03-redis-installation.ps1" "Redis Installation")) {
            throw "Redis installation failed"
        }
        
        if (-not (Run-Script "04-redis-service-setup.ps1" "Redis Service Setup")) {
            Write-SetupLog "Redis service setup failed, attempting troubleshooting..." -Level "WARNING"
            if (-not (Run-Script "05-redis-troubleshooting.ps1" "Redis Troubleshooting" @("-ForceReset"))) {
                throw "Redis setup and recovery failed"
            }
        }
    }
    
    # Step 4: Application Deployment
    if (-not $SkipApplication) {
        if (-not (Run-Script "06-iis-application-setup.ps1" "IIS and Application Setup")) {
            throw "Application deployment failed"
        }
    }
    
    # Step 5: Monitoring Setup
    if (-not $SkipMonitoring) {
        if (-not (Run-Script "07-monitoring-logging.ps1" "Monitoring and Logging Setup")) {
            Write-SetupLog "Monitoring setup failed but continuing..." -Level "WARNING"
        }
    }
    
    # Step 6: Initial Backup
    Write-SetupLog "Creating initial backups..." -Level "INFO"
    Run-Script "09-backup-database.ps1" "Initial Database Backup"
    Run-Script "10-backup-application.ps1" "Initial Application Backup"
    
    # Step 7: Health Checks
    Write-SetupLog "Running system health checks..." -Level "INFO"
    Run-Script "08-troubleshooting.ps1" "System Health Check"
    
    # Step 8: Pre-Go-Live Validation (if requested)
    if ($RunTests) {
        Write-SetupLog "Running pre-go-live validation..." -Level "INFO"
        if (-not (Run-Script "14-pre-golive-checklist.ps1" "Pre-Go-Live Validation")) {
            Write-SetupLog "Some validation tests failed. Please review before production use." -Level "WARNING"
        }
    }
    
    Write-SetupLog "Admin3 server setup completed successfully!" -Level "SUCCESS"
    
    Write-Host "`n" -ForegroundColor Green
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                     SETUP COMPLETED!                            ║" -ForegroundColor Green
    Write-Host "║                                                                  ║" -ForegroundColor Green
    Write-Host "║  Your Admin3 server is now ready for use.                       ║" -ForegroundColor Green
    Write-Host "║                                                                  ║" -ForegroundColor Green
    Write-Host "║  Next Steps:                                                     ║" -ForegroundColor Green
    Write-Host "║  1. Configure your .env file with production settings           ║" -ForegroundColor Green
    Write-Host "║  2. Set up SSL certificates for HTTPS                           ║" -ForegroundColor Green
    Write-Host "║  3. Configure monitoring alerts                                  ║" -ForegroundColor Green
    Write-Host "║  4. Schedule automated backups                                   ║" -ForegroundColor Green
    Write-Host "║  5. Run regular maintenance scripts                              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
} catch {
    Write-SetupLog "Setup failed: $_" -Level "ERROR"
    Write-Host "`nSetup failed. Check the logs and run individual scripts manually if needed." -ForegroundColor Red
    Write-Host "Available troubleshooting script: .\08-troubleshooting.ps1" -ForegroundColor Yellow
    exit 1
}