# Common functions and variables for all PowerShell scripts

# Get repository root, with fallback for non-git repositories
function Get-RepoRoot {
    try {
        $gitRoot = git rev-parse --show-toplevel 2>$null
        if ($gitRoot) {
            return $gitRoot
        }
    } catch {
        # Git not available or not in a git repo
    }

    # Fall back to script location for non-git repos
    $scriptDir = Split-Path -Parent $PSCommandPath
    $repoRoot = Resolve-Path (Join-Path $scriptDir "..\..\..") -ErrorAction SilentlyContinue
    if ($repoRoot) {
        return $repoRoot.Path
    }

    throw "Could not determine repository root"
}

# Get current branch, with fallback for non-git repositories
function Get-CurrentBranch {
    # First check if SPECIFY_FEATURE environment variable is set
    if ($env:SPECIFY_FEATURE) {
        return $env:SPECIFY_FEATURE
    }

    # Then check git if available
    try {
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($branch) {
            return $branch
        }
    } catch {
        # Git not available
    }

    # For non-git repos, try to find the latest feature directory
    $repoRoot = Get-RepoRoot
    $specsDir = Join-Path $repoRoot "specs"

    if (Test-Path $specsDir) {
        $highest = 0
        $latestFeature = ""

        Get-ChildItem -Path $specsDir -Directory | ForEach-Object {
            if ($_.Name -match '^(\d{3})-') {
                $number = [int]$matches[1]
                if ($number -gt $highest) {
                    $highest = $number
                    $latestFeature = $_.Name
                }
            }
        }

        if ($latestFeature) {
            return $latestFeature
        }
    }

    return "main"  # Final fallback
}

# Check if we have git available
function Test-HasGit {
    try {
        $null = git rev-parse --show-toplevel 2>$null
        return $true
    } catch {
        return $false
    }
}

# Check if we're on a valid feature branch
function Test-FeatureBranch {
    param(
        [string]$Branch,
        [bool]$HasGitRepo
    )

    # For non-git repos, we can't enforce branch naming but still provide output
    if (-not $HasGitRepo) {
        Write-Warning "[specify] Warning: Git repository not detected; skipped branch validation"
        return $true
    }

    if ($Branch -notmatch '^\d{3}-') {
        Write-Error "ERROR: Not on a feature branch. Current branch: $Branch"
        Write-Error "Feature branches should be named like: 001-feature-name"
        return $false
    }

    return $true
}

# Get feature directory path
function Get-FeatureDir {
    param(
        [string]$RepoRoot,
        [string]$Branch
    )
    return Join-Path $RepoRoot "specs\$Branch"
}

# Get all feature paths
function Get-FeaturePaths {
    $repoRoot = Get-RepoRoot
    $currentBranch = Get-CurrentBranch
    $hasGit = Test-HasGit

    $featureDir = Get-FeatureDir -RepoRoot $repoRoot -Branch $currentBranch

    return @{
        REPO_ROOT = $repoRoot
        CURRENT_BRANCH = $currentBranch
        HAS_GIT = $hasGit
        FEATURE_DIR = $featureDir
        FEATURE_SPEC = Join-Path $featureDir "spec.md"
        IMPL_PLAN = Join-Path $featureDir "plan.md"
        TASKS = Join-Path $featureDir "tasks.md"
        RESEARCH = Join-Path $featureDir "research.md"
        DATA_MODEL = Join-Path $featureDir "data-model.md"
        QUICKSTART = Join-Path $featureDir "quickstart.md"
        CONTRACTS_DIR = Join-Path $featureDir "contracts"
    }
}

# Check if file exists and report status
function Test-FileStatus {
    param(
        [string]$Path,
        [string]$Label
    )

    if (Test-Path $Path -PathType Leaf) {
        return "  ✓ $Label"
    } else {
        return "  ✗ $Label"
    }
}

# Check if directory exists and is not empty
function Test-DirStatus {
    param(
        [string]$Path,
        [string]$Label
    )

    if ((Test-Path $Path -PathType Container) -and (Get-ChildItem $Path -ErrorAction SilentlyContinue)) {
        return "  ✓ $Label"
    } else {
        return "  ✗ $Label"
    }
}
