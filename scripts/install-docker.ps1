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

function Invoke-Download($Url, $OutFile, $Description) {
    # Download large files reliably. Invoke-WebRequest on PS 5.1 is painfully slow
    # for large files — it buffers everything in memory. Try faster alternatives first.

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # Method 1: curl.exe (ships with Windows Server 2019, handles redirects, shows progress)
    $curlExe = "$env:SystemRoot\System32\curl.exe"
    if (Test-Path $curlExe) {
        Write-Host "  Downloading $Description via curl.exe..." -ForegroundColor Gray
        & $curlExe -L -o $OutFile --fail --retry 3 --connect-timeout 30 $Url
        if ($LASTEXITCODE -eq 0 -and (Test-Path $OutFile)) {
            return $true
        }
        Write-Host "  curl.exe failed, trying fallback..." -ForegroundColor Yellow
    }

    # Method 2: .NET WebClient (much faster than Invoke-WebRequest, no memory buffering)
    Write-Host "  Downloading $Description via .NET WebClient..." -ForegroundColor Gray
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($Url, $OutFile)
        if (Test-Path $OutFile) {
            return $true
        }
    } catch {
        Write-Host "  WebClient failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # Method 3: BITS Transfer (supports resume, good for flaky connections)
    Write-Host "  Downloading $Description via BITS Transfer..." -ForegroundColor Gray
    try {
        Start-BitsTransfer -Source $Url -Destination $OutFile -ErrorAction Stop
        if (Test-Path $OutFile) {
            return $true
        }
    } catch {
        Write-Host "  BITS failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    return $false
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
    $downloaded = Invoke-Download -Url $dockerZipUrl -OutFile $dockerZipPath -Description "Docker CE $dockerVersion"
    if ($downloaded) {
        Write-OK "Downloaded docker-$dockerVersion.zip"
    } else {
        Write-Fail "All download methods failed."
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
    Write-Host "  On Server 2019, Linux containers run via WSL2 with Docker Engine inside the distro." -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray

    # --- Manual WSL2 Installation for Windows Server 2019 ---
    # Reference: https://learn.microsoft.com/en-us/windows/wsl/install-on-server
    # Server 2019 does NOT support 'wsl --install'. Must install manually.

    # Step 1: Check and enable required Windows features
    $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
    $vmpFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue

    $wslEnabled = $wslFeature -and $wslFeature.State -eq 'Enabled'
    $vmpEnabled = $vmpFeature -and $vmpFeature.State -eq 'Enabled'

    if (-not $wslEnabled -or -not $vmpEnabled) {
        Write-Step "3c.1" "Enabling WSL2 Windows features..."

        $rebootNeeded = $false
        if (-not $wslEnabled) {
            Write-Host "  Enabling Microsoft-Windows-Subsystem-Linux..." -ForegroundColor Gray
            $result = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart
            if ($result.RestartNeeded) { $rebootNeeded = $true }
            Write-OK "WSL feature enabled"
        } else {
            Write-OK "WSL feature already enabled"
        }

        if (-not $vmpEnabled) {
            Write-Host "  Enabling VirtualMachinePlatform..." -ForegroundColor Gray
            $result = Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
            if ($result.RestartNeeded) { $rebootNeeded = $true }
            Write-OK "VirtualMachinePlatform feature enabled"
        } else {
            Write-OK "VirtualMachinePlatform already enabled"
        }

        if ($rebootNeeded) {
            Write-Host "`n========================================" -ForegroundColor Yellow
            Write-Host " REBOOT REQUIRED" -ForegroundColor Yellow
            Write-Host "========================================" -ForegroundColor Yellow
            Write-Host " WSL2 features have been enabled." -ForegroundColor White
            Write-Host " Please reboot the server, then re-run this script." -ForegroundColor White
            Write-Host ""
            $rebootConfirm = Read-Host "Reboot now? (y/n)"
            if ($rebootConfirm -eq 'y') {
                Restart-Computer -Force
            }
            exit 0
        }
    } else {
        Write-OK "WSL and VirtualMachinePlatform features already enabled"
    }

    # Step 2: Download and install the WSL2 Linux kernel update
    Write-Step "3c.2" "WSL2 Linux kernel update..."
    $wsl2KernelMsi = Join-Path $env:TEMP "wsl_update_x64.msi"
    $wsl2KernelUrl = "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi"

    # Check if WSL2 kernel is already installed by looking for the kernel file
    $wsl2KernelInstalled = Test-Path "$env:SystemRoot\System32\lxss\tools\kernel"

    if (-not $wsl2KernelInstalled) {
        $downloaded = 
        
        Invoke-Download -Url $wsl2KernelUrl -OutFile $wsl2KernelMsi -Description "WSL2 kernel update"
        if ($downloaded) {
            Write-OK "Downloaded wsl_update_x64.msi"

            Write-Host "  Installing WSL2 kernel (silent)..." -ForegroundColor Gray
            Start-Process "msiexec.exe" -ArgumentList "/i `"$wsl2KernelMsi`" /quiet /norestart" -NoNewWindow -Wait
            Write-OK "WSL2 kernel update installed"

            Remove-Item $wsl2KernelMsi -Force -ErrorAction SilentlyContinue
        } else {
            Write-Fail "Failed to download WSL2 kernel."
            Write-Host "  Download manually: $wsl2KernelUrl" -ForegroundColor Gray
            Write-Host "  Then run: msiexec /i wsl_update_x64.msi /quiet" -ForegroundColor Gray
            exit 1
        }
    } else {
        Write-OK "WSL2 kernel already installed"
    }

    # Step 3: Set WSL default version to 2
    Write-Step "3c.3" "Setting WSL default version to 2..."
    wsl --set-default-version 2 2>&1 | Out-Null
    Write-OK "WSL default version set to 2"

    # Step 4: Download and install Ubuntu distro (manual method for Server 2019)
    Write-Step "3c.4" "Installing Ubuntu WSL2 distro..."

    # Check if any WSL distro is already installed
    $wslList = wsl -l -q 2>&1
    $hasDistro = $false
    if ($LASTEXITCODE -eq 0 -and $wslList -and $wslList.Trim()) {
        # Filter out empty lines and check for actual distro names
        $distros = $wslList | Where-Object { $_.Trim() -ne '' }
        if ($distros) {
            $hasDistro = $true
            Write-OK "WSL distro already installed: $($distros -join ', ')"
        }
    }

    if (-not $hasDistro) {
        $ubuntuAppxUrl = "https://aka.ms/wslubuntu"
        $ubuntuAppxPath = "D:\Docker Setup\Ubuntu.appx"
        $ubuntuInstallDir = "D:\Docker Setup\Ubuntu"

        $downloaded = Invoke-Download -Url $ubuntuAppxUrl -OutFile $ubuntuAppxPath -Description "Ubuntu 22"
        if ($downloaded) {
            Write-OK "Downloaded Ubuntu 22.04 appx"
        } else {
            Write-Fail "Failed to download Ubuntu."
            Write-Host "  Download manually from: $ubuntuAppxUrl" -ForegroundColor Gray
            Write-Host "  Save to: $ubuntuAppxPath" -ForegroundColor Gray
            exit 1
        }

        # Extract the appx (it's a zip) to the install directory
        Write-Host "  Extracting Ubuntu to $ubuntuInstallDir..." -ForegroundColor Gray
        if (-not (Test-Path $ubuntuInstallDir)) {
            New-Item -ItemType Directory -Path $ubuntuInstallDir -Force | Out-Null
        }

        # Rename .appx to .zip for extraction
        $ubuntuZipPath = $ubuntuAppxPath -replace '\.appx$', '.zip'
        Copy-Item $ubuntuAppxPath $ubuntuZipPath -Force
        Expand-Archive -Path $ubuntuZipPath -DestinationPath $ubuntuInstallDir -Force

        # Find the inner x64 appx (e.g., Ubuntu_2204.1.7.0_x64.appx)
        $innerAppx = Get-ChildItem -Path $ubuntuInstallDir -Filter "*x64*.appx" | Select-Object -First 1
        if ($innerAppx) {
            Write-Host "  Extracting inner x64 package: $($innerAppx.Name)..." -ForegroundColor Gray
            $innerZip = $innerAppx.FullName -replace '\.appx$', '.zip'
            Copy-Item $innerAppx.FullName $innerZip -Force
            Expand-Archive -Path $innerZip -DestinationPath $ubuntuInstallDir -Force
            Remove-Item $innerZip -Force -ErrorAction SilentlyContinue
        }

        # Add to PATH so ubuntu.exe / ubuntu2204.exe can be found
        $machinePath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)
        if ($machinePath -notlike "*$ubuntuInstallDir*") {
            [Environment]::SetEnvironmentVariable("PATH", "$machinePath;$ubuntuInstallDir", [EnvironmentVariableTarget]::Machine)
            $env:PATH += ";$ubuntuInstallDir"
        }

        # Clean up downloaded files
        Remove-Item $ubuntuAppxPath -Force -ErrorAction SilentlyContinue
        Remove-Item $ubuntuZipPath -Force -ErrorAction SilentlyContinue

        Write-OK "Ubuntu 22.04 extracted to $ubuntuInstallDir"

        # Find the Ubuntu launcher executable
        $ubuntuExe = Get-ChildItem -Path $ubuntuInstallDir -Filter "ubuntu*.exe" | Select-Object -First 1
        if ($ubuntuExe) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Yellow
            Write-Host " MANUAL STEP REQUIRED: Initialize Ubuntu" -ForegroundColor Yellow
            Write-Host "========================================" -ForegroundColor Yellow
            Write-Host " Run this command to initialize Ubuntu (creates user account):" -ForegroundColor White
            Write-Host "   $($ubuntuExe.FullName)" -ForegroundColor Cyan
            Write-Host "" -ForegroundColor White
            Write-Host " After Ubuntu initializes, install Docker Engine inside WSL2:" -ForegroundColor White
            Write-Host "   # Inside the Ubuntu terminal:" -ForegroundColor Gray
            Write-Host "   curl -fsSL https://get.docker.com | sh" -ForegroundColor Cyan
            Write-Host "   sudo usermod -aG docker `$USER" -ForegroundColor Cyan
            Write-Host "   # Close and reopen Ubuntu for group change to take effect" -ForegroundColor Gray
            Write-Host "   sudo service docker start" -ForegroundColor Cyan
            Write-Host "" -ForegroundColor White
            Write-Host " Then ensure D:\AMS has the repo files (see summary below) and run:" -ForegroundColor White
            Write-Host "   cd /mnt/d/AMS" -ForegroundColor Cyan
            Write-Host "   docker compose up -d" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Warn "Could not find Ubuntu launcher in $ubuntuInstallDir"
            Write-Host "  Check the directory and run the ubuntu*.exe to initialize." -ForegroundColor Gray
        }
    } else {
        # Distro already installed - check if Docker Engine is running inside WSL2
        Write-Step "3c.5" "Checking Docker Engine inside WSL2..."
        wsl -e docker version 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Docker Engine is running inside WSL2"
            Write-Host ""
            Write-Host "  To run Admin3 staging stack:" -ForegroundColor White
            Write-Host "    wsl -e bash -c 'cd /mnt/d/AMS && docker compose up -d'" -ForegroundColor Cyan
        } else {
            Write-Warn "Docker Engine not found inside WSL2 distro."
            Write-Host "  Install Docker Engine inside your WSL2 Ubuntu:" -ForegroundColor Yellow
            Write-Host "    wsl" -ForegroundColor Cyan
            Write-Host "    # Inside Ubuntu terminal:" -ForegroundColor Gray
            Write-Host "    curl -fsSL https://get.docker.com | sh" -ForegroundColor Cyan
            Write-Host "    sudo usermod -aG docker `$USER" -ForegroundColor Cyan
            Write-Host "    sudo service docker start" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Then re-run this script to verify." -ForegroundColor Yellow
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

    $downloaded = Invoke-Download -Url $composeUrl -OutFile $composePath -Description "Docker Compose V2"
    if ($downloaded) {
        Write-OK "Docker Compose V2 installed"
        $composeVersion = docker compose version 2>&1
        Write-Host "  $composeVersion" -ForegroundColor Gray
    } else {
        Write-Fail "Could not download Docker Compose."
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

Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host " DEPLOYMENT FOLDER SETUP" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "Step A: Create deployment folder on the server:" -ForegroundColor White
Write-Host "  mkdir D:\AMS" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step B: Copy the following files/folders from the repo to D:\AMS:" -ForegroundColor White
Write-Host ""
Write-Host "  D:\AMS\" -ForegroundColor Gray
Write-Host "  |-- docker-compose.yml          # Main compose stack definition" -ForegroundColor Gray
Write-Host "  |-- .env                         # Created from .env.example (see Step C)" -ForegroundColor Gray
Write-Host "  |-- .dockerignore                # Build context exclusions" -ForegroundColor Gray
Write-Host "  |" -ForegroundColor Gray
Write-Host "  |-- docker\" -ForegroundColor Gray
Write-Host "  |   |-- init.sql                 # PostgreSQL schema init (acted, adm)" -ForegroundColor Gray
Write-Host "  |" -ForegroundColor Gray
Write-Host "  |-- backend\" -ForegroundColor Gray
Write-Host "  |   |-- django_Admin3\" -ForegroundColor Gray
Write-Host "  |       |-- Dockerfile           # Django multi-stage build" -ForegroundColor Gray
Write-Host "  |       |-- requirements.txt     # Python dependencies" -ForegroundColor Gray
Write-Host "  |       |-- manage.py            # Django management" -ForegroundColor Gray
Write-Host "  |       |-- django_Admin3\        # Django settings package" -ForegroundColor Gray
Write-Host "  |       |-- apps\                 # All Django apps" -ForegroundColor Gray
Write-Host "  |       |-- railway-start.sh     # Container entrypoint script" -ForegroundColor Gray
Write-Host "  |       |-- .dockerignore        # Backend build exclusions" -ForegroundColor Gray
Write-Host "  |" -ForegroundColor Gray
Write-Host "  |-- frontend\" -ForegroundColor Gray
Write-Host "  |   |-- react-Admin3\" -ForegroundColor Gray
Write-Host "  |       |-- package.json         # Node dependencies" -ForegroundColor Gray
Write-Host "  |       |-- package-lock.json    # Lock file for reproducible builds" -ForegroundColor Gray
Write-Host "  |       |-- public\               # Static assets" -ForegroundColor Gray
Write-Host "  |       |-- src\                  # React source code" -ForegroundColor Gray
Write-Host "  |       |-- .env.staging         # Frontend staging env vars" -ForegroundColor Gray
Write-Host "  |" -ForegroundColor Gray
Write-Host "  |-- nginx\" -ForegroundColor Gray
Write-Host "      |-- Dockerfile               # Nginx multi-stage build (builds React)" -ForegroundColor Gray
Write-Host "      |-- nginx.conf               # Reverse proxy + SSL config" -ForegroundColor Gray
Write-Host "      |-- generate-cert.sh         # Self-signed SSL cert generator" -ForegroundColor Gray
Write-Host ""
Write-Host "  Easiest method (from a machine with Git access):" -ForegroundColor White
Write-Host "    git clone -b staging https://github.com/eugenelo428937/Admin3.git D:\AMS" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or copy via network share / USB / RDP file transfer." -ForegroundColor Gray
Write-Host "  NOTE: Do NOT copy node_modules, .venv, __pycache__, or .git (saves ~1GB)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Step C: Create the .env file:" -ForegroundColor White
Write-Host "  copy D:\AMS\.env.example D:\AMS\.env" -ForegroundColor Cyan
Write-Host "  notepad D:\AMS\.env" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Required edits in .env:" -ForegroundColor White
Write-Host "    POSTGRES_PASSWORD=<strong-password>" -ForegroundColor Gray
Write-Host "    REDIS_PASSWORD=<strong-password>" -ForegroundColor Gray
Write-Host "    DJANGO_SECRET_KEY=<random-50-char-string>" -ForegroundColor Gray
Write-Host "    SERVER_NAME=7.0.240.83" -ForegroundColor Gray
Write-Host "    ALLOWED_HOSTS=7.0.240.83,localhost,127.0.0.1" -ForegroundColor Gray
Write-Host "    CORS_ALLOWED_ORIGINS=https://7.0.240.83:8443,https://localhost:8443" -ForegroundColor Gray
Write-Host "    CSRF_TRUSTED_ORIGINS=https://7.0.240.83:8443,https://localhost:8443" -ForegroundColor Gray
Write-Host "    FRONTEND_URL=https://7.0.240.83:8443" -ForegroundColor Gray
Write-Host "    HTTP_PORT=8080" -ForegroundColor Gray
Write-Host "    HTTPS_PORT=8443" -ForegroundColor Gray
Write-Host ""

if ($osType -ne 'linux') {
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host " WSL2 SETUP (Server 2019)" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT: Linux containers run inside WSL2 on Server 2019." -ForegroundColor Yellow
    Write-Host "The Windows Docker service only runs Windows containers." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If WSL2 setup did not complete above, follow these manual steps:" -ForegroundColor White
    Write-Host "  1. Enable features (this script does this automatically):" -ForegroundColor White
    Write-Host "     Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux,VirtualMachinePlatform" -ForegroundColor Gray
    Write-Host "  2. Reboot the server" -ForegroundColor White
    Write-Host "  3. Re-run this script (installs WSL2 kernel + Ubuntu automatically)" -ForegroundColor White
    Write-Host "  4. Initialize Ubuntu: run the ubuntu*.exe launcher" -ForegroundColor White
    Write-Host "  5. Install Docker Engine inside WSL2 Ubuntu:" -ForegroundColor White
    Write-Host "     curl -fsSL https://get.docker.com | sh" -ForegroundColor Cyan
    Write-Host "     sudo usermod -aG docker `$USER" -ForegroundColor Cyan
    Write-Host "     sudo service docker start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Step D: Start the Admin3 stack from WSL2:" -ForegroundColor White
    Write-Host "  wsl" -ForegroundColor Cyan
    Write-Host "  cd /mnt/d/AMS && docker compose up -d" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Step E: Verify at https://7.0.240.83:8443" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Step D: Start the Admin3 stack:" -ForegroundColor White
    Write-Host "  cd D:\AMS" -ForegroundColor Cyan
    Write-Host "  docker compose up -d" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Step E: Verify at https://7.0.240.83:8443" -ForegroundColor White
    Write-Host ""
}
