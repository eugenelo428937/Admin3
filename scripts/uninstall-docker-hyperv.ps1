#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Undo the Hyper-V Docker VM setup on Windows Server 2019.
    Removes all infrastructure created by the previous install-docker.ps1.

.DESCRIPTION
    This script reverses the Hyper-V VM approach that was set up on the
    Windows Server 2019 machine (7.0.240.83). It removes:

      Phase 1: Hyper-V VM (Admin3-Docker) -- stop and delete
      Phase 2: Virtual Hard Disk (VHDX) -- delete disk file
      Phase 3: Port forwarding rules (netsh portproxy)
      Phase 4: Firewall rules (Admin3-*)
      Phase 5: NAT rule (DockerNAT)
      Phase 6: Host gateway IP on NAT adapter
      Phase 7: Virtual switch (DockerNAT)
      Phase 8: Docker Windows service and binaries (from WSL2 attempt)
      Phase 9: (Optional) Disable Hyper-V feature

    Each phase checks if the resource exists before attempting removal.
    Safe to run multiple times.

.NOTES
    - Must be run as Administrator
    - Target: Windows Server 2019 (7.0.240.83)
    - Phase 9 (Hyper-V removal) requires a reboot and is optional
    - Does NOT remove the Ubuntu ISO from D:\Docker Setup (manual cleanup)
#>

$ErrorActionPreference = 'Stop'

# ============================================================
# CONFIGURATION -- must match the original install-docker.ps1
# ============================================================

$VMName        = "Admin3-Docker"
$VMPath        = "D:\Hyper-V"
$VHDXPath      = "$VMPath\Virtual Hard Disks\$VMName.vhdx"
$SwitchName    = "DockerNAT"
$NATName       = "DockerNAT"
$HostGatewayIP = "192.168.100.1"

$PortForwards = @(
    @{ HostPort = 8080;  VMPort = 8080;  Description = "HTTP (nginx)" },
    @{ HostPort = 8443;  VMPort = 8443;  Description = "HTTPS (nginx)" },
    @{ HostPort = 2222;  VMPort = 22;    Description = "SSH" }
)

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

Write-Host "`n========================================" -ForegroundColor Red
Write-Host " Admin3 -- Undo Hyper-V Docker Setup" -ForegroundColor Red
Write-Host " Windows Server 2019 Cleanup" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red

Write-Host "This script will remove all Hyper-V Docker infrastructure" -ForegroundColor Yellow
Write-Host "that was created by the previous install-docker.ps1." -ForegroundColor Yellow
Write-Host ""

# ============================================================
# PRE-FLIGHT: Show current state
# ============================================================

Write-Host "Current state:" -ForegroundColor White

$existingVM = Get-VM -Name $VMName -ErrorAction SilentlyContinue
if ($existingVM) {
    Write-Host "  VM ($VMName):     $($existingVM.State)" -ForegroundColor Yellow
} else {
    Write-Host "  VM ($VMName):     Not found" -ForegroundColor Gray
}

$existingSwitch = Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue
if ($existingSwitch) {
    Write-Host "  Virtual Switch:     $SwitchName exists" -ForegroundColor Yellow
} else {
    Write-Host "  Virtual Switch:     Not found" -ForegroundColor Gray
}

$existingNAT = Get-NetNat -Name $NATName -ErrorAction SilentlyContinue
if ($existingNAT) {
    Write-Host "  NAT Rule:           $NATName exists" -ForegroundColor Yellow
} else {
    Write-Host "  NAT Rule:           Not found" -ForegroundColor Gray
}

$vhdxExists = Test-Path $VHDXPath
if ($vhdxExists) {
    $vhdxSizeMB = [math]::Round((Get-Item $VHDXPath).Length / 1MB)
    Write-Host "  VHDX Disk:          $VHDXPath ($vhdxSizeMB MB)" -ForegroundColor Yellow
} else {
    Write-Host "  VHDX Disk:          Not found" -ForegroundColor Gray
}

Write-Host ""
$confirm = Read-Host "Proceed with cleanup? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}


# ============================================================
# PHASE 1: Stop and Remove VM
# ============================================================

Write-Step "PHASE 1" "Removing Hyper-V VM ($VMName)"

$vm = Get-VM -Name $VMName -ErrorAction SilentlyContinue
if ($vm) {
    if ($vm.State -eq 'Running') {
        Write-Host "  Stopping VM..." -ForegroundColor Gray
        Stop-VM -Name $VMName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-OK "VM stopped"
    } elseif ($vm.State -ne 'Off') {
        Write-Host "  VM is in state: $($vm.State) -- forcing off..." -ForegroundColor Gray
        Stop-VM -Name $VMName -TurnOff -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Remove DVD drive if attached
    $dvd = Get-VMDvdDrive -VMName $VMName -ErrorAction SilentlyContinue
    if ($dvd) {
        Remove-VMDvdDrive -VMName $VMName -ControllerNumber $dvd.ControllerNumber -ControllerLocation $dvd.ControllerLocation -ErrorAction SilentlyContinue
        Write-OK "DVD drive detached"
    }

    # Remove the VM
    Remove-VM -Name $VMName -Force
    Write-OK "VM '$VMName' removed"
} else {
    Write-OK "VM '$VMName' does not exist -- nothing to remove"
}


# ============================================================
# PHASE 2: Delete VHDX Disk File
# ============================================================

Write-Step "PHASE 2" "Removing virtual hard disk"

if (Test-Path $VHDXPath) {
    Remove-Item $VHDXPath -Force
    Write-OK "Deleted: $VHDXPath"
} else {
    Write-OK "VHDX not found -- nothing to delete"
}

# Clean up empty directories
$vhdxDir = Split-Path $VHDXPath -Parent
if ((Test-Path $vhdxDir) -and (Get-ChildItem $vhdxDir -ErrorAction SilentlyContinue).Count -eq 0) {
    Remove-Item $vhdxDir -Force -ErrorAction SilentlyContinue
    Write-OK "Removed empty directory: $vhdxDir"
}

# Remove VM configuration directory
$vmConfigDir = Join-Path $VMPath $VMName
if (Test-Path $vmConfigDir) {
    Remove-Item $vmConfigDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-OK "Removed VM config directory: $vmConfigDir"
}

if ((Test-Path $VMPath) -and (Get-ChildItem $VMPath -ErrorAction SilentlyContinue).Count -eq 0) {
    Remove-Item $VMPath -Force -ErrorAction SilentlyContinue
    Write-OK "Removed empty directory: $VMPath"
}


# ============================================================
# PHASE 3: Remove Port Forwarding Rules (netsh portproxy)
# ============================================================

Write-Step "PHASE 3" "Removing port forwarding rules"

foreach ($pf in $PortForwards) {
    $existing = netsh interface portproxy show v4tov4 | Select-String "0\.0\.0\.0\s+$($pf.HostPort)\s"
    if ($existing) {
        netsh interface portproxy delete v4tov4 listenport=$($pf.HostPort) listenaddress=0.0.0.0 | Out-Null
        Write-OK "Removed portproxy: *:$($pf.HostPort) ($($pf.Description))"
    } else {
        Write-OK "No portproxy rule for port $($pf.HostPort)"
    }
}

# Show remaining rules (if any)
$remaining = netsh interface portproxy show v4tov4 2>&1
$hasRemaining = ($remaining | Out-String) -match '\d+\.\d+\.\d+\.\d+'
if ($hasRemaining) {
    Write-Warn "Other portproxy rules still exist:"
    foreach ($line in $remaining) {
        if ($line -match '\d+\.\d+\.\d+\.\d+') {
            Write-Host "        $line" -ForegroundColor Gray
        }
    }
}


# ============================================================
# PHASE 4: Remove Firewall Rules
# ============================================================

Write-Step "PHASE 4" "Removing firewall rules"

foreach ($pf in $PortForwards) {
    $ruleName = "Admin3-$($pf.Description -replace '\s','-')-$($pf.HostPort)"
    $fwRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($fwRule) {
        Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        Write-OK "Removed firewall rule: $ruleName"
    } else {
        Write-OK "Firewall rule '$ruleName' not found"
    }
}


# ============================================================
# PHASE 5: Remove NAT Rule
# ============================================================

Write-Step "PHASE 5" "Removing NAT rule"

$nat = Get-NetNat -Name $NATName -ErrorAction SilentlyContinue
if ($nat) {
    Remove-NetNat -Name $NATName -Confirm:$false
    Write-OK "NAT rule '$NATName' removed"
} else {
    Write-OK "NAT rule '$NATName' not found"
}


# ============================================================
# PHASE 6: Remove Host Gateway IP
# ============================================================

Write-Step "PHASE 6" "Removing host gateway IP"

$natAdapter = Get-NetAdapter -Name "vEthernet ($SwitchName)" -ErrorAction SilentlyContinue
if ($natAdapter) {
    $existingIP = Get-NetIPAddress -InterfaceIndex $natAdapter.ifIndex -IPAddress $HostGatewayIP -ErrorAction SilentlyContinue
    if ($existingIP) {
        Remove-NetIPAddress -InterfaceIndex $natAdapter.ifIndex -IPAddress $HostGatewayIP -Confirm:$false -ErrorAction SilentlyContinue
        Write-OK "Removed gateway IP $HostGatewayIP from vEthernet ($SwitchName)"
    } else {
        Write-OK "Gateway IP $HostGatewayIP not assigned"
    }
} else {
    Write-OK "NAT adapter 'vEthernet ($SwitchName)' not found"
}


# ============================================================
# PHASE 7: Remove Virtual Switch
# ============================================================

Write-Step "PHASE 7" "Removing virtual switch"

$switch = Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue
if ($switch) {
    Remove-VMSwitch -Name $SwitchName -Force
    Write-OK "Virtual switch '$SwitchName' removed"
} else {
    Write-OK "Virtual switch '$SwitchName' not found"
}


# ============================================================
# PHASE 8: Remove Docker Windows Service and Binaries
# ============================================================

Write-Step "PHASE 8" "Removing Docker Windows service and binaries"

# Docker Windows service (from previous WSL2/Docker CE attempt)
$dockerSvc = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($dockerSvc) {
    if ($dockerSvc.Status -eq 'Running') {
        Write-Host "  Stopping Docker service..." -ForegroundColor Gray
        Stop-Service Docker -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    sc.exe delete Docker 2>&1 | Out-Null
    Write-OK "Docker Windows service removed"
} else {
    Write-OK "Docker Windows service not found"
}

# Docker CE binaries
if (Test-Path "$env:ProgramFiles\docker\dockerd.exe") {
    Remove-Item "$env:ProgramFiles\docker" -Recurse -Force -ErrorAction SilentlyContinue
    # Clean up PATH
    $machinePath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)
    $cleanPath = ($machinePath -split ';' | Where-Object { $_ -notmatch 'docker' -and $_.Trim() -ne '' }) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $cleanPath, [EnvironmentVariableTarget]::Machine)
    Write-OK "Docker CE binaries removed from $env:ProgramFiles\docker"
} else {
    Write-OK "Docker CE binaries not found"
}

# Docker Compose CLI plugin
if (Test-Path "$env:ProgramFiles\Docker\cli-plugins") {
    Remove-Item "$env:ProgramFiles\Docker\cli-plugins" -Recurse -Force -ErrorAction SilentlyContinue
    Write-OK "Docker Compose plugin removed"
} else {
    Write-OK "Docker Compose plugin not found"
}

# WSL Ubuntu distro (from earlier WSL2 attempt)
if (Test-Path "D:\Docker Setup\Ubuntu") {
    Remove-Item "D:\Docker Setup\Ubuntu" -Recurse -Force -ErrorAction SilentlyContinue
    Write-OK "WSL Ubuntu distro files removed from D:\Docker Setup\Ubuntu"
} else {
    Write-OK "WSL Ubuntu distro files not found"
}


# ============================================================
# PHASE 9: (Optional) Disable Hyper-V
# ============================================================

Write-Step "PHASE 9" "(Optional) Disable Hyper-V feature"

$isServer = (Get-CimInstance Win32_OperatingSystem).ProductType -ne 1

if ($isServer) {
    $hypervFeature = Get-WindowsFeature -Name Hyper-V -ErrorAction SilentlyContinue
    $hypervEnabled = $hypervFeature -and $hypervFeature.InstallState -eq 'Installed'
} else {
    $hypervFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
    $hypervEnabled = $hypervFeature -and $hypervFeature.State -eq 'Enabled'
}

if ($hypervEnabled) {
    Write-Warn "Hyper-V is still enabled."
    Write-Host "  Disabling Hyper-V will require a reboot." -ForegroundColor Gray
    Write-Host "  Skip this if you plan to use Hyper-V for other purposes." -ForegroundColor Gray
    Write-Host ""
    $confirmHyperV = Read-Host "  Disable Hyper-V? (y/n)"
    if ($confirmHyperV -eq 'y') {
        if ($isServer) {
            Uninstall-WindowsFeature -Name Hyper-V -IncludeManagementTools
        } else {
            Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart
        }
        Write-OK "Hyper-V disabled"
        Write-Warn "REBOOT REQUIRED for Hyper-V removal to take effect."
        Write-Host ""
        $confirmReboot = Read-Host "  Reboot now? (y/n)"
        if ($confirmReboot -eq 'y') {
            Restart-Computer -Force
        }
    } else {
        Write-Host "  Skipped -- Hyper-V remains enabled." -ForegroundColor Gray
    }
} else {
    Write-OK "Hyper-V is not enabled"
}


# ============================================================
# SUMMARY
# ============================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Removed:" -ForegroundColor White
Write-Host "  - Hyper-V VM (Admin3-Docker)" -ForegroundColor Gray
Write-Host "  - Virtual Hard Disk (VHDX)" -ForegroundColor Gray
Write-Host "  - Port forwarding rules (8080, 8443, 2222)" -ForegroundColor Gray
Write-Host "  - Firewall rules (Admin3-*)" -ForegroundColor Gray
Write-Host "  - NAT rule (DockerNAT)" -ForegroundColor Gray
Write-Host "  - Host gateway IP (192.168.100.1)" -ForegroundColor Gray
Write-Host "  - Virtual switch (DockerNAT)" -ForegroundColor Gray
Write-Host "  - Docker Windows service and binaries" -ForegroundColor Gray
Write-Host ""
Write-Host "NOT removed (manual cleanup if needed):" -ForegroundColor Yellow
Write-Host "  - Ubuntu ISO at D:\Docker Setup\$UbuntuISOFile" -ForegroundColor Gray
Write-Host "  - WSL2 kernel update (uninstall via Programs & Features)" -ForegroundColor Gray
Write-Host "  - Hyper-V feature (Phase 9 -- optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify cleanup, run:" -ForegroundColor White
Write-Host "  .\docker-preinstall-diagnostic.ps1" -ForegroundColor Cyan
Write-Host ""
