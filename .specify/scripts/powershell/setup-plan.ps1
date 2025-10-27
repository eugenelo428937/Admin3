#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: setup-plan.ps1 [-Json]"
    Write-Host ""
    Write-Host "  -Json    Output results in JSON format"
    Write-Host "  -Help    Show this help message"
    exit 0
}

# Get script directory and load common functions
$scriptDir = Split-Path -Parent $PSCommandPath
. (Join-Path $scriptDir "common.ps1")

# Get all paths and variables from common functions
$paths = Get-FeaturePaths

# Check if we're on a proper feature branch (only for git repos)
if (-not (Test-FeatureBranch -Branch $paths.CURRENT_BRANCH -HasGitRepo $paths.HAS_GIT)) {
    exit 1
}

# Ensure the feature directory exists
if (-not (Test-Path $paths.FEATURE_DIR)) {
    New-Item -ItemType Directory -Path $paths.FEATURE_DIR | Out-Null
}

# Copy plan template if it exists
$template = Join-Path $paths.REPO_ROOT ".specify\templates\plan-template.md"
if (Test-Path $template) {
    Copy-Item $template $paths.IMPL_PLAN
    Write-Host "Copied plan template to $($paths.IMPL_PLAN)"
} else {
    Write-Warning "Warning: Plan template not found at $template"
    # Create a basic plan file if template doesn't exist
    New-Item -ItemType File -Path $paths.IMPL_PLAN | Out-Null
}

# Output results
if ($Json) {
    $result = @{
        FEATURE_SPEC = $paths.FEATURE_SPEC
        IMPL_PLAN = $paths.IMPL_PLAN
        SPECS_DIR = $paths.FEATURE_DIR
        BRANCH = $paths.CURRENT_BRANCH
        HAS_GIT = $paths.HAS_GIT.ToString()
    } | ConvertTo-Json -Compress
    Write-Output $result
} else {
    Write-Host "FEATURE_SPEC: $($paths.FEATURE_SPEC)"
    Write-Host "IMPL_PLAN: $($paths.IMPL_PLAN)"
    Write-Host "SPECS_DIR: $($paths.FEATURE_DIR)"
    Write-Host "BRANCH: $($paths.CURRENT_BRANCH)"
    Write-Host "HAS_GIT: $($paths.HAS_GIT)"
}
