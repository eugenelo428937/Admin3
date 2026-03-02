# scripts/setup-runner.ps1
# Installs GitHub Actions self-hosted runner as a Windows Service.
# Run as Administrator on the staging server.
#
# Prerequisites:
#   1. Docker Desktop installed and running
#   2. Git installed
#   3. Runner token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner
#
# Usage:
#   .\setup-runner.ps1 -RepoUrl "https://github.com/OWNER/Admin3" -Token "AXXXXXXX..."

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl,

    [Parameter(Mandatory=$true)]
    [string]$Token,

    [string]$RunnerName = "staging-runner",
    [string]$Labels = "staging,windows",
    [string]$InstallDir = "C:\actions-runner"
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " GitHub Actions Runner Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run this script as Administrator" -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    docker info | Out-Null
    Write-Host "[PASS] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Determine latest runner version
Write-Host "`nDownloading latest runner..." -ForegroundColor Yellow
$latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest"
$version = $latestRelease.tag_name.TrimStart('v')
$downloadUrl = "https://github.com/actions/runner/releases/download/v${version}/actions-runner-win-x64-${version}.zip"
Write-Host "  Version: $version"
Write-Host "  URL: $downloadUrl"

# Create install directory
if (Test-Path $InstallDir) {
    Write-Host "  Runner directory exists, cleaning up..." -ForegroundColor Yellow
    # Stop existing service if running
    $svc = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
    if ($svc) {
        Stop-Service $svc.Name -Force -ErrorAction SilentlyContinue
        & "$InstallDir\svc.cmd" uninstall 2>$null
    }
    Remove-Item "$InstallDir\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download and extract
$zipPath = "$InstallDir\runner.zip"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
Remove-Item $zipPath

# Configure runner
Write-Host "`nConfiguring runner..." -ForegroundColor Yellow
Push-Location $InstallDir
& .\config.cmd --url $RepoUrl --token $Token --name $RunnerName --labels $Labels --unattended --replace
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Runner configuration failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Install as Windows Service
Write-Host "`nInstalling as Windows Service..." -ForegroundColor Yellow
& .\svc.cmd install
& .\svc.cmd start
Pop-Location

# Verify
Start-Sleep -Seconds 5
$service = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq 'Running') {
    Write-Host "`n[PASS] Runner installed and running as service: $($service.Name)" -ForegroundColor Green
    Write-Host "  Name:   $RunnerName" -ForegroundColor Gray
    Write-Host "  Labels: $Labels" -ForegroundColor Gray
    Write-Host "  Dir:    $InstallDir" -ForegroundColor Gray
} else {
    Write-Host "`n[WARN] Service installed but may not be running. Check Services (services.msc)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Setup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Verify runner appears in GitHub: Settings > Actions > Runners"
Write-Host "  2. Create .env file in the repo directory on this server"
Write-Host "  3. Push to 'staging' branch to trigger first deployment"
