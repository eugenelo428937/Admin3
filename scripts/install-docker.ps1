#Requires -RunAsAdministrator
param(
    [ValidateRange(1,8)]
    [int]$StartPhase = 1
)
<#
.SYNOPSIS
    Set up WSL2 with Docker Engine for running Linux containers on Windows 11.
    Hosts the Admin3 staging environment (PostgreSQL, Django, Nginx, Redis).

.DESCRIPTION
    This script performs a multi-phase setup:
      Phase 1: Enable WSL2 and Virtual Machine Platform features
               MAY REQUIRE REBOOT
      Phase 2: Install/update WSL2 and Ubuntu distro
      Phase 3: Configure WSL2 (systemd, memory limits, mirrored networking)
      Phase 4: Install Docker Engine inside WSL2 Ubuntu
      Phase 5: Set up port forwarding for external access (if needed)
      Phase 6: Restore database from seed dump (if tables are missing)
      Phase 7: Check port conflicts on the host
      Phase 8: Detect and offer cleanup for previous Hyper-V/Docker Desktop artifacts

    Run this script multiple times safely -- it detects completed phases.
    Use -StartPhase to skip to a specific phase (e.g., -StartPhase 6 to re-seed DB).

    WHY WSL2 + Docker Engine (not Docker Desktop):
      Docker Desktop requires a paid license for enterprise/commercial use.
      WSL2 with Docker Engine is free, lightweight, and fully supported on Windows 11.
      No Hyper-V VM management overhead -- WSL2 handles the Linux kernel natively.

.PARAMETER StartPhase
    Phase number (1-8) to start from. Phases before this number are skipped.
    Default: 1 (run all phases).

.EXAMPLE
    .\install-docker.ps1 -StartPhase 3
    Skips phases 1-2, starts from WSL2 configuration.

.NOTES
    - Must be run as Administrator
    - Phase 1 may require a reboot -- re-run this script afterwards
    - Target: Windows 11 (build 22000+)
#>

$ErrorActionPreference = 'Stop'

# ============================================================
# CONFIGURATION -- Edit these values to match your environment
# ============================================================

$WSLDistro = "Ubuntu"

# User profile where .wslconfig will be installed
# This is the Windows user who will run WSL (not necessarily the admin running this script)
$WSLUserProfile = "C:\Users\elo"

# Ports to forward from host to WSL2 (for external network access)
$DockerPorts = @(
    @{ HostPort = 8080;  Description = "HTTP (nginx)" },
    @{ HostPort = 8443;  Description = "HTTPS (nginx)" }
)

# WSL2 resource limits (applied via .wslconfig)
$WSLMemory     = "4GB"
$WSLProcessors = 2
$WSLSwap       = "2GB"

# Manual install (when Microsoft Store is blocked)
$UbuntuDownloadUrl = "https://aka.ms/wslubuntu2204"
$DockerSetupDir    = "C:\Temp\Docker Setup"            # Working directory for install artifacts
$LocalAppxBundle   = Join-Path $DockerSetupDir "Ubuntu2204.appxbundle"  # Pre-downloaded appxbundle
$WSLInstallDir     = Join-Path $env:LOCALAPPDATA "WSL\Ubuntu"

# ============================================================
# HELPER FUNCTIONS
# ============================================================

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

# ============================================================
# BANNER
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Admin3 Staging -- WSL2 Docker Setup" -ForegroundColor Cyan
Write-Host " Windows 11" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($StartPhase -gt 1) {
    Write-Host " Skipping to Phase $StartPhase" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# PRE-FLIGHT: Windows Version Check
# ============================================================

$osBuild = [System.Environment]::OSVersion.Version.Build
if ($osBuild -lt 22000) {
    Write-Fail "Windows 11 required (build 22000+). Current build: $osBuild"
    Write-Host "  WSL2 with systemd requires Windows 11." -ForegroundColor Gray
    exit 1
}
Write-OK "Windows 11 detected (build $osBuild)"

# ============================================================
# STATE DETECTION
# ============================================================

$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
$vmFeature  = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
$wslEnabled = $wslFeature -and $wslFeature.State -eq 'Enabled'
$vmEnabled  = $vmFeature -and $vmFeature.State -eq 'Enabled'

$wslExe = Get-Command wsl.exe -ErrorAction SilentlyContinue
$distroInstalled = $false
$distroReady     = $false
if ($wslExe) {
    # wsl -l -q outputs UTF-16; join and clean null bytes for reliable matching
    $distroList = (wsl -l -q 2>&1 | Out-String) -replace "`0", ""
    if ($LASTEXITCODE -eq 0 -and $distroList -match $WSLDistro) {
        $distroInstalled = $true
        # Check if first-time setup is done (can we run a command?)
        $whoami = wsl -d $WSLDistro -e whoami 2>&1
        if ($LASTEXITCODE -eq 0 -and $whoami.Trim() -ne '') {
            $distroReady = $true
        }
    }
}

$dockerInstalled = $false
if ($distroReady) {
    $dockerVer = wsl -d $WSLDistro -e bash -c "docker --version 2>/dev/null" 2>&1
    if ($LASTEXITCODE -eq 0 -and $dockerVer -match 'Docker version') {
        $dockerInstalled = $true
    }
}

Write-Host "Current state:" -ForegroundColor White
Write-Host "  WSL Feature:      $(if ($wslEnabled) { 'Enabled' } else { 'Not enabled' })"
Write-Host "  VM Platform:      $(if ($vmEnabled) { 'Enabled' } else { 'Not enabled' })"
Write-Host "  Ubuntu Distro:    $(if ($distroReady) { 'Ready' } elseif ($distroInstalled) { 'Installed (needs first-time setup)' } else { 'Not installed' })"
Write-Host "  Docker Engine:    $(if ($dockerInstalled) { 'Installed' } else { 'Not installed' })"


# ============================================================
# PHASE 1: Enable WSL2 Features
# ============================================================

if ($StartPhase -gt 1) {
    Write-Step "PHASE 1" "Skipped (--StartPhase $StartPhase)"
} elseif (-not $wslEnabled -or -not $vmEnabled) {
    Write-Step "PHASE 1" "Enabling WSL2 features"

    $rebootNeeded = $false

    if (-not $wslEnabled) {
        Write-Step "1a" "Enabling Windows Subsystem for Linux..."
        $result = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart
        if ($result.RestartNeeded) { $rebootNeeded = $true }
        Write-OK "WSL feature enabled"
    } else {
        Write-OK "WSL feature already enabled"
    }

    if (-not $vmEnabled) {
        Write-Step "1b" "Enabling Virtual Machine Platform..."
        $result = Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
        if ($result.RestartNeeded) { $rebootNeeded = $true }
        Write-OK "Virtual Machine Platform enabled"
    } else {
        Write-OK "Virtual Machine Platform already enabled"
    }

    if ($rebootNeeded) {
        Write-Host "`n========================================" -ForegroundColor Yellow
        Write-Host " REBOOT REQUIRED" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host " WSL2 features have been enabled." -ForegroundColor White
        Write-Host " Please reboot, then re-run this script." -ForegroundColor White
        Write-Host ""
        $confirm = Read-Host "Reboot now? (y/n)"
        if ($confirm -eq 'y') {
            Restart-Computer -Force
        }
        exit 0
    }
} else {
    Write-Step "PHASE 1" "WSL2 features already enabled -- skipping"
}


# ============================================================
# PHASE 2: Install WSL2 and Ubuntu Distro
# ============================================================

if ($StartPhase -gt 2) {
    Write-Step "PHASE 2" "Skipped (--StartPhase $StartPhase)"
} else {

Write-Step "PHASE 2" "Installing WSL2 and Ubuntu distro"

# Set WSL2 as default version
Write-Step "2a" "Setting WSL2 as default version..."
wsl --set-default-version 2 2>&1 | Out-Null
Write-OK "WSL2 set as default"

# Update WSL to latest (Store version required for systemd support)
Write-Step "2b" "Updating WSL to latest version..."
$savedEAP2 = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
wsl --update 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Store update failed -- trying web download..."
    wsl --update --web-download 2>&1 | Out-Null
}
$ErrorActionPreference = $savedEAP2

# Verify WSL version supports systemd
$wslVer = (wsl --version 2>&1 | Out-String).Trim()
if ($wslVer -match 'WSL.*?:\s*([\d\.]+)') {
    Write-OK "WSL updated to $($Matches[1])"
} elseif ($wslVer -match 'Invalid') {
    Write-Fail "WSL is still the old inbox version (systemd not supported)"
    Write-Host "  Run manually: wsl --update --web-download" -ForegroundColor Cyan
    Write-Host "  Then re-run this script." -ForegroundColor Gray
    exit 1
} else {
    Write-OK "WSL updated"
}

if (-not $distroInstalled) {
    Write-Step "2c" "Installing Ubuntu distro..."

    # ── Strategy 1: wsl --install (requires Microsoft Store) ──
    Write-Host "  Attempting install via Microsoft Store..." -ForegroundColor Gray
    wsl --install -d $WSLDistro 2>&1 | Out-Null
    Start-Sleep -Seconds 5

    $postList = (wsl -l -q 2>&1 | Out-String) -replace "`0", ""
    if ($postList -match $WSLDistro) {
        Write-OK "Ubuntu installed via Microsoft Store"
        Write-Host ""
        Write-Host "  ========================================" -ForegroundColor Yellow
        Write-Host "  UBUNTU FIRST-TIME SETUP" -ForegroundColor Yellow
        Write-Host "  ========================================" -ForegroundColor Yellow
        Write-Host "  Ubuntu may have opened in a new console window." -ForegroundColor White
        Write-Host "  Create your username and password there." -ForegroundColor White
        Write-Host "  If no window appeared, run:  wsl -d Ubuntu" -ForegroundColor White
        Write-Host "  Then re-run this script to continue." -ForegroundColor White
        Write-Host "  ========================================" -ForegroundColor Yellow
        exit 0
    }

    # ── Strategy 2: Use local or download appxbundle, then sideload ──
    Write-Warn "Microsoft Store appears blocked. Installing Ubuntu from appxbundle..."
    $downloadPath = $LocalAppxBundle

    if (Test-Path $LocalAppxBundle) {
        $sizeMB = [math]::Round((Get-Item $LocalAppxBundle).Length / 1MB)
        Write-OK "Using pre-downloaded appxbundle: $LocalAppxBundle ($sizeMB MB)"
    } else {
        Write-Step "2c-i" "Local appxbundle not found at $LocalAppxBundle. Downloading Ubuntu 22.04 LTS (~500MB)..."
        if (-not (Test-Path $DockerSetupDir)) { New-Item -ItemType Directory -Path $DockerSetupDir -Force | Out-Null }
        $downloadPath = Join-Path $DockerSetupDir "Ubuntu2204.appxbundle"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $oldProgress = $ProgressPreference
            $ProgressPreference = 'SilentlyContinue'  # speeds up Invoke-WebRequest
            Invoke-WebRequest -Uri $UbuntuDownloadUrl -OutFile $downloadPath -UseBasicParsing
            $ProgressPreference = $oldProgress
            $sizeMB = [math]::Round((Get-Item $downloadPath).Length / 1MB)
            Write-OK "Downloaded ($sizeMB MB)"
        } catch {
            Write-Fail "Download failed: $($_.Exception.Message)"
            Write-Host "  Try downloading manually to: $LocalAppxBundle" -ForegroundColor Gray
            exit 1
        }
    }

    Write-Step "2c-ii" "Attempting sideload via Add-AppxPackage..."
    $sideloadOK = $false
    try {
        Add-AppxPackage $downloadPath -ErrorAction Stop
        Start-Sleep -Seconds 3
        $postSideload = (wsl -l -q 2>&1 | Out-String) -replace "`0", ""
        if ($postSideload -match $WSLDistro) {
            $sideloadOK = $true
            Write-OK "Ubuntu installed via sideload"
            Write-Host ""
            Write-Host "  ========================================" -ForegroundColor Yellow
            Write-Host "  UBUNTU FIRST-TIME SETUP" -ForegroundColor Yellow
            Write-Host "  ========================================" -ForegroundColor Yellow
            Write-Host "  Run:  wsl -d Ubuntu" -ForegroundColor Cyan
            Write-Host "  Create your username and password." -ForegroundColor White
            Write-Host "  Then re-run this script to continue." -ForegroundColor White
            Write-Host "  ========================================" -ForegroundColor Yellow
            exit 0
        }
    } catch {
        Write-Warn "Sideload blocked by policy. Using manual import..."
    }

    if (-not $sideloadOK) {
        # ── Strategy 3: Extract rootfs from appxbundle and wsl --import ──
        # Write-Step "2c-iii" "Extracting rootfs from appxbundle..."

         $extractPath = Join-Path $DockerSetupDir "Ubuntu2204-extract"
         $zipPath     = Join-Path $DockerSetupDir "Ubuntu2204.zip"

        # # Clean up any previous extraction
        # if (Test-Path $extractPath) { Remove-Item -LiteralPath $extractPath -Recurse -Force -ErrorAction SilentlyContinue }

        # # appxbundle is a zip -- rename and extract
        # Copy-Item $downloadPath $zipPath -Force
        # Expand-Archive $zipPath $extractPath -Force

        # # Find the x64 appx inside the bundle
        # $x64Appx = Get-ChildItem $extractPath -Filter "*.appx" | Where-Object {
        #     $_.Name -match 'x64|amd64'
        # } | Select-Object -First 1

        # if (-not $x64Appx) {
        #     # Some bundles have a single .appx without arch in the name
        #     $x64Appx = Get-ChildItem $extractPath -Filter "Ubuntu*.appx" | Select-Object -First 1
        # }

        # if (-not $x64Appx) {
        #     Write-Fail "Could not find x64 .appx inside the bundle"
        #     Write-Host "  Contents of $extractPath`:" -ForegroundColor Gray
        #     Get-ChildItem $extractPath | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Gray }
        #     exit 1
        # }

        # Write-OK "Found: $($x64Appx.Name)"

        # # The .appx is also a zip -- extract to find install.tar.gz (the rootfs)
        # $appxExtract = Join-Path $extractPath "appx-content"
        # $appxZip     = Join-Path $extractPath "ubuntu-appx.zip"
        # Copy-Item $x64Appx.FullName $appxZip -Force
        # Expand-Archive $appxZip $appxExtract -Force

        # $rootfs = Get-ChildItem $appxExtract -Filter "install.tar*" | Select-Object -First 1
        # if (-not $rootfs) {
        #     Write-Fail "Could not find rootfs tarball (install.tar*) inside .appx"
        #     Write-Host "  Contents of appx:" -ForegroundColor Gray
        #     Get-ChildItem $appxExtract | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Gray }
        #     exit 1
        # }

        # Write-OK "Found rootfs: $($rootfs.Name)"

        # # Create install directory
        # if (-not (Test-Path $WSLInstallDir)) {
        #     New-Item -ItemType Directory -Path $WSLInstallDir -Force | Out-Null
        # }

        # # Import into WSL2
        # Write-Step "2c-iv" "Importing Ubuntu into WSL2..."
        # wsl --import $WSLDistro $WSLInstallDir $rootfs.FullName --version 2 2>&1
        # if ($LASTEXITCODE -ne 0) {
        #     Write-Fail "wsl --import failed"
        #     exit 1
        # }
        # Write-OK "Ubuntu imported into WSL2 at $WSLInstallDir"

        # # Create a non-root default user
        # Write-Step "2c-v" "Creating Ubuntu user..."
        # $wslUser = Read-Host "  Enter a username for Ubuntu (default: admin)"
        # if (-not $wslUser -or $wslUser.Trim() -eq '') { $wslUser = "admin" }

        # wsl -d $WSLDistro -e bash -c "useradd -m -s /bin/bash $wslUser 2>/dev/null" 2>&1 | Out-Null
        # wsl -d $WSLDistro -e bash -c "usermod -aG sudo $wslUser" 2>&1 | Out-Null
        # wsl -d $WSLDistro -e bash -c "echo '$wslUser ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/$wslUser && chmod 440 /etc/sudoers.d/$wslUser" 2>&1 | Out-Null
        # Write-OK "User '$wslUser' created with sudo access"

        # Write-Host ""
        # Write-Host "  Set a password for '$wslUser':" -ForegroundColor Yellow
        # wsl -d $WSLDistro -e passwd $wslUser

        # Write /etc/wsl.conf via staging file + /mnt/c/ copy
        # Uses .NET WriteAllLines to avoid UTF-8 BOM (BOM breaks WSL config parser)
        $wslUser = "actedadmin"
        $wslConfStaging = Join-Path $DockerSetupDir "wsl.conf"
        [System.IO.File]::WriteAllLines($wslConfStaging, @(
            "[user]",
            "default=$wslUser",
            "",
            "[boot]",
            "systemd=true",
            "",
            "[interop]",
            "enabled=true",
            "appendWindowsPath=true"
        ))
        # Convert Windows path to WSL /mnt/ path (e.g., C:\Temp\Docker Setup\wsl.conf -> /mnt/c/Temp/Docker Setup/wsl.conf)
        $wslMntPath = ($wslConfStaging -replace '\\','/') -replace '^([A-Za-z]):', { '/mnt/' + $_.Groups[1].Value.ToLower() }
        wsl -d $WSLDistro -e bash -c "sudo cp '$wslMntPath' /etc/wsl.conf" 2>&1 | Out-Null
        Write-OK "Configured /etc/wsl.conf (default user + systemd)"

        # Restart WSL for wsl.conf to take effect
        Write-Host "  Restarting WSL..." -ForegroundColor Gray
        wsl --shutdown 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        wsl -d $WSLDistro -e bash -c "echo WSL restarted" 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        Write-OK "WSL restarted"

        # Clean up temp extraction files (keep the appxbundle)
        Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $extractPath -Recurse -Force -ErrorAction SilentlyContinue

        # Update state so subsequent phases proceed
        $distroInstalled = $true
        $distroReady = $true
    }

} elseif (-not $distroReady) {
    Write-Host ""
    Write-Host "  ========================================" -ForegroundColor Yellow
    Write-Host "  UBUNTU FIRST-TIME SETUP REQUIRED" -ForegroundColor Yellow
    Write-Host "  ========================================" -ForegroundColor Yellow
    Write-Host "  Ubuntu is installed but not yet initialized." -ForegroundColor White
    Write-Host ""
    Write-Host "  Run this command:" -ForegroundColor White
    Write-Host "    wsl -d Ubuntu" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Create your username and password when prompted." -ForegroundColor White
    Write-Host "  Then type 'exit' and re-run this script." -ForegroundColor White
    Write-Host "  ========================================" -ForegroundColor Yellow
    exit 0

} else {
    Write-OK "Ubuntu distro already installed and ready"

    # Verify WSL version is 2 (clean UTF-16 null bytes from wsl output)
    $verOutput = (wsl -l -v 2>&1 | Out-String) -replace "`0", ""
    $ubuntuLine = $verOutput -split "`n" | Where-Object { $_ -match $WSLDistro }
    if ($ubuntuLine -and $ubuntuLine -match '\s2\s*$') {
        Write-OK "Ubuntu is running WSL version 2"
    } else {
        Write-Warn "Ubuntu may not be WSL2 -- converting..."
        wsl --set-version $WSLDistro 2 2>&1 | Out-Null
        Write-OK "Converted to WSL2"
    }
}

} # end Phase 2 skip guard


# ============================================================
# PHASE 3: Configure WSL2 (systemd, memory, networking)
# ============================================================

if ($StartPhase -gt 3) {
    Write-Step "PHASE 3" "Skipped (--StartPhase $StartPhase)"
} else {

Write-Step "PHASE 3" "Configuring WSL2"

# 3a: Enable systemd inside the distro (required for Docker service management)
Write-Step "3a" "Ensuring systemd is enabled in WSL2..."
$wslConf = wsl -d $WSLDistro -e bash -c "cat /etc/wsl.conf 2>/dev/null" 2>&1
$hasSystemd = ($wslConf | Out-String) -match 'systemd\s*=\s*true'

if (-not $hasSystemd) {
    Write-Host "  Enabling systemd in /etc/wsl.conf..." -ForegroundColor Gray
    # Write wsl.conf via staging file + /mnt/c/ copy (avoids UNC permission + printf escaping issues)
    $wslConfStaging = Join-Path $DockerSetupDir "wsl.conf"
    [System.IO.File]::WriteAllLines($wslConfStaging, @(
        "[boot]",
        "systemd=true",
        "",
        "[interop]",
        "enabled=true",
        "appendWindowsPath=true"
    ))
    $wslMntPath = ($wslConfStaging -replace '\\','/') -replace '^([A-Za-z]):', { '/mnt/' + $_.Groups[1].Value.ToLower() }
    wsl -d $WSLDistro -e bash -c "sudo cp '$wslMntPath' /etc/wsl.conf" 2>&1 | Out-Null

    Write-OK "systemd enabled -- restarting WSL..."
    wsl --shutdown 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    # Trigger restart
    wsl -d $WSLDistro -e bash -c "echo WSL restarted" 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    Write-OK "WSL restarted with systemd"
} else {
    Write-OK "systemd already enabled"
}

# 3b: Configure .wslconfig for resource limits
Write-Step "3b" "Configuring WSL2 resource limits..."
$wslConfigPath = Join-Path $WSLUserProfile ".wslconfig"
$wslConfigStaging = Join-Path $DockerSetupDir ".wslconfig"
$needsUpdate = $false

if (Test-Path $wslConfigPath) {
    $currentConfig = Get-Content $wslConfigPath -Raw
    # Check if key settings exist AND networking mode matches
    if ($currentConfig -match 'memory=' -and $currentConfig -match 'processors=') {
        # Also check if networking mode needs to change (e.g., mirrored -> nat)
        if ($currentConfig -match 'networkingMode\s*=\s*mirrored' -and $networkingMode -eq 'nat') {
            Write-Warn ".wslconfig has mirrored networking but NAT is configured -- updating..."
            $needsUpdate = $true
        } elseif ($currentConfig -match 'networkingMode\s*=\s*nat' -and $networkingMode -eq 'mirrored') {
            Write-Warn ".wslconfig has NAT networking but mirrored is configured -- updating..."
            $needsUpdate = $true
        } else {
            Write-OK ".wslconfig already configured: $wslConfigPath"
        }
    } else {
        $needsUpdate = $true
    }
} else {
    $needsUpdate = $true
}

if ($needsUpdate) {
    # Networking mode: "mirrored" shares host IP (no portproxy), "nat" gives WSL its own IP.
    # Mirrored requires build 22621+ but may be blocked by enterprise security software.
    # Default to NAT which is more reliable; set to "mirrored" if your network supports it.
    $networkingMode = "nat"

    $configContent = @"
[wsl2]
memory=$WSLMemory
processors=$WSLProcessors
swap=$WSLSwap
networkingMode=$networkingMode
"@

    # Write to staging dir first, then copy to user profile
    if (-not (Test-Path $DockerSetupDir)) { New-Item -ItemType Directory -Path $DockerSetupDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($wslConfigStaging, $configContent)
    Write-OK "Created .wslconfig in staging: $wslConfigStaging"
    Copy-Item -Path $wslConfigStaging -Destination $wslConfigPath -Force
    Write-OK "Copied to: $wslConfigPath"
    Write-Host "  memory=$WSLMemory, processors=$WSLProcessors, networking=$networkingMode" -ForegroundColor Gray

    if ($networkingMode -eq 'mirrored') {
        Write-OK "Mirrored networking enabled -- WSL2 shares the host IP (no portproxy needed)"
    } else {
        Write-Warn "NAT networking (build $osBuild). Upgrade to Win11 22H2+ for mirrored networking."
    }

    # Restart WSL for config to take effect
    Write-Host "  Restarting WSL for new config..." -ForegroundColor Gray
    wsl --shutdown 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    wsl -d $WSLDistro -e bash -c "echo WSL restarted" 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    Write-OK "WSL restarted with new resource limits"
} else {
    # Read current networking mode
    $currentConfig = Get-Content $wslConfigPath -Raw
    if ($currentConfig -match 'networkingMode\s*=\s*mirrored') {
        Write-OK "Mirrored networking already configured -- no portproxy needed"
    }
}

} # end Phase 3 skip guard


# ============================================================
# PHASE 4: Install Docker Engine in WSL2 Ubuntu
# ============================================================

if ($StartPhase -gt 4) {
    Write-Step "PHASE 4" "Skipped (--StartPhase $StartPhase)"
} else {

# WSL commands in Phase 4 write status/progress to stderr; relax error preference for the whole phase
$savedEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

Write-Step "PHASE 4" "Installing Docker Engine in WSL2 Ubuntu"

if (-not $dockerInstalled) {
    Write-Step "4a" "Installing Docker Engine via official install script..."
    Write-Host "  This may take 2-5 minutes..." -ForegroundColor Gray

    wsl -d $WSLDistro -e bash -c "curl -fsSL https://get.docker.com | sudo sh" 2>&1 | Out-Null
    $installExitCode = $LASTEXITCODE

    if ($installExitCode -ne 0) {
        Write-Fail "Docker installation failed (exit code: $installExitCode)"
        Write-Host "  Try manually:" -ForegroundColor Gray
        Write-Host "    wsl -d Ubuntu" -ForegroundColor Cyan
        Write-Host "    curl -fsSL https://get.docker.com | sudo sh" -ForegroundColor Cyan
        exit 1
    }
    Write-OK "Docker Engine installed"

    # Add current WSL user to docker group
    Write-Step "4b" "Adding user to docker group..."
    $wslUser = (wsl -d $WSLDistro -e whoami 2>&1).Trim()
    wsl -d $WSLDistro -e bash -c "sudo usermod -aG docker $wslUser" 2>&1 | Out-Null
    Write-OK "User '$wslUser' added to docker group"

    # Enable and start Docker service via systemd
    Write-Step "4c" "Enabling Docker service..."
    wsl -d $WSLDistro -e bash -c "sudo systemctl enable docker && sudo systemctl start docker" 2>&1 | Out-Null
    Start-Sleep -Seconds 3

    # Verify Docker
    $dockerVer = wsl -d $WSLDistro -e bash -c "sudo docker --version" 2>&1
    if ($dockerVer -match 'Docker version') {
        Write-OK "Docker Engine running: $($dockerVer.Trim())"
    } else {
        Write-Warn "Docker may not be running yet."
        Write-Host "  Check: wsl -d Ubuntu -e sudo systemctl status docker" -ForegroundColor Gray
    }

    # Verify Docker Compose
    $composeVer = wsl -d $WSLDistro -e bash -c "sudo docker compose version" 2>&1
    if ($composeVer -match 'Docker Compose') {
        Write-OK "Docker Compose: $($composeVer.Trim())"
    } else {
        Write-Warn "Docker Compose plugin not found."
        Write-Host "  Install: wsl -d Ubuntu -e sudo apt install -y docker-compose-plugin" -ForegroundColor Gray
    }

    # Note about newgrp
    Write-Host ""
    Write-Warn "IMPORTANT: The docker group change requires a new WSL session."
    Write-Host "  After this script finishes, close and reopen your WSL terminal" -ForegroundColor Gray
    Write-Host "  or run: wsl --shutdown" -ForegroundColor Gray
    Write-Host "  Then 'docker' commands will work without 'sudo'." -ForegroundColor Gray

} else {
    Write-OK "Docker Engine already installed"
    $dockerVer = wsl -d $WSLDistro -e bash -c "docker --version" 2>&1
    Write-Host "  Version: $($dockerVer.Trim())" -ForegroundColor Gray

    # Ensure current WSL user is in docker group (may have been missed or user changed)
    $wslUser = (wsl -d $WSLDistro -e whoami 2>&1 | Out-String).Trim()
    $inDockerGroup = (wsl -d $WSLDistro -e bash -c "id -nG $wslUser 2>/dev/null" 2>&1 | Out-String).Trim()
    if ($inDockerGroup -notmatch '\bdocker\b') {
        Write-Warn "User '$wslUser' not in docker group -- adding..."
        wsl -d $WSLDistro -e bash -c "sudo usermod -aG docker $wslUser" 2>&1 | Out-Null
        Write-OK "User '$wslUser' added to docker group (restart WSL session to take effect)"
    } else {
        Write-OK "User '$wslUser' is in docker group"
    }

    # Check if systemd is running as PID 1
    $initPid = (wsl -d $WSLDistro -e bash -c "ps -p 1 -o comm= 2>/dev/null" 2>&1 | Out-String).Trim()
    if ($initPid -ne 'systemd') {
        Write-Warn "systemd is not running as PID 1 (got: '$initPid') -- restarting WSL..."
        wsl --shutdown 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        wsl -d $WSLDistro -e bash -c "echo WSL restarted" 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        $initPid = (wsl -d $WSLDistro -e bash -c "ps -p 1 -o comm= 2>/dev/null" 2>&1 | Out-String).Trim()
        if ($initPid -eq 'systemd') {
            Write-OK "WSL restarted with systemd"
        } else {
            Write-Fail "systemd still not running after restart. Check /etc/wsl.conf has [boot] systemd=true"
            Write-Host "  Verify: wsl -d Ubuntu -e cat /etc/wsl.conf" -ForegroundColor Gray
        }
    } else {
        Write-OK "systemd running as PID 1"
    }

    # Ensure Docker service is running
    $dockerStatus = (wsl -d $WSLDistro -e bash -c "systemctl is-active docker 2>/dev/null" 2>&1 | Out-String).Trim()
    if ($dockerStatus -eq 'active') {
        Write-OK "Docker service is running"
    } elseif ($initPid -eq 'systemd') {
        Write-Warn "Docker service is not running -- starting..."
        wsl -d $WSLDistro -e bash -c "sudo systemctl enable docker && sudo systemctl start docker" 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        $dockerStatus = (wsl -d $WSLDistro -e bash -c "systemctl is-active docker 2>/dev/null" 2>&1 | Out-String).Trim()
        if ($dockerStatus -eq 'active') {
            Write-OK "Docker service started"
        } else {
            Write-Warn "Docker service may not have started. Check: wsl -d Ubuntu -e sudo systemctl status docker"
        }
    } else {
        Write-Warn "Cannot start Docker without systemd. Fix systemd first, then re-run with -StartPhase 4"
    }
}

$ErrorActionPreference = $savedEAP

} # end Phase 4 skip guard


# ============================================================
# PHASE 5: Port Forwarding for External Access
# ============================================================

if ($StartPhase -gt 5) {
    Write-Step "PHASE 5" "Skipped (--StartPhase $StartPhase)"
} else {

Write-Step "PHASE 5" "Configuring port forwarding for external access"
Write-Host "  Docker ports in WSL2 are accessible on localhost automatically." -ForegroundColor Gray
Write-Host "  Port forwarding is only needed for access from other machines." -ForegroundColor Gray

# Check if mirrored networking is active
# WSL reads .wslconfig from the user who launched wsl.exe (the admin), not necessarily $WSLUserProfile
$mirroredActive = $false
foreach ($cfgPath in @((Join-Path $env:USERPROFILE ".wslconfig"), (Join-Path $WSLUserProfile ".wslconfig"))) {
    if (Test-Path $cfgPath) {
        $cfgContent = Get-Content $cfgPath -Raw
        if ($cfgContent -match 'networkingMode\s*=\s*mirrored') {
            $mirroredActive = $true
            break
        }
    }
}

if ($mirroredActive) {
    Write-OK "Mirrored networking is configured -- ports are directly accessible on host IP"
    Write-Host "  No portproxy rules needed." -ForegroundColor Gray

    # Still set up firewall rules for inbound access
    Write-Step "5a" "Ensuring Windows Firewall allows Docker ports..."
    foreach ($pf in $DockerPorts) {
        $ruleName = "Admin3-$($pf.Description -replace '\s','-')-$($pf.HostPort)"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $ruleName `
                -Direction Inbound -Protocol TCP -LocalPort $pf.HostPort `
                -Action Allow -Profile Any | Out-Null
            Write-OK "Firewall rule created: $ruleName (TCP $($pf.HostPort))"
        } else {
            Write-OK "Firewall rule exists: $ruleName"
        }
    }
} else {
    # NAT mode: need portproxy rules
    Write-Host "  Using NAT networking mode -- setting up portproxy rules." -ForegroundColor Gray

    # Get WSL2 IP
    $wslIP = (wsl -d $WSLDistro -e bash -c "hostname -I" 2>&1).Trim()
    # Take first IP if multiple
    if ($wslIP -match '(\d+\.\d+\.\d+\.\d+)') {
        $wslIP = $Matches[1]
    }

    if ($wslIP -match '^\d+\.\d+\.\d+\.\d+$') {
        Write-OK "WSL2 IP: $wslIP"

        Write-Step "5a" "Setting up port forwarding rules..."
        foreach ($pf in $DockerPorts) {
            # Remove existing rule first (WSL2 IP may have changed)
            netsh interface portproxy delete v4tov4 listenport=$($pf.HostPort) listenaddress=0.0.0.0 2>&1 | Out-Null
            netsh interface portproxy add v4tov4 `
                listenport=$($pf.HostPort) listenaddress=0.0.0.0 `
                connectport=$($pf.HostPort) connectaddress=$wslIP | Out-Null
            Write-OK "Forward: *:$($pf.HostPort) -> ${wslIP}:$($pf.HostPort) ($($pf.Description))"
        }

        Write-Step "5b" "Ensuring Windows Firewall allows forwarded ports..."
        foreach ($pf in $DockerPorts) {
            $ruleName = "Admin3-$($pf.Description -replace '\s','-')-$($pf.HostPort)"
            $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
            if (-not $existing) {
                New-NetFirewallRule -DisplayName $ruleName `
                    -Direction Inbound -Protocol TCP -LocalPort $pf.HostPort `
                    -Action Allow -Profile Any | Out-Null
                Write-OK "Firewall rule created: $ruleName (TCP $($pf.HostPort))"
            } else {
                Write-OK "Firewall rule exists: $ruleName"
            }
        }

        Write-Host "`n  Active port forwarding rules:" -ForegroundColor Gray
        netsh interface portproxy show v4tov4

        Write-Host ""
        Write-Warn "NOTE: WSL2 NAT IP may change after reboot."
        Write-Host "  Re-run this script after reboot to update portproxy rules." -ForegroundColor Gray
        Write-Host "  Or upgrade to Windows 11 22H2+ for mirrored networking." -ForegroundColor Gray
    } else {
        Write-Warn "Could not determine WSL2 IP -- port forwarding skipped"
        Write-Host "  WSL2 may not be running. Try: wsl -d Ubuntu -e hostname -I" -ForegroundColor Gray
    }
}

} # end Phase 5 skip guard


# ============================================================
# PHASE 6: Restore Database from Seed Dump
# ============================================================

if ($StartPhase -gt 6) {
    Write-Step "PHASE 6" "Skipped (--StartPhase $StartPhase)"
} else {

Write-Step "PHASE 6" "Restoring database from seed dump"

# The seed.sql is a pg_dump of the full database (schemas, tables, data, constraints).
# docker-compose.yml mounts ./docker/db_backup:/db_backup:ro on the db container.
# This phase checks whether the database already has tables; if not, it restores from seed.sql.

$savedEAP6 = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

# Check if the db container is running
$dbRunning = (wsl -d $WSLDistro -e bash -c "cd ~/Admin3 && docker compose ps --status running db 2>/dev/null" 2>&1 | Out-String).Trim()

if ($dbRunning -notmatch 'db') {
    Write-Warn "Database container is not running."
    Write-Host "  Start the stack first:  wsl -d Ubuntu -e bash -c 'cd ~/Admin3 && docker compose up -d'" -ForegroundColor Gray
    Write-Host "  Then re-run with: .\install-docker.ps1 -StartPhase 6" -ForegroundColor Gray
} else {
    Write-OK "Database container is running"

    # Check if the seed file is accessible inside the container
    $seedExists = (wsl -d $WSLDistro -e bash -c "cd ~/Admin3 && docker compose exec -T db test -f /db_backup/seed.sql && echo YES || echo NO" 2>&1 | Out-String).Trim()

    if ($seedExists -ne 'YES') {
        Write-Warn "Seed file not found at /db_backup/seed.sql inside the db container."
        Write-Host "  Ensure docker/db_backup/seed.sql exists in the repo and the container was started" -ForegroundColor Gray
        Write-Host "  with the updated docker-compose.yml (which mounts ./docker/db_backup:/db_backup:ro)." -ForegroundColor Gray
        Write-Host "  You may need to: docker compose down && docker compose up -d" -ForegroundColor Gray
    } else {
        # Check if tables already exist in the acted schema (proxy for "has been seeded")
        $pgUser = 'actedadmin'
        $pgDb   = 'ACTEDDBSTAGE01'
        $tableCount = (wsl -d $WSLDistro -e bash -c "cd ~/Admin3 && docker compose exec -T db psql -U $pgUser -d $pgDb -tAc `"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'acted'`"" 2>&1 | Out-String).Trim()

        if ($tableCount -match '^\d+$' -and [int]$tableCount -gt 5) {
            Write-OK "Database already has $tableCount tables in 'acted' schema -- seed not needed"
        } else {
            Write-Host "  Found $tableCount tables in 'acted' schema -- restoring from seed.sql..." -ForegroundColor Yellow

            # The seed.sql may contain \restrict / \unrestrict psql commands (pg_dump password protection).
            # These cause errors during automated restore. Strip them with grep -v before piping to psql.
            Write-Step "6a" "Restoring seed.sql into database (stripping pg_dump password protection)..."

            wsl -d $WSLDistro -e bash -c "cd ~/Admin3 && docker compose exec -T db bash -c 'grep -v ''^\\\\restrict'' /db_backup/seed.sql | grep -v ''^\\\\unrestrict'' | psql -U $pgUser -d $pgDb --set ON_ERROR_STOP=off'" 2>&1 | Out-Null

            # Verify restore worked
            $postCount = (wsl -d $WSLDistro -e bash -c "cd ~/Admin3 && docker compose exec -T db psql -U $pgUser -d $pgDb -tAc `"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'acted'`"" 2>&1 | Out-String).Trim()

            if ($postCount -match '^\d+$' -and [int]$postCount -gt 5) {
                Write-OK "Database restored successfully -- $postCount tables in 'acted' schema"
            } else {
                Write-Fail "Seed restore may have failed. Tables in 'acted' schema: $postCount"
                Write-Host "  Check logs: wsl -d Ubuntu -e bash -c 'cd ~/Admin3 && docker compose logs db'" -ForegroundColor Gray
                Write-Host "  Manual restore:" -ForegroundColor Gray
                Write-Host "    docker compose exec db bash -c `"grep -v '^\\\\restrict' /db_backup/seed.sql | grep -v '^\\\\unrestrict' | psql -U $pgUser -d $pgDb`"" -ForegroundColor Cyan
            }
        }
    }
}

$ErrorActionPreference = $savedEAP6

} # end Phase 6 skip guard


# ============================================================
# PHASE 7: Port Conflict Check
# ============================================================

if ($StartPhase -gt 7) {
    Write-Step "PHASE 7" "Skipped (--StartPhase $StartPhase)"
} else {

Write-Step "PHASE 7" "Checking port conflicts on host"
foreach ($pf in $DockerPorts) {
    $inUse = Get-NetTCPConnection -LocalPort $pf.HostPort -State Listen -ErrorAction SilentlyContinue
    if ($inUse) {
        $proc = Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue
        $procName = "unknown"
        if ($proc) { $procName = $proc.Name }
        Write-Warn "Port $($pf.HostPort) in use by: $procName (PID: $($inUse.OwningProcess))"
    } else {
        Write-OK "Port $($pf.HostPort) available ($($pf.Description))"
    }
}

} # end Phase 7 skip guard


# ============================================================
# PHASE 8: Cleanup Previous Hyper-V / Docker Desktop Artifacts
# ============================================================

Write-Step "PHASE 8" "Checking for previous Hyper-V/Docker Desktop artifacts"

$cleanupItems = @()

# Docker Desktop
$ddKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop"
$ddInstalled = Test-Path $ddKey
if ($ddInstalled) {
    $cleanupItems += @{
        Name   = "Docker Desktop"
        Detail = "Not needed -- Docker Engine runs directly in WSL2"
        Action = "Uninstall via Settings > Apps > Docker Desktop"
    }
}

# Docker Windows service (from previous Docker CE install)
$dockerSvc = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($dockerSvc) {
    $cleanupItems += @{
        Name   = "Docker Windows service"
        Detail = "Not needed -- Docker runs inside WSL2"
        Action = "Stop-Service Docker; sc.exe delete Docker"
    }
}

# Docker CE binaries on Windows
if (Test-Path "$env:ProgramFiles\docker\dockerd.exe") {
    $cleanupItems += @{
        Name   = "Docker CE binaries"
        Detail = "$env:ProgramFiles\docker"
        Action = "Remove-Item '$env:ProgramFiles\docker' -Recurse -Force"
    }
}

# Old Hyper-V VM from previous approach
$hypervModule = Get-Module -ListAvailable Hyper-V -ErrorAction SilentlyContinue
if ($hypervModule) {
    $oldVM = Get-VM -Name "Admin3-Docker" -ErrorAction SilentlyContinue
    if ($oldVM) {
        $cleanupItems += @{
            Name   = "Hyper-V VM (Admin3-Docker)"
            Detail = "From previous Hyper-V approach -- not needed for WSL2"
            Action = "Stop-VM 'Admin3-Docker' -Force; Remove-VM 'Admin3-Docker' -Force"
        }
    }

    $oldSwitch = Get-VMSwitch -Name "DockerNAT" -ErrorAction SilentlyContinue
    if ($oldSwitch) {
        $cleanupItems += @{
            Name   = "Hyper-V Virtual Switch (DockerNAT)"
            Detail = "From previous Hyper-V approach"
            Action = "Remove-VMSwitch 'DockerNAT' -Force"
        }
    }
}

# Old NAT rule
$oldNat = Get-NetNat -Name "DockerNAT" -ErrorAction SilentlyContinue
if ($oldNat) {
    $cleanupItems += @{
        Name   = "NAT Rule (DockerNAT)"
        Detail = "From previous Hyper-V approach"
        Action = "Remove-NetNat 'DockerNAT' -Confirm:`$false"
    }
}

# Old port forwarding rules that point to the VM IP (192.168.100.10)
$oldPortProxy = netsh interface portproxy show v4tov4 2>&1
if ($oldPortProxy -match '192\.168\.100\.10') {
    $cleanupItems += @{
        Name   = "Old portproxy rules (192.168.100.10)"
        Detail = "Port forwarding to old Hyper-V VM IP"
        Action = "netsh interface portproxy reset"
    }
}

if ($cleanupItems.Count -gt 0) {
    Write-Warn "Found $($cleanupItems.Count) artifact(s) from previous setup:"
    Write-Host ""
    foreach ($item in $cleanupItems) {
        Write-Host "    $($item.Name)" -ForegroundColor Yellow
        Write-Host "      $($item.Detail)" -ForegroundColor Gray
        Write-Host "      Cleanup: $($item.Action)" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "  These are NOT needed for the WSL2 approach." -ForegroundColor Gray
    Write-Host "  Manual cleanup recommended -- see commands above." -ForegroundColor Gray
} else {
    Write-OK "No old artifacts found"
}


# ============================================================
# SUMMARY: Post-Setup Instructions
# ============================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host " Deploy Admin3 Staging Stack" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open WSL2 Ubuntu:" -ForegroundColor White
Write-Host "   wsl -d Ubuntu" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Clone the repo:" -ForegroundColor White
Write-Host "   git clone -b staging https://github.com/eugenelo428937/Admin3.git ~/Admin3" -ForegroundColor Cyan
Write-Host "   cd ~/Admin3" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Required files (all included in the git clone):" -ForegroundColor White
Write-Host ""
Write-Host "   ~/Admin3/" -ForegroundColor Gray
Write-Host "   |-- docker-compose.yml          # Compose stack (db, redis, backend, worker, nginx)" -ForegroundColor Gray
Write-Host "   |-- .env                         # Created from .env.example (see step 3)" -ForegroundColor Gray
Write-Host "   |-- .dockerignore                # Build context exclusions" -ForegroundColor Gray
Write-Host "   |" -ForegroundColor Gray
Write-Host "   |-- docker/" -ForegroundColor Gray
Write-Host "   |   |-- init.sql                 # PostgreSQL schema init (acted, adm)" -ForegroundColor Gray
Write-Host "   |" -ForegroundColor Gray
Write-Host "   |-- backend/" -ForegroundColor Gray
Write-Host "   |   |-- django_Admin3/" -ForegroundColor Gray
Write-Host "   |       |-- Dockerfile           # Django multi-stage build" -ForegroundColor Gray
Write-Host "   |       |-- requirements.txt     # Python dependencies" -ForegroundColor Gray
Write-Host "   |       |-- manage.py            # Django management" -ForegroundColor Gray
Write-Host "   |       |-- django_Admin3/       # Django settings package" -ForegroundColor Gray
Write-Host "   |       |-- apps/                # All Django apps" -ForegroundColor Gray
Write-Host "   |       |-- railway-start.sh     # Container entrypoint" -ForegroundColor Gray
Write-Host "   |" -ForegroundColor Gray
Write-Host "   |-- frontend/" -ForegroundColor Gray
Write-Host "   |   |-- react-Admin3/" -ForegroundColor Gray
Write-Host "   |       |-- package.json         # Node dependencies" -ForegroundColor Gray
Write-Host "   |       |-- package-lock.json    # Lock file" -ForegroundColor Gray
Write-Host "   |       |-- public/              # Static assets" -ForegroundColor Gray
Write-Host "   |       |-- src/                 # React source" -ForegroundColor Gray
Write-Host "   |       |-- .env.staging         # Frontend staging env vars" -ForegroundColor Gray
Write-Host "   |" -ForegroundColor Gray
Write-Host "   |-- nginx/" -ForegroundColor Gray
Write-Host "       |-- Dockerfile               # Nginx multi-stage build (builds React)" -ForegroundColor Gray
Write-Host "       |-- nginx.conf               # Reverse proxy + SSL config" -ForegroundColor Gray
Write-Host "       |-- generate-cert.sh         # Self-signed SSL cert generator" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create the .env file:" -ForegroundColor White
Write-Host "   cp .env.example .env" -ForegroundColor Cyan
Write-Host "   wsl -d Ubuntu -e bash -c ""sudo cp '/mnt/c/Temp/Docker Setup/wsl.conf' /etc/wsl.conf""" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Required edits in .env:" -ForegroundColor White
Write-Host "     POSTGRES_PASSWORD=<strong-password>" -ForegroundColor Gray
Write-Host "     REDIS_PASSWORD=<strong-password>" -ForegroundColor Gray
Write-Host "     DJANGO_SECRET_KEY=<random-50-char-string>" -ForegroundColor Gray
Write-Host "     SERVER_NAME=localhost" -ForegroundColor Gray
Write-Host "     ALLOWED_HOSTS=localhost,127.0.0.1" -ForegroundColor Gray
Write-Host "     CORS_ALLOWED_ORIGINS=https://localhost:8443" -ForegroundColor Gray
Write-Host "     CSRF_TRUSTED_ORIGINS=https://localhost:8443" -ForegroundColor Gray
Write-Host "     FRONTEND_URL=https://localhost:8443" -ForegroundColor Gray
Write-Host "     HTTP_PORT=8080" -ForegroundColor Gray
Write-Host "     HTTPS_PORT=8443" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the stack:" -ForegroundColor White
Write-Host "   sudo docker compose up -d" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Verify:" -ForegroundColor White
Write-Host "   docker compose ps                        # All services healthy" -ForegroundColor Cyan
Write-Host "   docker compose logs -f backend           # Check Django logs" -ForegroundColor Cyan
Write-Host "   curl -k https://localhost:8443            # Test from WSL2" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Access from browser (on the same machine):" -ForegroundColor White
Write-Host "   https://localhost:8443" -ForegroundColor Cyan
Write-Host ""

Write-Host "----------------------------------------" -ForegroundColor White
Write-Host " QUICK REFERENCE" -ForegroundColor White
Write-Host "----------------------------------------" -ForegroundColor White
Write-Host ""
Write-Host "  WSL2 Management (from PowerShell):" -ForegroundColor White
Write-Host "    wsl -d Ubuntu                           # Open Ubuntu shell" -ForegroundColor Gray
Write-Host "    wsl --shutdown                          # Stop all WSL instances" -ForegroundColor Gray
Write-Host "    wsl -l -v                               # List distros + status" -ForegroundColor Gray
Write-Host "    wsl --status                            # WSL configuration info" -ForegroundColor Gray
Write-Host ""
Write-Host "  Docker commands (inside WSL2 Ubuntu):" -ForegroundColor White
Write-Host "    docker compose up -d                    # Start stack" -ForegroundColor Gray
Write-Host "    docker compose down                     # Stop stack" -ForegroundColor Gray
Write-Host "    docker compose ps                       # Service status" -ForegroundColor Gray
Write-Host "    docker compose logs -f SERVICE          # Stream logs" -ForegroundColor Gray
Write-Host "    docker compose pull && docker compose up -d  # Update images" -ForegroundColor Gray
Write-Host ""
Write-Host "  Ports:" -ForegroundColor White
Write-Host "    localhost:8080  -- HTTP  (nginx)" -ForegroundColor Gray
Write-Host "    localhost:8443  -- HTTPS (nginx)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Files:" -ForegroundColor White
Write-Host "    WSL config:    $WSLUserProfile\.wslconfig" -ForegroundColor Gray
Write-Host "    WSL distro:    \\wsl$\Ubuntu\home\" -ForegroundColor Gray
Write-Host "    Admin3 repo:   \\wsl$\Ubuntu\home\USER\Admin3\" -ForegroundColor Gray
Write-Host ""
