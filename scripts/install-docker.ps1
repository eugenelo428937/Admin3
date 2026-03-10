#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Install Docker Engine on Windows Server 2019 for running Linux containers.
    Based on diagnostic results from network-diagnostic.ps1.

.DESCRIPTION
    This script performs a 3-phase installation:
      Phase 1: Enable Windows features (Hyper-V + Containers)
               Uses Install-WindowsFeature on Server, Enable-WindowsOptionalFeature on Client
               MAY REQUIRE REBOOT
      Phase 2: Install Docker CE via static binaries from download.docker.com
               (The old DockerMsftProvider/NuGet method is deprecated and broken)
               NO REBOOT REQUIRED
      Phase 3: Validate installation, install Docker Compose V2, and check
               Linux container support (WSL2 required on Server 2019)

    Run this script multiple times - it detects which phase to execute next.

.NOTES
    - Must be run as Administrator
    - Phase 1 may require a reboot if features are not yet enabled
    - Phase 2 (Docker CE binary install) does not require a reboot
    - Phase 3 may prompt to enable WSL2 features (requires reboot)
    - Ports 8080/8443 must be free (stop IIS if running)
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
Write-Host " Staging Environment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# -- Detect OS type (Server vs Client) --

$isServer = (Get-CimInstance Win32_OperatingSystem).ProductType -ne 1  # 1 = Workstation

# -- Detect current state --

if ($isServer) {
    # Windows Server: use Get-WindowsFeature (Server Manager)
    $hypervFeature = Get-WindowsFeature -Name Hyper-V -ErrorAction SilentlyContinue
    $containersFeature = Get-WindowsFeature -Name Containers -ErrorAction SilentlyContinue
    $hypervEnabled = $hypervFeature.InstallState -eq 'Installed'
    $containersEnabled = $containersFeature.InstallState -eq 'Installed'
} else {
    # Windows Client (10/11): use Get-WindowsOptionalFeature
    $hypervFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
    $containersFeature = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
    $hypervEnabled = $hypervFeature.State -eq 'Enabled'
    $containersEnabled = $containersFeature.State -eq 'Enabled'
}

$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
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

    if ($isServer) {
        # Windows Server: use Install-WindowsFeature
        if (-not $containersEnabled) {
            Write-Step "1a" "Enabling Containers feature..."
            $result = Install-WindowsFeature -Name Containers
            if ($result.RestartNeeded -ne 'No') { $rebootNeeded = $true }
            Write-OK "Containers feature enabled"
        } else {
            Write-OK "Containers feature already enabled"
        }

        if (-not $hypervEnabled) {
            Write-Step "1b" "Enabling Hyper-V feature..."
            $result = Install-WindowsFeature -Name Hyper-V -IncludeManagementTools
            if ($result.RestartNeeded -ne 'No') { $rebootNeeded = $true }
            Write-OK "Hyper-V feature enabled (with management tools)"
        } else {
            Write-OK "Hyper-V already enabled"
        }
    } else {
        # Windows Client (10/11): use Enable-WindowsOptionalFeature
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
            $result = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart
            if ($result.RestartNeeded) { $rebootNeeded = $true }
            Write-OK "Hyper-V feature enabled"
        } else {
            Write-OK "Hyper-V already enabled"
        }
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
    Write-Step "PHASE 2" "Installing Docker Engine (CE static binaries)"

    # Method: Download Docker CE static binaries directly from Docker
    # The old DockerMsftProvider/NuGet method is deprecated and broken

    $dockerVersion = "29.3.0"
    $dockerZipUrl = "https://download.docker.com/win/static/stable/x86_64/docker-$dockerVersion.zip"
    $dockerZipPath = Join-Path $env:TEMP "docker-$dockerVersion.zip"
    $dockerInstallDir = "$env:ProgramFiles\docker"

    Write-Step "2a" "Downloading Docker CE $dockerVersion..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    try {
        Invoke-WebRequest -Uri $dockerZipUrl -OutFile $dockerZipPath -UseBasicParsing
        Write-OK "Downloaded docker-$dockerVersion.zip"
    } catch {
        Write-Fail "Download failed: $($_.Exception.Message)"
        Write-Host "  Manual download: $dockerZipUrl" -ForegroundColor Gray
        exit 1
    }

    Write-Step "2b" "Extracting to $dockerInstallDir..."
    Expand-Archive -Path $dockerZipPath -DestinationPath $env:ProgramFiles -Force
    Write-OK "Extracted Docker binaries"

    Write-Step "2c" "Adding Docker to system PATH..."
    $machinePath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)
    if ($machinePath -notlike "*$dockerInstallDir*") {
        [Environment]::SetEnvironmentVariable("PATH", "$machinePath;$dockerInstallDir", [EnvironmentVariableTarget]::Machine)
        $env:PATH += ";$dockerInstallDir"
    }
    Write-OK "Docker added to PATH"

    Write-Step "2d" "Registering Docker as a Windows service..."
    & "$dockerInstallDir\dockerd.exe" --register-service
    Write-OK "Docker service registered"

    Write-Step "2e" "Starting Docker service..."
    Start-Service Docker
    Start-Sleep -Seconds 5
    Write-OK "Docker service started"

    # Clean up zip
    Remove-Item $dockerZipPath -Force -ErrorAction SilentlyContinue

    Write-Host "`n  Docker CE $dockerVersion installed successfully." -ForegroundColor Green
    Write-Host "  No reboot required for binary install." -ForegroundColor Gray
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
    Write-Host "  Try re-running this script to install Docker CE binaries." -ForegroundColor Gray
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

# 3c: Check Linux container support (required for Admin3 stack)
Write-Step "3c" "Checking container mode..."
$osType = docker info --format '{{.OSType}}' 2>&1
if ($osType -eq 'linux') {
    Write-OK "Already using Linux containers"
} else {
    Write-Warn "Currently using Windows containers."
    Write-Host "  Admin3 stack requires Linux containers (PostgreSQL, Nginx, Python)." -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray

    # Check if WSL2 is available (needed for Linux containers on Server 2019)
    $wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslAvailable) {
        Write-OK "WSL is installed. Configure Docker to use WSL2 backend."
        Write-Host "  Add to C:\ProgramData\docker\config\daemon.json:" -ForegroundColor Gray
        Write-Host '  { "features": { "buildkit": true } }' -ForegroundColor Gray
    } else {
        Write-Warn "WSL2 is not installed. Required for Linux containers on Server 2019."
        Write-Host "" -ForegroundColor Gray
        Write-Host "  To install WSL2 on Windows Server 2019:" -ForegroundColor White

        # Check if WSL feature is enabled
        $wslFeature = if ($isServer) {
            Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
        } else {
            Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
        }
        $vmpFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue

        $wslEnabled = $wslFeature -and $wslFeature.State -eq 'Enabled'
        $vmpEnabled = $vmpFeature -and $vmpFeature.State -eq 'Enabled'

        if (-not $wslEnabled -or -not $vmpEnabled) {
            Write-Host "  Step 1: Enable Windows features (run as Admin):" -ForegroundColor Yellow
            if (-not $wslEnabled) {
                Write-Host "    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart" -ForegroundColor Gray
            }
            if (-not $vmpEnabled) {
                Write-Host "    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart" -ForegroundColor Gray
            }
            Write-Host "    Then REBOOT the server." -ForegroundColor Yellow
        } else {
            Write-OK "WSL and VirtualMachinePlatform features already enabled"
        }

        Write-Host "  Step 2: After reboot, download and install the WSL2 kernel update:" -ForegroundColor Yellow
        Write-Host "    https://aka.ms/wsl2kernel" -ForegroundColor Cyan
        Write-Host "  Step 3: Install a Linux distro:" -ForegroundColor Yellow
        Write-Host "    wsl --install -d Ubuntu" -ForegroundColor Gray
        Write-Host "  Step 4: Stop Docker Windows service, reconfigure daemon.json," -ForegroundColor Yellow
        Write-Host "    and restart. Then re-run this script to verify." -ForegroundColor Yellow
        Write-Host "" -ForegroundColor Gray

        # Offer to enable features now
        if (-not $wslEnabled -or -not $vmpEnabled) {
            $confirm = Read-Host "Enable WSL2 features now? (y/n)"
            if ($confirm -eq 'y') {
                if (-not $wslEnabled) {
                    Write-Step "3c.1" "Enabling Microsoft-Windows-Subsystem-Linux..."
                    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart
                    Write-OK "WSL feature enabled"
                }
                if (-not $vmpEnabled) {
                    Write-Step "3c.2" "Enabling VirtualMachinePlatform..."
                    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
                    Write-OK "VirtualMachinePlatform feature enabled"
                }
                Write-Host "`n========================================" -ForegroundColor Yellow
                Write-Host " REBOOT REQUIRED" -ForegroundColor Yellow
                Write-Host "========================================" -ForegroundColor Yellow
                Write-Host " WSL2 features enabled. Reboot, then:" -ForegroundColor White
                Write-Host " 1. Install WSL2 kernel: https://aka.ms/wsl2kernel" -ForegroundColor White
                Write-Host " 2. Run: wsl --install -d Ubuntu" -ForegroundColor White
                Write-Host " 3. Re-run this script" -ForegroundColor White
                Write-Host ""
                $rebootConfirm = Read-Host "Reboot now? (y/n)"
                if ($rebootConfirm -eq 'y') {
                    Restart-Computer -Force
                }
                exit 0
            }
        }
    }
}

# 3d: Test container run
Write-Step "3d" "Testing container run..."
# Use appropriate test image based on container mode
if ($osType -eq 'linux') {
    Write-Host "  Running Linux hello-world..." -ForegroundColor Gray
    $hello = docker run --rm hello-world 2>&1
} else {
    Write-Host "  Running Windows hello-world (Linux containers not yet configured)..." -ForegroundColor Gray
    $hello = docker run --rm mcr.microsoft.com/hello-world 2>&1
}
if ($LASTEXITCODE -eq 0) {
    Write-OK "Test container ran successfully"
} else {
    Write-Fail "Test container failed: $hello"
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
Write-Step "3g" "Pulling test image..."
if ($osType -eq 'linux') {
    Write-Host "  Pulling alpine:latest (Linux)..." -ForegroundColor Gray
    $pullResult = docker pull alpine:latest 2>&1
} else {
    Write-Host "  Pulling mcr.microsoft.com/windows/nanoserver:ltsc2019 (Windows)..." -ForegroundColor Gray
    $pullResult = docker pull mcr.microsoft.com/windows/nanoserver:ltsc2019 2>&1
}
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

if ($osType -ne 'linux') {
    Write-Host "IMPORTANT: Linux container support is not yet configured." -ForegroundColor Yellow
    Write-Host "Admin3 requires Linux containers. Complete these steps first:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Enable WSL2 features (if not done):" -ForegroundColor White
    Write-Host "     Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart" -ForegroundColor Gray
    Write-Host "     Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart" -ForegroundColor Gray
    Write-Host "  2. Reboot the server" -ForegroundColor White
    Write-Host "  3. Install WSL2 kernel update: https://aka.ms/wsl2kernel" -ForegroundColor White
    Write-Host "  4. Install Ubuntu: wsl --install -d Ubuntu" -ForegroundColor White
    Write-Host "  5. Re-run this script to verify Linux container support" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Install Git (if needed): https://git-scm.com/download/win" -ForegroundColor Gray
    Write-Host "  2. Clone the Admin3 repo" -ForegroundColor Gray
    Write-Host "  3. Deploy with: docker compose -f docker-compose.yml up -d" -ForegroundColor Gray
    Write-Host "  4. Access site at https://<server-ip>:8443" -ForegroundColor Gray
    Write-Host ""
}
