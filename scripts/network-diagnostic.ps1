#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Network diagnostic for Admin3 Docker Compose staging deployment.
    Checks: system requirements, network egress/ingress, Docker status, GitHub Actions runner.
.OUTPUTS
    Console report + results saved to network-diagnostic-results.txt
#>

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Log($section, $test, $status, $detail) {
    $entry = [PSCustomObject]@{
        Section = $section
        Test    = $test
        Status  = $status
        Detail  = $detail
    }
    $script:results += $entry
    $color = if ($status -eq 'PASS') { 'Green' } elseif ($status -eq 'WARN') { 'Yellow' } else { 'Red' }
    Write-Host "[$status] $section > $test" -ForegroundColor $color
    if ($detail) { Write-Host "        $detail" -ForegroundColor Gray }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Email System - Network Diagnostic" -ForegroundColor Cyan
Write-Host " $timestamp" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Section 1: System Requirements ──

$os = Get-CimInstance Win32_OperatingSystem
Log "System" "Windows Version" "INFO" "$($os.Caption) Build $($os.BuildNumber)"

$ram = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ram -ge 16) { Log "System" "RAM ($($ram)GB)" "PASS" "Recommended 16GB met" }
elseif ($ram -ge 8) { Log "System" "RAM ($($ram)GB)" "WARN" "8GB minimum met, 16GB recommended for 5-container stack" }
else { Log "System" "RAM ($($ram)GB)" "FAIL" "Need 8GB+ (16GB recommended), have $($ram)GB" }

$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
if ($freeGB -ge 40) { Log "System" "Disk Free ($($freeGB)GB)" "PASS" "Recommended 40GB met" }
elseif ($freeGB -ge 20) { Log "System" "Disk Free ($($freeGB)GB)" "WARN" "20GB minimum met, 40GB recommended for Docker images + build cache" }
else { Log "System" "Disk Free ($($freeGB)GB)" "FAIL" "Need 20GB+ (40GB recommended), have $($freeGB)GB" }

$hyperv = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
if ($hyperv.State -eq 'Enabled') { Log "System" "Hyper-V" "PASS" "Enabled" }
else { Log "System" "Hyper-V" "WARN" "Not enabled — required for Linux containers" }

$containers = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
if ($containers.State -eq 'Enabled') { Log "System" "Containers Feature" "PASS" "Enabled" }
else { Log "System" "Containers Feature" "WARN" "Not enabled" }

# ── Section 2: Network Egress (Outbound) ──

$endpoints = @(
    @{ Name = "Docker Hub";     URL = "https://hub.docker.com";      Port = 443 },
    @{ Name = "npm Registry";   URL = "https://registry.npmjs.org";  Port = 443 },
    @{ Name = "PyPI";           URL = "https://pypi.org";            Port = 443 },
    @{ Name = "GitHub";         URL = "https://github.com";          Port = 443 },
    @{ Name = "GitHub Registry";URL = "https://ghcr.io";             Port = 443 }
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
    if ($tcp.Connected) { Log "Egress" "SMTP Relay (10.20.3.4:25)" "PASS" "Connected" }
    $tcp.Close()
} catch {
    Log "Egress" "SMTP Relay (10.20.3.4:25)" "FAIL" $_.Exception.Message
}

# Proxy detection
$proxy = [System.Net.WebRequest]::GetSystemWebProxy()
$proxyUri = $proxy.GetProxy("https://github.com")
if ($proxyUri.Host -ne "github.com") {
    Log "Egress" "HTTP Proxy Detected" "WARN" "Proxy: $proxyUri"
} else {
    Log "Egress" "HTTP Proxy" "INFO" "No proxy detected"
}

# DNS resolution for Docker registries
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
        $gitResult = git ls-remote --exit-code https://github.com/octocat/Hello-World.git HEAD 2>&1
        if ($LASTEXITCODE -eq 0) { Log "Egress" "Git HTTPS" "PASS" "Can clone via HTTPS" }
        else { Log "Egress" "Git HTTPS" "FAIL" "git ls-remote failed" }
    } catch {
        Log "Egress" "Git HTTPS" "FAIL" $_.Exception.Message
    }
} else {
    Log "Egress" "Git HTTPS" "WARN" "Git not installed"
}

# ── Section 3: Network Ingress (Inbound) ──

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
Log "Ingress" "Server IP(s)" "INFO" ($ip -join ", ")

$firewall = Get-NetFirewallProfile | Select-Object Name, Enabled
foreach ($fw in $firewall) {
    $status = if ($fw.Enabled) { "WARN" } else { "INFO" }
    Log "Ingress" "Firewall: $($fw.Name)" $status "Enabled=$($fw.Enabled)"
}

# Test port binding
$testPort = 8080
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $testPort)
    $listener.Start()
    Log "Ingress" "Port $testPort Bind" "PASS" "Can bind to port $testPort"
    $listener.Stop()
} catch {
    Log "Ingress" "Port $testPort Bind" "FAIL" "Cannot bind: $($_.Exception.Message)"
}

# Test ports needed by Docker Compose stack
$requiredPorts = @(
    @{ Port = 80;   Name = "HTTP (Nginx)" },
    @{ Port = 443;  Name = "HTTPS (Nginx)" },
    @{ Port = 5432; Name = "PostgreSQL" },
    @{ Port = 6379; Name = "Redis" }
)

foreach ($p in $requiredPorts) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $p.Port)
        $listener.Start()
        Log "Ingress" "Port $($p.Port) ($($p.Name))" "PASS" "Available"
        $listener.Stop()
    } catch {
        Log "Ingress" "Port $($p.Port) ($($p.Name))" "FAIL" "In use or blocked: $($_.Exception.Message)"
    }
}

# ── Section 4: Docker Status ──

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    $version = docker version --format '{{.Server.Version}}' 2>&1
    Log "Docker" "Installed" "PASS" "Version: $version"

    $composeVersion = docker compose version 2>&1
    Log "Docker" "Compose" "PASS" "$composeVersion"

    # Test container run
    $hello = docker run --rm hello-world 2>&1
    if ($LASTEXITCODE -eq 0) { Log "Docker" "Container Run" "PASS" "hello-world succeeded" }
    else { Log "Docker" "Container Run" "FAIL" "hello-world failed: $hello" }

    # Test container→host network (SMTP)
    $smtpTest = docker run --rm alpine sh -c "nc -z -w5 host.docker.internal 25 && echo OK || echo FAIL" 2>&1
    # Note: host.docker.internal may not work on all Docker setups
    Log "Docker" "Container→SMTP" "INFO" "Result: $smtpTest (verify manually if FAIL)"

    # Linux container mode detection
    $dockerInfo = docker info --format '{{.OSType}}' 2>&1
    if ($dockerInfo -eq "linux") {
        Log "Docker" "Container Mode" "PASS" "Linux containers (required)"
    } else {
        Log "Docker" "Container Mode" "FAIL" "Windows containers active. Switch to Linux containers in Docker Desktop settings."
    }

    # Docker Compose V2 check
    $composeVersionRaw = docker compose version --short 2>&1
    if ($composeVersionRaw -match '^(\d+)\.') {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -ge 2) {
            Log "Docker" "Compose V2" "PASS" "Version $composeVersionRaw"
        } else {
            Log "Docker" "Compose V2" "FAIL" "Need Compose V2+, have $composeVersionRaw"
        }
    }

    # Real image pull test
    Write-Host "`n  Testing real image pull (postgres:15-alpine, ~80MB)..." -ForegroundColor Gray
    $pullStart = Get-Date
    $pullResult = docker pull postgres:15-alpine 2>&1
    $pullDuration = ((Get-Date) - $pullStart).TotalSeconds
    if ($LASTEXITCODE -eq 0) {
        Log "Docker" "Image Pull (postgres:15-alpine)" "PASS" "Pulled in $([math]::Round($pullDuration, 1))s"
    } else {
        Log "Docker" "Image Pull (postgres:15-alpine)" "FAIL" "Pull failed: $pullResult"
    }

    # Disk I/O test
    $testFile = "$env:TEMP\docker-disk-test.bin"
    $ioStart = Get-Date
    $bytes = New-Object byte[] (100MB)
    [System.IO.File]::WriteAllBytes($testFile, $bytes)
    $ioDuration = ((Get-Date) - $ioStart).TotalSeconds
    $ioSpeed = [math]::Round(100 / $ioDuration, 1)
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
    if ($ioSpeed -ge 50) {
        Log "Docker" "Disk I/O (100MB write)" "PASS" "$ioSpeed MB/s"
    } else {
        Log "Docker" "Disk I/O (100MB write)" "WARN" "$ioSpeed MB/s (may be slow for Docker builds)"
    }
} else {
    Log "Docker" "Installed" "FAIL" "Docker not found in PATH"
}

# ── Section 5: GitHub Actions Runner ──

$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($runnerService) {
    Log "Runner" "Service Installed" "PASS" $runnerService.Name
    if ($runnerService.Status -eq 'Running') {
        Log "Runner" "Service Running" "PASS" "Status: Running"
    } else {
        Log "Runner" "Service Running" "WARN" "Status: $($runnerService.Status) — start with: Start-Service '$($runnerService.Name)'"
    }
} else {
    Log "Runner" "Service Installed" "INFO" "Not installed yet. Run setup-runner.ps1 after Docker is configured."
}

# Runner → GitHub API connectivity
try {
    $ghApi = Invoke-WebRequest -Uri "https://api.github.com/meta" -TimeoutSec 10 -UseBasicParsing
    Log "Runner" "GitHub API Access" "PASS" "HTTP $($ghApi.StatusCode)"
} catch {
    Log "Runner" "GitHub API Access" "FAIL" $_.Exception.Message
}

# ── Summary ──

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$pass = ($results | Where-Object Status -eq 'PASS').Count
$fail = ($results | Where-Object Status -eq 'FAIL').Count
$warn = ($results | Where-Object Status -eq 'WARN').Count
Write-Host "PASS: $pass  |  WARN: $warn  |  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { 'Red' } else { 'Green' })

# Deployment path recommendation
$hasInternet = ($results | Where-Object { $_.Section -eq 'Egress' -and $_.Test -eq 'Docker Hub' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasDocker = ($results | Where-Object { $_.Section -eq 'Docker' -and $_.Test -eq 'Installed' -and $_.Status -eq 'PASS' }).Count -gt 0

Write-Host "`nRECOMMENDED DEPLOYMENT PATH:" -ForegroundColor Yellow
if ($hasDocker -and $hasInternet) {
    Write-Host "  ONLINE — Docker installed + internet access. Use docker-compose pull." -ForegroundColor Green
} elseif ($hasDocker) {
    Write-Host "  OFFLINE — Docker installed but no internet. Use docker save/load." -ForegroundColor Yellow
} else {
    Write-Host "  INSTALL DOCKER FIRST — Then re-run this script." -ForegroundColor Red
}

# Save results
$outFile = "network-diagnostic-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$results | Format-Table -AutoSize | Out-String | Set-Content $outFile
Write-Host "`nResults saved to: $outFile" -ForegroundColor Gray