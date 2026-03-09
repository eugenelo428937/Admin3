#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Install Docker Engine on Windows Server 2019 for running Linux containers.
    Based on diagnostic results from network-diagnostic.ps1.

.DESCRIPTION
    This script performs a 3-phase installation:
      Phase 1: Enable Windows features (Hyper-V + Containers) - REQUIRES REBOOT
      Phase 2: Install Docker Engine - REQUIRES REBOOT
      Phase 3: Validate installation and configure for Linux containers

    Run this script multiple times - it detects which phase to execute next.

.NOTES
    - Must be run as Administrator
    - Requires 2 reboots total
    - After each reboot, re-run this script to continue
    - Ports 80/443 must be free (stop IIS if running)
#>

$ErrorActionPreference = 'Stop'

function Write-Step($step, $message) {
    Write-Host "`n[$step] $message" -ForegroundColor Cyan
}

function Write-OK($message) {
    Write-Host "  [OK] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "  [WARN] $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
    Write-Host "  [FAIL] $message" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Docker Installation for Windows Server 2019" -ForegroundColor Cyan
Write-Host " Admin3 Staging Environment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# -- Detect current state --

$hypervFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
$containersFeature = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

$hypervEnabled = $hypervFeature.State -eq 'Enabled'
$containersEnabled = $containersFeature.State -eq 'Enabled'
$dockerReady = $null -ne $dockerInstalled

Write-Host "Current state:" -ForegroundColor White
Write-Host "  Hyper-V:    $(if ($hypervEnabled) { 'Enabled' } else { 'Not enabled' })"
Write-Host "  Containers: $(if ($containersEnabled) { 'Enabled' } else { 'Not enabled' })"
Write-Host "  Docker:     $(if ($dockerReady) { 'Installed' } else { 'Not installed' })"


# ============================================================
# PHASE 1: Enable Windows Features
# ============================================================

if (-not $hypervEnabled -or -not $containersEnabled) {
    Write-Step "PHASE 1" "Enabling Windows features (Hyper-V + Containers)"
    Write-Host "  This phase requires a reboot. After reboot, re-run this script." -ForegroundColor Gray

    $rebootNeeded = $false

    if (-not $containersEnabled) {
        Write-Step "1a" "Enabling Containers feature..."
        $result = Enable-WindowsOptionalFeature -Online -FeatureName Containers -NoRestart
        if ($result.RestartNeeded) { $rebootNeeded = $true }
        Write-OK "Containers feature enabled"
    } else {
        Write-OK "Containers feature already enabled"
    }

    if (-not $hypervEnabled) {
        Write-Step "1b" "Enabling Hyper-V feature..."
        # Hyper-V has sub-features that need enabling
        $hypervFeatures = @(
            'Microsoft-Hyper-V',
            'Microsoft-Hyper-V-Management-PowerShell',
            'Microsoft-Hyper-V-Management-Clients'
        )
        foreach ($feat in $hypervFeatures) {
            $f = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
            if ($f -and $f.State -ne 'Enabled') {
                $result = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-Management-PowerShell -NoRestart -ErrorAction SilentlyContinue
                if ($result -and $result.RestartNeeded) { $rebootNeeded = $true }
                Write-OK "Enabled: $feat"
            }
        }
    } else {
        Write-OK "Hyper-V already enabled"
    }

    if ($rebootNeeded) {
        Write-Host "`n========================================" -ForegroundColor Yellow
        Write-Host " REBOOT REQUIRED" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host " Windows features have been enabled." -ForegroundColor White
        Write-Host " Please reboot the server, then re-run this script." -ForegroundColor White
        Write-Host ""
        $confirm = Read-Host "Reboot now? (y/n)"
        if ($confirm -eq 'y') {
            Restart-Computer -Force
        }
        exit 0
    }
}


# ============================================================
# PHASE 2: Install Docker Engine
# ============================================================

if (-not $dockerReady) {
    Write-Step "PHASE 2" "Installing Docker Engine"

    # Method: Install Docker via OneGet/DockerMsftProvider
    # This is the officially supported method for Windows Server 2019

    Write-Step "2a" "Installing NuGet package provider..."
    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
    Write-OK "NuGet provider installed"

    Write-Step "2b" "Installing DockerMsftProvider module..."
    $existingModule = Get-Module -ListAvailable -Name DockerMsftProvider -ErrorAction SilentlyContinue
    if (-not $existingModule) {
        Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    }
    Write-OK "DockerMsftProvider module installed"

    Write-Step "2c" "Installing Docker package (this may take a few minutes)..."
    $existingDocker = Get-Package -Name Docker -ProviderName DockerMsftProvider -ErrorAction SilentlyContinue
    if (-not $existingDocker) {
        Install-Package -Name Docker -ProviderName DockerMsftProvider -Force
    }
    Write-OK "Docker package installed"

    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host " REBOOT REQUIRED" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " Docker has been installed." -ForegroundColor White
    Write-Host " Please reboot the server, then re-run this script." -ForegroundColor White
    Write-Host ""
    $confirm = Read-Host "Reboot now? (y/n)"
    if ($confirm -eq 'y') {
        Restart-Computer -Force
    }
    exit 0
}


# ============================================================
# PHASE 3: Validate and Configure
# ============================================================

Write-Step "PHASE 3" "Validating Docker installation"

# 3a: Check Docker service
Write-Step "3a" "Checking Docker service..."
$dockerService = Get-Service -Name Docker -ErrorAction SilentlyContinue
if (-not $dockerService) {
    Write-Fail "Docker service not found. Installation may have failed."
    Write-Host "  Try: Install-Package -Name Docker -ProviderName DockerMsftProvider -Force" -ForegroundColor Gray
    exit 1
}

if ($dockerService.Status -ne 'Running') {
    Write-Warn "Docker service is not running. Starting..."
    Start-Service Docker
    Start-Sleep -Seconds 5
    $dockerService = Get-Service -Name Docker
}

if ($dockerService.Status -eq 'Running') {
    Write-OK "Docker service is running"
} else {
    Write-Fail "Docker service failed to start. Check: Get-EventLog -LogName Application -Source Docker -Newest 10"
    exit 1
}

# 3b: Docker version
Write-Step "3b" "Docker version..."
$version = docker version 2>&1
Write-Host $version -ForegroundColor Gray

# 3c: Switch to Linux containers
Write-Step "3c" "Checking container mode..."
$osType = docker info --format '{{.OSType}}' 2>&1
if ($osType -eq 'linux') {
    Write-OK "Already using Linux containers"
} else {
    Write-Warn "Currently using Windows containers. Switching to Linux containers..."
    Write-Host "  Admin3 stack requires Linux containers (PostgreSQL, Redis, Nginx)." -ForegroundColor Gray

    # The dockercli switch command
    $dockerCliPath = 'C:\Program Files\Docker\Docker\DockerCli.exe'
    if (Test-Path $dockerCliPath) {
        & $dockerCliPath -SwitchLinuxEngine
        Start-Sleep -Seconds 5
        $osType = docker info --format '{{.OSType}}' 2>&1
        if ($osType -eq 'linux') {
            Write-OK "Switched to Linux containers"
        } else {
            Write-Warn "Could not auto-switch. Manual steps:"
            Write-Host "  1. Right-click Docker tray icon" -ForegroundColor Gray
            Write-Host "  2. Select 'Switch to Linux containers'" -ForegroundColor Gray
        }
    } else {
        Write-Host "  DockerCli.exe not found at expected path." -ForegroundColor Yellow
        Write-Host "  For Docker EE on Server 2019, Linux containers run via Hyper-V isolation." -ForegroundColor Gray
        Write-Host "  Ensure Hyper-V is enabled and use: docker run --isolation=hyperv ..." -ForegroundColor Gray
    }
}

# 3d: Test container run
Write-Step "3d" "Testing container run (hello-world)..."
$hello = docker run --rm hello-world 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "hello-world container ran successfully"
} else {
    Write-Fail "hello-world failed: $hello"
    Write-Host "  Check Docker logs: Get-EventLog -LogName Application -Source Docker -Newest 10" -ForegroundColor Gray
}

# 3e: Test Docker Compose
Write-Step "3e" "Checking Docker Compose..."
$composeVersion = docker compose version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "Docker Compose available: $composeVersion"
} else {
    Write-Warn "Docker Compose V2 not found. Installing..."
    Write-Host "  Docker Compose V2 is a Docker CLI plugin." -ForegroundColor Gray

    $composeDir = "$env:ProgramFiles\Docker\cli-plugins"
    if (-not (Test-Path $composeDir)) {
        New-Item -ItemType Directory -Path $composeDir -Force | Out-Null
    }

    $composeUrl = 'https://github.com/docker/compose/releases/latest/download/docker-compose-windows-x86_64.exe'
    $composePath = Join-Path $composeDir 'docker-compose.exe'

    Write-Host "  Downloading Docker Compose V2..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $composeUrl -OutFile $composePath -UseBasicParsing
        Write-OK "Docker Compose V2 installed"

        $composeVersion = docker compose version 2>&1
        Write-Host "  $composeVersion" -ForegroundColor Gray
    } catch {
        Write-Fail "Could not download Docker Compose: $($_.Exception.Message)"
        Write-Host "  Download manually from: https://github.com/docker/compose/releases" -ForegroundColor Gray
    }
}

# 3f: Port conflict check
Write-Step "3f" "Checking port conflicts (8080, 8443)..."
Write-Host "  Docker Compose maps 8080->80 and 8443->443 to avoid IIS conflicts." -ForegroundColor Gray
$port8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
$port8443 = Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue

if ($port8080) {
    $proc8080 = Get-Process -Id $port8080.OwningProcess -ErrorAction SilentlyContinue
    Write-Warn "Port 8080 in use by: $($proc8080.Name) (PID: $($port8080.OwningProcess))"
} else {
    Write-OK "Port 8080 is available"
}

if ($port8443) {
    $proc8443 = Get-Process -Id $port8443.OwningProcess -ErrorAction SilentlyContinue
    Write-Warn "Port 8443 in use by: $($proc8443.Name) (PID: $($port8443.OwningProcess))"
} else {
    Write-OK "Port 8443 is available"
}

# 3g: Pull a test image
Write-Step "3g" "Pulling test image (alpine:latest)..."
$pullResult = docker pull alpine:latest 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "Image pull successful"
} else {
    Write-Fail "Image pull failed: $pullResult"
}

# -- Summary --

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Install Git: https://git-scm.com/download/win" -ForegroundColor Gray
Write-Host "  2. Run network-diagnostic.ps1 again to verify all checks pass" -ForegroundColor Gray
Write-Host "  3. Run setup-runner.ps1 to configure GitHub Actions runner" -ForegroundColor Gray
Write-Host "  4. Deploy with: docker compose up -d" -ForegroundColor Gray
Write-Host "  5. Access site at https://<server-ip>:8443" -ForegroundColor Gray
Write-Host ""
