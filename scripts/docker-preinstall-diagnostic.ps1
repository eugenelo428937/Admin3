#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Infrastructure diagnostic for Admin3 staging deployment on Windows 11 with WSL2.
    Checks: system requirements, WSL2 infrastructure, Docker Engine, network
    egress/ingress, old artifacts, and GitHub Actions runner.

.DESCRIPTION
    Admin3 staging runs Docker Engine inside WSL2 Ubuntu on Windows 11.
    This script validates the full chain: Windows host -> WSL2 -> Docker.

    Sections:
      1. System Requirements (Windows 11 build, RAM, disk)
      2. WSL2 Infrastructure (features, distro, version, systemd)
      3. Docker Engine (installed, running, compose, containers)
      4. Network Egress (Docker Hub, npm, PyPI, GitHub, SMTP)
      5. Network Ingress (ports, firewall, port forwarding)
      6. Old Artifacts (Hyper-V VM, Docker Desktop, Docker CE)
      7. GitHub Actions Runner

.OUTPUTS
    Console report + results saved to docker-diagnostic-results-TIMESTAMP.txt
#>

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ============================================================
# Configuration -- must match install-docker.ps1 values
# ============================================================

$WSLDistro = "Ubuntu"

$DockerPorts = @(
    @{ HostPort = 8080;  Description = "HTTP (nginx)" },
    @{ HostPort = 8443;  Description = "HTTPS (nginx)" }
)

# ============================================================
# Helper
# ============================================================

function Log($section, $test, $status, $detail) {
    $entry = [PSCustomObject]@{
        Section = $section
        Test    = $test
        Status  = $status
        Detail  = $detail
    }
    $script:results += $entry
    $color = switch ($status) {
        'PASS' { 'Green' }
        'WARN' { 'Yellow' }
        'FAIL' { 'Red' }
        default { 'Gray' }
    }
    Write-Host "[$status] $section > $test" -ForegroundColor $color
    if ($detail) { Write-Host "        $detail" -ForegroundColor Gray }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Admin3 Staging -- WSL2 Docker Diagnostic" -ForegroundColor Cyan
Write-Host " $timestamp" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan


# ============================================================
# Section 1: System Requirements
# ============================================================

Write-Host "--- Section 1: System Requirements ---" -ForegroundColor White

$os = Get-CimInstance Win32_OperatingSystem
Log "System" "Windows Version" "INFO" "$($os.Caption) Build $($os.BuildNumber)"

# Windows 11 check
$osBuild = [int]$os.BuildNumber
if ($osBuild -ge 22000) {
    Log "System" "Windows 11" "PASS" "Build $osBuild (22000+ required for WSL2 + systemd)"
} else {
    Log "System" "Windows 11" "FAIL" "Build $osBuild -- Windows 11 (22000+) required"
}

# Mirrored networking support (22H2 = build 22621+)
if ($osBuild -ge 22621) {
    Log "System" "Mirrored Networking Support" "PASS" "Build $osBuild supports WSL2 mirrored networking"
} else {
    Log "System" "Mirrored Networking Support" "WARN" "Build $osBuild -- upgrade to 22H2+ (22621) for mirrored networking"
}

# RAM
$ram = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$ramLabel = "${ram} GB"
if ($ram -ge 16) { Log "System" "RAM ($ramLabel)" "PASS" "16GB+ recommended for host + Docker" }
elseif ($ram -ge 8) { Log "System" "RAM ($ramLabel)" "WARN" "8GB minimum; 16GB+ recommended for Docker builds" }
else { Log "System" "RAM ($ramLabel)" "FAIL" "Need 8GB+ (16GB recommended), have $ramLabel" }

# Disk space on C: drive (WSL2 distros live here by default)
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
$diskLabel = "${freeGB} GB"
if ($freeGB -ge 40) { Log "System" "Disk Free C: ($diskLabel)" "PASS" "40GB+ recommended for Docker images" }
elseif ($freeGB -ge 20) { Log "System" "Disk Free C: ($diskLabel)" "WARN" "20GB minimum; 40GB recommended" }
else { Log "System" "Disk Free C: ($diskLabel)" "FAIL" "Need 20GB+, have $diskLabel" }

# WSL feature
$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
$wslEnabled = $wslFeature -and $wslFeature.State -eq 'Enabled'
if ($wslEnabled) { Log "System" "WSL Feature" "PASS" "Enabled" }
else { Log "System" "WSL Feature" "FAIL" "Not enabled -- run install-docker.ps1 Phase 1" }

# Virtual Machine Platform feature
$vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
$vmEnabled = $vmFeature -and $vmFeature.State -eq 'Enabled'
if ($vmEnabled) { Log "System" "Virtual Machine Platform" "PASS" "Enabled" }
else { Log "System" "Virtual Machine Platform" "FAIL" "Not enabled -- run install-docker.ps1 Phase 1" }


# ============================================================
# Section 2: WSL2 Infrastructure
# ============================================================

Write-Host "`n--- Section 2: WSL2 Infrastructure ---" -ForegroundColor White

$wslExe = Get-Command wsl.exe -ErrorAction SilentlyContinue
if ($wslExe) {
    Log "WSL2" "wsl.exe" "PASS" "Found at $($wslExe.Source)"
} else {
    Log "WSL2" "wsl.exe" "FAIL" "Not found -- Windows features may not be enabled"
}

# WSL version
if ($wslExe) {
    $wslVer = (wsl --version 2>&1 | Out-String) -replace "`0", ""
    $wslVerLine = $wslVer -split "`n" | Where-Object { $_ -match 'WSL version' } | Select-Object -First 1
    if ($wslVerLine) {
        Log "WSL2" "WSL Version" "INFO" $wslVerLine.Trim()
    } else {
        Log "WSL2" "WSL Version" "INFO" "Could not determine version"
    }
}

# Default WSL version
if ($wslExe) {
    $defaultVer = (wsl --status 2>&1 | Out-String) -replace "`0", ""
    $defaultLine = $defaultVer -split "`n" | Where-Object { $_ -match 'Default Version' } | Select-Object -First 1
    if ($defaultLine -and $defaultLine -match '2') {
        Log "WSL2" "Default WSL Version" "PASS" "WSL 2"
    } elseif ($defaultLine) {
        Log "WSL2" "Default WSL Version" "WARN" "$($defaultLine.Trim()) -- should be 2"
    }
}

# Ubuntu distro
$distroInstalled = $false
$distroReady = $false
if ($wslExe) {
    # wsl -l -q outputs UTF-16; clean null bytes for reliable matching
    $distroList = (wsl -l -q 2>&1 | Out-String) -replace "`0", ""
    if ($LASTEXITCODE -eq 0 -and $distroList -match $WSLDistro) {
        $distroInstalled = $true
        Log "WSL2" "Ubuntu Distro" "PASS" "Installed"

        # Check if WSL version is 2 (clean UTF-16 null bytes)
        $verOutput = (wsl -l -v 2>&1 | Out-String) -replace "`0", ""
        $ubuntuLine = $verOutput -split "`n" | Where-Object { $_ -match $WSLDistro }
        if ($ubuntuLine -and $ubuntuLine -match '\s2\s*$') {
            Log "WSL2" "Ubuntu WSL Version" "PASS" "Running WSL 2"
        } elseif ($ubuntuLine -and $ubuntuLine -match '\s1\s*$') {
            Log "WSL2" "Ubuntu WSL Version" "FAIL" "Running WSL 1 -- convert with: wsl --set-version Ubuntu 2"
        }

        # Check running state
        if ($ubuntuLine -match 'Running') {
            Log "WSL2" "Ubuntu State" "PASS" "Running"
        } elseif ($ubuntuLine -match 'Stopped') {
            Log "WSL2" "Ubuntu State" "INFO" "Stopped (will start on first use)"
        }

        # Check first-time setup
        $whoami = wsl -d $WSLDistro -e whoami 2>&1
        if ($LASTEXITCODE -eq 0 -and $whoami.Trim() -ne '') {
            $distroReady = $true
            Log "WSL2" "Ubuntu User" "PASS" "Default user: $($whoami.Trim())"
        } else {
            Log "WSL2" "Ubuntu User" "FAIL" "First-time setup not completed -- run: wsl -d Ubuntu"
        }
    } else {
        Log "WSL2" "Ubuntu Distro" "FAIL" "Not installed -- run install-docker.ps1 Phase 2"
    }
}

# Systemd check
if ($distroReady) {
    $systemdPID = wsl -d $WSLDistro -e bash -c "ps -p 1 -o comm= 2>/dev/null" 2>&1
    if ($systemdPID.Trim() -eq 'systemd') {
        Log "WSL2" "systemd" "PASS" "PID 1 is systemd"
    } else {
        Log "WSL2" "systemd" "FAIL" "PID 1 is '$($systemdPID.Trim())' (not systemd) -- enable in /etc/wsl.conf"
    }

    # WSL config
    $wslConf = wsl -d $WSLDistro -e bash -c "cat /etc/wsl.conf 2>/dev/null" 2>&1
    $confStr = $wslConf | Out-String
    if ($confStr -match 'systemd\s*=\s*true') {
        Log "WSL2" "/etc/wsl.conf" "PASS" "systemd=true configured"
    } else {
        Log "WSL2" "/etc/wsl.conf" "WARN" "systemd not explicitly enabled in wsl.conf"
    }
}

# .wslconfig on host
$wslConfigPath = Join-Path $env:USERPROFILE ".wslconfig"
if (Test-Path $wslConfigPath) {
    $wslConfig = Get-Content $wslConfigPath -Raw
    Log "WSL2" ".wslconfig" "PASS" "Found at $wslConfigPath"

    if ($wslConfig -match 'memory\s*=\s*(\S+)') {
        Log "WSL2" "Memory Limit" "INFO" "WSL2 memory: $($Matches[1])"
    }
    if ($wslConfig -match 'networkingMode\s*=\s*(\S+)') {
        $netMode = $Matches[1]
        if ($netMode -eq 'mirrored') {
            Log "WSL2" "Networking Mode" "PASS" "Mirrored (WSL2 shares host IP -- no portproxy needed)"
        } else {
            Log "WSL2" "Networking Mode" "INFO" "Mode: $netMode"
        }
    } else {
        Log "WSL2" "Networking Mode" "INFO" "Default (NAT) -- consider mirrored for simpler networking"
    }
} else {
    Log "WSL2" ".wslconfig" "INFO" "Not found at $wslConfigPath -- using defaults"
}

# WSL2 IP address
if ($distroReady) {
    $wslIP = (wsl -d $WSLDistro -e bash -c "hostname -I" 2>&1).Trim()
    if ($wslIP -match '(\d+\.\d+\.\d+\.\d+)') {
        Log "WSL2" "WSL2 IP" "INFO" $Matches[1]
    }
}


# ============================================================
# Section 3: Docker Engine in WSL2
# ============================================================

Write-Host "`n--- Section 3: Docker Engine ---" -ForegroundColor White

if ($distroReady) {
    # Docker installed?
    $dockerVer = wsl -d $WSLDistro -e bash -c "docker --version 2>/dev/null" 2>&1
    if ($LASTEXITCODE -eq 0 -and $dockerVer -match 'Docker version') {
        Log "Docker" "Docker Engine" "PASS" $dockerVer.Trim()
    } else {
        Log "Docker" "Docker Engine" "FAIL" "Not installed -- run install-docker.ps1 Phase 4"
    }

    # Docker service running?
    $dockerActive = wsl -d $WSLDistro -e bash -c "systemctl is-active docker 2>/dev/null" 2>&1
    if ($dockerActive.Trim() -eq 'active') {
        Log "Docker" "Docker Service" "PASS" "systemd service is active"
    } else {
        Log "Docker" "Docker Service" "FAIL" "Service not active (status: $($dockerActive.Trim())) -- start: sudo systemctl start docker"
    }

    # Docker service enabled on boot?
    $dockerEnabled = wsl -d $WSLDistro -e bash -c "systemctl is-enabled docker 2>/dev/null" 2>&1
    if ($dockerEnabled.Trim() -eq 'enabled') {
        Log "Docker" "Docker Autostart" "PASS" "Enabled (starts on WSL2 boot)"
    } else {
        Log "Docker" "Docker Autostart" "WARN" "Not enabled -- run: sudo systemctl enable docker"
    }

    # Docker Compose
    $composeVer = wsl -d $WSLDistro -e bash -c "docker compose version 2>/dev/null" 2>&1
    if ($LASTEXITCODE -eq 0 -and $composeVer -match 'Docker Compose') {
        Log "Docker" "Docker Compose" "PASS" $composeVer.Trim()
    } else {
        Log "Docker" "Docker Compose" "WARN" "Not found -- install: sudo apt install docker-compose-plugin"
    }

    # Docker group membership (can current user run without sudo?)
    $groups = wsl -d $WSLDistro -e bash -c "groups 2>/dev/null" 2>&1
    if ($groups -match 'docker') {
        Log "Docker" "Docker Group" "PASS" "User is in docker group (no sudo needed)"
    } else {
        Log "Docker" "Docker Group" "WARN" "User not in docker group -- run: sudo usermod -aG docker `$USER"
    }

    # Running containers
    $containers = wsl -d $WSLDistro -e bash -c "docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $containerLines = ($containers -split "`n" | Where-Object { $_.Trim() -ne '' })
        $containerCount = [math]::Max(0, $containerLines.Count - 1)  # subtract header
        if ($containerCount -gt 0) {
            Log "Docker" "Running Containers" "PASS" "$containerCount container(s) running"
            foreach ($line in $containerLines) {
                Write-Host "        $line" -ForegroundColor Gray
            }
        } else {
            Log "Docker" "Running Containers" "INFO" "No containers running -- start with: docker compose up -d"
        }
    } else {
        Log "Docker" "Running Containers" "INFO" "Could not query (Docker may not be running)"
    }

    # Docker disk usage
    $diskUsage = wsl -d $WSLDistro -e bash -c "docker system df --format 'Images: {{.Size}} ({{.Reclaimable}} reclaimable)' 2>/dev/null | head -1" 2>&1
    if ($LASTEXITCODE -eq 0 -and $diskUsage.Trim() -ne '') {
        Log "Docker" "Disk Usage" "INFO" $diskUsage.Trim()
    }
} else {
    if (-not $distroInstalled) {
        Log "Docker" "Status" "FAIL" "Ubuntu not installed -- run install-docker.ps1"
    } else {
        Log "Docker" "Status" "FAIL" "Ubuntu not ready -- complete first-time setup: wsl -d Ubuntu"
    }
    Log "Docker" "Docker Engine" "INFO" "Skipped (WSL2 Ubuntu not ready)"
    Log "Docker" "Docker Service" "INFO" "Skipped"
    Log "Docker" "Docker Compose" "INFO" "Skipped"
}


# ============================================================
# Section 4: Network Egress (Outbound from Host)
# ============================================================

Write-Host "`n--- Section 4: Network Egress (Outbound) ---" -ForegroundColor White

$endpoints = @(
    @{ Name = "Docker Hub";      URL = "https://hub.docker.com";      Port = 443 },
    @{ Name = "npm Registry";    URL = "https://registry.npmjs.org";  Port = 443 },
    @{ Name = "PyPI";            URL = "https://pypi.org";            Port = 443 },
    @{ Name = "GitHub";          URL = "https://github.com";          Port = 443 },
    @{ Name = "GitHub Registry"; URL = "https://ghcr.io";             Port = 443 },
    @{ Name = "Ubuntu Packages"; URL = "https://archive.ubuntu.com";  Port = 443 }
)

$endpoints += @(
    @{ Name = "GitHub Actions (pipelines)"; URL = "https://pipelines.actions.githubusercontent.com"; Port = 443 },
    @{ Name = "GitHub Actions (results)";   URL = "https://results-receiver.actions.githubusercontent.com"; Port = 443 },
    @{ Name = "GitHub API";                 URL = "https://api.github.com";     Port = 443 }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $ep.URL -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Log "Egress" $ep.Name "PASS" "HTTP $($response.StatusCode)"
    } catch {
        Log "Egress" $ep.Name "FAIL" $_.Exception.Message
    }
}

# SMTP relay
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("10.20.3.4", 25)
    if ($tcp.Connected) { Log "Egress" 'SMTP Relay (10.20.3.4:25)' "PASS" "Connected" }
    $tcp.Close()
} catch {
    Log "Egress" 'SMTP Relay (10.20.3.4:25)' "FAIL" $_.Exception.Message
}

# Proxy detection
$proxy = [System.Net.WebRequest]::GetSystemWebProxy()
$proxyUri = $proxy.GetProxy("https://github.com")
if ($proxyUri.Host -ne "github.com") {
    Log "Egress" "HTTP Proxy Detected" "WARN" "Proxy: $proxyUri"
} else {
    Log "Egress" "HTTP Proxy" "INFO" "No proxy detected"
}

# DNS resolution
$dnsHosts = @("registry-1.docker.io", "auth.docker.io", "ghcr.io", "github.com")
foreach ($h in $dnsHosts) {
    try {
        $resolved = [System.Net.Dns]::GetHostAddresses($h)
        Log "Egress" "DNS: $h" "PASS" "Resolved to $($resolved[0])"
    } catch {
        Log "Egress" "DNS: $h" "FAIL" "Cannot resolve: $($_.Exception.Message)"
    }
}

# TLS version check
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    $tlsResponse = Invoke-WebRequest -Uri "https://www.howsmyssl.com/a/check" -UseBasicParsing -TimeoutSec 10
    $tlsInfo = $tlsResponse.Content | ConvertFrom-Json
    Log "Egress" "TLS Version" "PASS" "Using: $($tlsInfo.tls_version)"
} catch {
    Log "Egress" "TLS Version" "WARN" "Could not verify TLS: $($_.Exception.Message)"
}

# Git connectivity
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if ($gitInstalled) {
    try {
        git ls-remote --exit-code https://github.com/octocat/Hello-World.git HEAD 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Log "Egress" "Git HTTPS" "PASS" "Can clone via HTTPS" }
        else { Log "Egress" "Git HTTPS" "FAIL" "git ls-remote failed" }
    } catch {
        Log "Egress" "Git HTTPS" "FAIL" $_.Exception.Message
    }
} else {
    Log "Egress" "Git HTTPS" "WARN" "Git not installed on host"
}

# WSL2 internet access (if distro is ready)
if ($distroReady) {
    $wslPing = wsl -d $WSLDistro -e bash -c "curl -sS --connect-timeout 5 -o /dev/null -w '%{http_code}' https://hub.docker.com 2>/dev/null" 2>&1
    if ($wslPing.Trim() -match '^[23]\d\d$') {
        Log "Egress" "WSL2 Internet (Docker Hub)" "PASS" "HTTP $($wslPing.Trim()) from inside WSL2"
    } else {
        Log "Egress" "WSL2 Internet (Docker Hub)" "WARN" "WSL2 cannot reach Docker Hub -- check DNS/proxy in WSL2"
    }
}


# ============================================================
# Section 5: Network Ingress (Host Ports)
# ============================================================

Write-Host "`n--- Section 5: Network Ingress (Host Ports) ---" -ForegroundColor White

$ipAddresses = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet' }).IPAddress
Log "Ingress" "Host IP(s)" "INFO" ($ipAddresses -join ", ")

$firewall = Get-NetFirewallProfile | Select-Object Name, Enabled
foreach ($fw in $firewall) {
    Log "Ingress" "Firewall: $($fw.Name)" "INFO" "Enabled=$($fw.Enabled)"
}

# Check Docker ports
foreach ($pf in $DockerPorts) {
    $inUse = Get-NetTCPConnection -LocalPort $pf.HostPort -State Listen -ErrorAction SilentlyContinue
    if ($inUse) {
        $proc = Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue
        $procName = "unknown"
        if ($proc) { $procName = $proc.Name }
        # If it's wslhost or wsl, that's expected (Docker in WSL2)
        if ($procName -match 'wsl') {
            Log "Ingress" "Port $($pf.HostPort) ($($pf.Description))" "PASS" "In use by WSL2 (expected)"
        } else {
            Log "Ingress" "Port $($pf.HostPort) ($($pf.Description))" "WARN" "In use by: $procName (PID: $($inUse.OwningProcess))"
        }
    } else {
        # Try to bind to verify it's available
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $pf.HostPort)
            $listener.Start()
            Log "Ingress" "Port $($pf.HostPort) ($($pf.Description))" "PASS" "Available"
            $listener.Stop()
        } catch {
            Log "Ingress" "Port $($pf.HostPort) ($($pf.Description))" "FAIL" "Cannot bind: $($_.Exception.Message)"
        }
    }
}

# Firewall rules for Docker ports
foreach ($pf in $DockerPorts) {
    $ruleName = "Admin3-$($pf.Description -replace '\s','-')-$($pf.HostPort)"
    $fwRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($fwRule) {
        Log "Ingress" "Firewall: $ruleName" "PASS" "Action: $($fwRule.Action)"
    } else {
        Log "Ingress" "Firewall: $ruleName" "INFO" "Rule not found -- may be needed for external access"
    }
}

# Port forwarding rules (only relevant for NAT networking mode)
$wslConfigPath = Join-Path $env:USERPROFILE ".wslconfig"
$mirroredMode = $false
if (Test-Path $wslConfigPath) {
    $cfgContent = Get-Content $wslConfigPath -Raw
    if ($cfgContent -match 'networkingMode\s*=\s*mirrored') {
        $mirroredMode = $true
    }
}

if (-not $mirroredMode) {
    $portProxyOutput = netsh interface portproxy show v4tov4 2>&1
    $hasRules = ($portProxyOutput | Out-String) -match '\d+\.\d+\.\d+\.\d+'
    if ($hasRules) {
        Log "Ingress" "Port Forwarding (portproxy)" "INFO" "Active rules found"
        foreach ($line in $portProxyOutput) {
            if ($line -match '\d+\.\d+\.\d+\.\d+') {
                Write-Host "        $line" -ForegroundColor Gray
            }
        }
    } else {
        Log "Ingress" "Port Forwarding (portproxy)" "INFO" "No rules -- external access may not work"
    }
} else {
    Log "Ingress" "Port Forwarding" "PASS" "Not needed (mirrored networking)"
}

# Disk I/O test
$testFile = "$env:TEMP\docker-disk-test.bin"
try {
    $ioStart = Get-Date
    $bytes = New-Object byte[] (100MB)
    [System.IO.File]::WriteAllBytes($testFile, $bytes)
    $ioDuration = ((Get-Date) - $ioStart).TotalSeconds
    $ioSpeed = [math]::Round(100 / $ioDuration, 1)
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
    if ($ioSpeed -ge 50) {
        Log "Ingress" "Disk I/O (C:, 100MB write)" "PASS" "$ioSpeed MB/s"
    } else {
        Log "Ingress" "Disk I/O (C:, 100MB write)" "WARN" "$ioSpeed MB/s (may be slow for Docker builds)"
    }
} catch {
    Log "Ingress" "Disk I/O" "WARN" "Could not run test: $($_.Exception.Message)"
}


# ============================================================
# Section 6: Old Artifacts
# ============================================================

Write-Host "`n--- Section 6: Old Artifacts (Hyper-V / Docker Desktop) ---" -ForegroundColor White

$artifactCount = 0

# Docker Desktop
$ddKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop"
if (Test-Path $ddKey) {
    Log "Cleanup" "Docker Desktop" "WARN" "Installed -- not needed (Docker runs in WSL2)"
    $artifactCount++
} else {
    Log "Cleanup" "Docker Desktop" "PASS" "Not present"
}

# Docker Windows service
$dockerSvc = Get-Service -Name Docker -ErrorAction SilentlyContinue
if ($dockerSvc) {
    Log "Cleanup" "Docker Windows Service" "WARN" "Still installed (not needed for WSL2 approach)"
    $artifactCount++
} else {
    Log "Cleanup" "Docker Windows Service" "PASS" "Not present"
}

# Docker CE binaries on Windows
if (Test-Path "$env:ProgramFiles\docker\dockerd.exe") {
    Log "Cleanup" "Docker CE Binaries" "WARN" "Found at $env:ProgramFiles\docker (not needed)"
    $artifactCount++
} else {
    Log "Cleanup" "Docker CE Binaries" "PASS" "Not present"
}

# Old Hyper-V VM
$hypervModule = Get-Module -ListAvailable Hyper-V -ErrorAction SilentlyContinue
if ($hypervModule) {
    $oldVM = Get-VM -Name "Admin3-Docker" -ErrorAction SilentlyContinue
    if ($oldVM) {
        Log "Cleanup" "Hyper-V VM (Admin3-Docker)" "WARN" "State: $($oldVM.State) -- not needed for WSL2"
        $artifactCount++
    } else {
        Log "Cleanup" "Hyper-V VM" "PASS" "Not present"
    }

    $oldSwitch = Get-VMSwitch -Name "DockerNAT" -ErrorAction SilentlyContinue
    if ($oldSwitch) {
        Log "Cleanup" "Hyper-V Switch (DockerNAT)" "WARN" "Still exists -- not needed for WSL2"
        $artifactCount++
    } else {
        Log "Cleanup" "Hyper-V Switch" "PASS" "Not present"
    }
} else {
    Log "Cleanup" "Hyper-V Module" "INFO" "Not installed (no Hyper-V artifacts to check)"
}

# Old NAT rule
$oldNat = Get-NetNat -Name "DockerNAT" -ErrorAction SilentlyContinue
if ($oldNat) {
    Log "Cleanup" "NAT Rule (DockerNAT)" "WARN" "Still exists -- from old Hyper-V approach"
    $artifactCount++
} else {
    Log "Cleanup" "NAT Rule" "PASS" "Not present"
}

if ($artifactCount -eq 0) {
    Log "Cleanup" "Overall" "PASS" "No old artifacts found"
} else {
    Log "Cleanup" "Overall" "WARN" "$artifactCount artifact(s) -- run install-docker.ps1 Phase 7 for cleanup guidance"
}


# ============================================================
# Section 7: GitHub Actions Runner
# ============================================================

Write-Host "`n--- Section 7: GitHub Actions Runner ---" -ForegroundColor White

$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($runnerService) {
    Log "Runner" "Service Installed" "PASS" $runnerService.Name
    if ($runnerService.Status -eq 'Running') {
        Log "Runner" "Service Running" "PASS" "Status: Running"
    } else {
        Log "Runner" "Service Running" "WARN" "Status: $($runnerService.Status) -- start with: Start-Service '$($runnerService.Name)'"
    }
} else {
    Log "Runner" "Service Installed" "INFO" "Not installed yet"
}

try {
    $ghApi = Invoke-WebRequest -Uri "https://api.github.com/meta" -TimeoutSec 10 -UseBasicParsing
    Log "Runner" "GitHub API Access" "PASS" "HTTP $($ghApi.StatusCode)"
} catch {
    Log "Runner" "GitHub API Access" "FAIL" $_.Exception.Message
}


# ============================================================
# Summary
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$pass = ($results | Where-Object Status -eq 'PASS').Count
$fail = ($results | Where-Object Status -eq 'FAIL').Count
$warn = ($results | Where-Object Status -eq 'WARN').Count
$info = ($results | Where-Object Status -eq 'INFO').Count
Write-Host "PASS: $pass  |  WARN: $warn  |  FAIL: $fail  |  INFO: $info" -ForegroundColor $(if ($fail -gt 0) { 'Red' } elseif ($warn -gt 0) { 'Yellow' } else { 'Green' })

# Progress assessment
$hasWSLFeatures = ($results | Where-Object { $_.Section -eq 'System' -and $_.Test -eq 'WSL Feature' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasVMPlatform  = ($results | Where-Object { $_.Section -eq 'System' -and $_.Test -eq 'Virtual Machine Platform' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasDistro      = ($results | Where-Object { $_.Section -eq 'WSL2' -and $_.Test -eq 'Ubuntu Distro' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasSystemd     = ($results | Where-Object { $_.Section -eq 'WSL2' -and $_.Test -eq 'systemd' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasDocker      = ($results | Where-Object { $_.Section -eq 'Docker' -and $_.Test -eq 'Docker Engine' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasDockerSvc   = ($results | Where-Object { $_.Section -eq 'Docker' -and $_.Test -eq 'Docker Service' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasInternet    = ($results | Where-Object { $_.Section -eq 'Egress' -and $_.Test -eq 'Docker Hub' -and $_.Status -eq 'PASS' }).Count -gt 0

Write-Host "`nSETUP PROGRESS:" -ForegroundColor Yellow
$steps = @(
    @{ Done = $hasWSLFeatures -and $hasVMPlatform; Label = "Phase 1: WSL2 features enabled" },
    @{ Done = $hasDistro;                          Label = "Phase 2: Ubuntu distro installed" },
    @{ Done = $hasSystemd;                         Label = "Phase 3: WSL2 configured (systemd)" },
    @{ Done = $hasDocker;                          Label = "Phase 4: Docker Engine installed" },
    @{ Done = $hasDockerSvc;                       Label = "Phase 4: Docker service running" },
    @{ Done = $hasInternet;                        Label = "Network: Internet access (for image pulls)" }
)

foreach ($step in $steps) {
    $color = "Gray"
    $mark = " "
    if ($step.Done) { $color = "Green"; $mark = "x" }
    Write-Host ("  [{0}] {1}" -f $mark, $step.Label) -ForegroundColor $color
}

Write-Host ""

# Next action recommendation
if (-not $hasWSLFeatures -or -not $hasVMPlatform) {
    Write-Host "NEXT STEP: Run install-docker.ps1 to enable WSL2 features (may require reboot)" -ForegroundColor Red
} elseif (-not $hasDistro) {
    Write-Host "NEXT STEP: Run install-docker.ps1 to install Ubuntu distro" -ForegroundColor Red
} elseif (-not $hasSystemd) {
    Write-Host "NEXT STEP: Run install-docker.ps1 to configure systemd" -ForegroundColor Red
} elseif (-not $hasDocker) {
    Write-Host "NEXT STEP: Run install-docker.ps1 to install Docker Engine" -ForegroundColor Red
} elseif (-not $hasDockerSvc) {
    Write-Host "NEXT STEP: Start Docker service:" -ForegroundColor Yellow
    Write-Host "  wsl -d Ubuntu -e sudo systemctl start docker" -ForegroundColor Cyan
} else {
    Write-Host "ALL READY -- Deploy with:" -ForegroundColor Green
    Write-Host "  wsl -d Ubuntu" -ForegroundColor Cyan
    Write-Host "  cd ~/Admin3 && docker compose up -d" -ForegroundColor Cyan
}

# Save results
$outFile = "docker-diagnostic-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$results | Format-Table -AutoSize | Out-String | Set-Content $outFile
Write-Host "`nResults saved to: $outFile" -ForegroundColor Gray
