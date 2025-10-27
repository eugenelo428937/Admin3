#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments,

    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: create-new-feature.ps1 [-Json] <feature_description>"
    Write-Host ""
    Write-Host "  -Json                 Output in JSON format"
    Write-Host "  -Help                 Show this help message"
    Write-Host "  <feature_description> Description of the feature to create"
    exit 0
}

# Parse arguments
$featureDescription = $Arguments -join " "
if (-not $featureDescription) {
    Write-Error "Usage: create-new-feature.ps1 [-Json] <feature_description>"
    exit 1
}

# Function to find the repository root by searching for existing project markers
function Find-RepoRoot {
    param([string]$StartPath)

    $dir = $StartPath
    while ($dir -and $dir -ne [System.IO.Path]::GetPathRoot($dir)) {
        if ((Test-Path (Join-Path $dir ".git")) -or (Test-Path (Join-Path $dir ".specify"))) {
            return $dir
        }
        $dir = Split-Path -Parent $dir
    }
    return $null
}

# Resolve repository root
$scriptDir = Split-Path -Parent $PSCommandPath

try {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($gitRoot) {
        $repoRoot = $gitRoot
        $hasGit = $true
    } else {
        throw "Git not available"
    }
} catch {
    $repoRoot = Find-RepoRoot -StartPath $scriptDir
    if (-not $repoRoot) {
        Write-Error "Error: Could not determine repository root. Please run this script from within the repository."
        exit 1
    }
    $hasGit = $false
}

Set-Location $repoRoot

# Create specs directory if it doesn't exist
$specsDir = Join-Path $repoRoot "specs"
if (-not (Test-Path $specsDir)) {
    New-Item -ItemType Directory -Path $specsDir | Out-Null
}

# Find the highest feature number
$highest = 0
if (Test-Path $specsDir) {
    Get-ChildItem -Path $specsDir -Directory | ForEach-Object {
        if ($_.Name -match '^(\d+)') {
            $number = [int]$matches[1]
            if ($number -gt $highest) {
                $highest = $number
            }
        }
    }
}

$next = $highest + 1
$featureNum = "{0:D3}" -f $next

# Generate branch name from feature description
$branchName = $featureDescription.ToLower() `
    -replace '[^a-z0-9]', '-' `
    -replace '-+', '-' `
    -replace '^-', '' `
    -replace '-$', ''

# Take first 3 words for the branch name
$words = ($branchName -split '-' | Where-Object { $_ } | Select-Object -First 3) -join '-'
$branchName = "$featureNum-$words"

# Create branch if in a git repository
if ($hasGit) {
    try {
        git checkout -b $branchName 2>$null
    } catch {
        Write-Warning "[specify] Git branch creation failed: $_"
    }
} else {
    Write-Warning "[specify] Warning: Git repository not detected; skipped branch creation for $branchName"
}

# Create feature directory
$featureDir = Join-Path $specsDir $branchName
if (-not (Test-Path $featureDir)) {
    New-Item -ItemType Directory -Path $featureDir | Out-Null
}

# Copy template if it exists
$template = Join-Path $repoRoot ".specify\templates\spec-template.md"
$specFile = Join-Path $featureDir "spec.md"

if (Test-Path $template) {
    Copy-Item $template $specFile
} else {
    New-Item -ItemType File -Path $specFile | Out-Null
}

# Set the SPECIFY_FEATURE environment variable for the current session
$env:SPECIFY_FEATURE = $branchName

# Output results
if ($Json) {
    $result = @{
        BRANCH_NAME = $branchName
        SPEC_FILE = $specFile
        FEATURE_NUM = $featureNum
    } | ConvertTo-Json -Compress
    Write-Output $result
} else {
    Write-Host "BRANCH_NAME: $branchName"
    Write-Host "SPEC_FILE: $specFile"
    Write-Host "FEATURE_NUM: $featureNum"
    Write-Host "SPECIFY_FEATURE environment variable set to: $branchName"
}
