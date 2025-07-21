# Admin3 Secure Server Setup Script
# This script sets up the Admin3 application on Windows Server 2025
# Uses environment variables for sensitive configuration

param(
    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# =============================================================================
# CONFIGURATION AND SETUP
# =============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptDir "setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Load environment variables from .env file
function Load-EnvironmentVariables {
    param([string]$EnvFilePath)
    
    if (-not (Test-Path $EnvFilePath)) {
        Write-Error "Environment file not found: $EnvFilePath"
        Write-Host "Please copy .env.example to .env and configure your values"
        exit 1
    }
    
    Write-Host "Loading environment variables from: $EnvFilePath" -ForegroundColor Green
    
    Get-Content $EnvFilePath | ForEach-Object {
        if ($_ -match '^([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$'
            
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            
            if ($Verbose) {
                if ($name -match "(PASSWORD|KEY|SECRET)") {
                    Write-Host "  $name = ***REDACTED***" -ForegroundColor Yellow
                } else {
                    Write-Host "  $name = $value" -ForegroundColor Cyan
                }
            }
        }
    }
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Validate required environment variables
function Test-RequiredVariables {
    $requiredVars = @(
        "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD",
        "DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS",
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"
    )
    
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not [Environment]::GetEnvironmentVariable($var, "Process")) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error "Missing required environment variables: $($missingVars -join ', ')"
        exit 1
    }
    
    Write-Log "All required environment variables are set" "SUCCESS"
}

# =============================================================================
# SYSTEM PREPARATION
# =============================================================================

function Install-Prerequisites {
    Write-Log "Installing system prerequisites..."
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would install IIS, Python, Node.js, and other dependencies"
        return
    }
    
    # Enable IIS and required features
    $features = @(
        "IIS-WebServerRole",
        "IIS-WebServer",
        "IIS-CommonHttpFeatures",
        "IIS-HttpRedirect",
        "IIS-ApplicationDevelopment",
        "IIS-NetFxExtensibility45",
        "IIS-ISAPIExtensions",
        "IIS-ISAPIFilter",
        "IIS-ASPNET45"
    )
    
    foreach ($feature in $features) {
        Write-Log "Enabling Windows feature: $feature"
        Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart
    }
    
    # Install Chocolatey if not present
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Log "Installing Chocolatey package manager..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install required software
    $packages = @("python", "nodejs", "git", "redis-64", "postgresql13")
    
    foreach ($package in $packages) {
        Write-Log "Installing package: $package"
        choco install $package -y
    }
}

# =============================================================================
# APPLICATION DEPLOYMENT
# =============================================================================

function Deploy-Application {
    Write-Log "Deploying Admin3 application..."
    
    $appPath = "C:\inetpub\wwwroot\admin3"
    $backendPath = Join-Path $appPath "backend"
    $frontendPath = Join-Path $appPath "frontend"
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would deploy application to $appPath"
        return
    }
    
    # Create application directories
    if (-not (Test-Path $appPath)) {
        New-Item -ItemType Directory -Path $appPath -Force
    }
    
    # Setup Django backend
    Write-Log "Setting up Django backend..."
    
    # Create Django settings with environment variables
    $djangoSettings = @"
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://:{os.environ.get('REDIS_PASSWORD')}@{os.environ.get('REDIS_HOST')}:{os.environ.get('REDIS_PORT')}/1",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# AWS Configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_DEFAULT_REGION = os.environ.get('AWS_DEFAULT_REGION')
AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET')

# Email Configuration
EMAIL_HOST = os.environ.get('EMAIL_HOST')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_PASSWORD')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'C:/logs/admin3/django.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'detailed',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': os.environ.get('LOG_LEVEL', 'INFO'),
            'propagate': True,
        },
    },
}
"@
    
    # Save Django production settings
    $settingsPath = Join-Path $backendPath "django_Admin3\settings\production.py"
    if (-not (Test-Path (Split-Path $settingsPath))) {
        New-Item -ItemType Directory -Path (Split-Path $settingsPath) -Force
    }
    Set-Content -Path $settingsPath -Value $djangoSettings
    
    Write-Log "Django production settings created with environment variable integration"
}

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

function Configure-Security {
    Write-Log "Configuring security settings..."
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would configure Windows Firewall, SSL, and security policies"
        return
    }
    
    # Configure Windows Firewall
    Write-Log "Configuring Windows Firewall rules..."
    
    # Allow HTTP/HTTPS traffic
    New-NetFirewallRule -DisplayName "Admin3-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
    New-NetFirewallRule -DisplayName "Admin3-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
    
    # Block direct access to Django/Waitress port
    New-NetFirewallRule -DisplayName "Admin3-Django-Block" -Direction Inbound -Protocol TCP -LocalPort 8888 -Action Block
    
    # Configure SSL certificate (if paths are provided)
    $sslCertPath = [Environment]::GetEnvironmentVariable("SSL_CERT_PATH", "Process")
    $sslKeyPath = [Environment]::GetEnvironmentVariable("SSL_KEY_PATH", "Process")
    
    if ($sslCertPath -and $sslKeyPath -and (Test-Path $sslCertPath) -and (Test-Path $sslKeyPath)) {
        Write-Log "Configuring SSL certificate..."
        # Import and configure SSL certificate
        Import-Certificate -FilePath $sslCertPath -CertStoreLocation Cert:\LocalMachine\My
    }
}

# =============================================================================
# MONITORING AND LOGGING
# =============================================================================

function Setup-Monitoring {
    Write-Log "Setting up monitoring and logging..."
    
    # Create log directories
    $logDirs = @("C:\logs\admin3", "C:\logs\iis", "C:\logs\system")
    
    foreach ($dir in $logDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force
        }
    }
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would configure CloudWatch agent and log forwarding"
        return
    }
    
    Write-Log "Log directories created successfully"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

function Main {
    Write-Log "Starting Admin3 Server Setup" "INFO"
    Write-Log "Script Location: $ScriptDir" "INFO"
    Write-Log "Environment File: $EnvFile" "INFO"
    Write-Log "Dry Run Mode: $DryRun" "INFO"
    
    try {
        # Load environment variables
        $envPath = Join-Path $ScriptDir $EnvFile
        Load-EnvironmentVariables -EnvFilePath $envPath
        
        # Validate configuration
        Test-RequiredVariables
        
        # Execute setup steps
        if (-not $SkipDependencies) {
            Install-Prerequisites
        }
        
        Deploy-Application
        Configure-Security
        Setup-Monitoring
        
        Write-Log "Admin3 server setup completed successfully!" "SUCCESS"
        Write-Log "Log file saved to: $LogFile" "INFO"
        
        if ($DryRun) {
            Write-Host "`nDRY RUN COMPLETED - No changes were made to the system" -ForegroundColor Yellow
        } else {
            Write-Host "`nSETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
            Write-Host "Please review the log file for details: $LogFile" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Log "Setup failed: $($_.Exception.Message)" "ERROR"
        Write-Error "Setup failed. Check the log file for details: $LogFile"
        exit 1
    }
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Display banner
Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                    Admin3 Secure Server Setup                   ║
║                  Windows Server 2025 Enterprise                 ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Administrator and try again."
    exit 1
}

# Execute main function
Main