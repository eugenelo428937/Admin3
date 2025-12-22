# Admin3 Git Worktree List Script
# Lists all worktrees with their branches, databases, and configurations

param(
    [Parameter(Mandatory=$false)]
    [switch]$Detailed
)

Write-Host "`n=== Admin3 Worktrees ===" -ForegroundColor Green

# Get worktree list
$worktrees = git worktree list --porcelain

if (-not $worktrees) {
    Write-Host "No worktrees found" -ForegroundColor Yellow
    exit 0
}

# Parse worktree information
$currentWorktree = @{}
$allWorktrees = @()

foreach ($line in $worktrees -split "`n") {
    if ($line -match "^worktree (.+)") {
        if ($currentWorktree.Count -gt 0) {
            $allWorktrees += $currentWorktree.Clone()
        }
        $currentWorktree = @{
            Path = $matches[1]
        }
    }
    elseif ($line -match "^HEAD (.+)") {
        $currentWorktree.HEAD = $matches[1]
    }
    elseif ($line -match "^branch (.+)") {
        $branchRef = $matches[1]
        if ($branchRef -match "refs/heads/(.+)") {
            $currentWorktree.Branch = $matches[1]
        }
    }
    elseif ($line -match "^detached") {
        $currentWorktree.Detached = $true
    }
}

# Add last worktree
if ($currentWorktree.Count -gt 0) {
    $allWorktrees += $currentWorktree
}

# Display worktrees
$index = 1
foreach ($wt in $allWorktrees) {
    $path = $wt.Path
    $branch = if ($wt.Detached) { "DETACHED HEAD" } else { $wt.Branch }
    $isMain = ($path -eq (Get-Location).Path) -or ($path -match "\\Admin3$")

    # Derive database name from branch
    if ($branch -and $branch -ne "DETACHED HEAD") {
        $dbName = "admin3_$($branch.Replace('/', '_').Replace('-', '_'))"
    } else {
        $dbName = "N/A"
    }

    # Display worktree info
    if ($isMain) {
        Write-Host "`n[$index] " -NoNewline -ForegroundColor Cyan
        Write-Host "$path " -NoNewline -ForegroundColor White
        Write-Host "[MAIN]" -ForegroundColor Green
    } else {
        Write-Host "`n[$index] $path" -ForegroundColor Cyan
    }

    Write-Host "    Branch: " -NoNewline -ForegroundColor Gray
    Write-Host "$branch" -ForegroundColor White

    if ($branch -ne "DETACHED HEAD") {
        Write-Host "    Database: " -NoNewline -ForegroundColor Gray
        Write-Host "$dbName" -ForegroundColor Yellow
    }

    # Show detailed information if requested
    if ($Detailed) {
        # Try to read .env files for port information
        $backendEnv = Join-Path $path "backend\django_Admin3\.env.development"
        $frontendEnv = Join-Path $path "frontend\react-Admin3\.env"

        if (Test-Path $backendEnv) {
            $envContent = Get-Content $backendEnv -Raw
            if ($envContent -match "DB_NAME=(.+)") {
                $actualDbName = $matches[1].Trim()
                Write-Host "    Actual DB: " -NoNewline -ForegroundColor Gray
                Write-Host "$actualDbName" -ForegroundColor Yellow
            }
        }

        if (Test-Path $frontendEnv) {
            $envContent = Get-Content $frontendEnv -Raw
            if ($envContent -match "REACT_APP_API_BASE_URL=http://[^:]+:(\d+)") {
                $backendPort = $matches[1]
                Write-Host "    Backend Port: " -NoNewline -ForegroundColor Gray
                Write-Host "$backendPort" -ForegroundColor Cyan
            }
            if ($envContent -match "PORT=(\d+)") {
                $frontendPort = $matches[1]
                Write-Host "    Frontend Port: " -NoNewline -ForegroundColor Gray
                Write-Host "$frontendPort" -ForegroundColor Cyan
            }
        }

        # Check for uncommitted changes
        Push-Location $path
        $status = git status --porcelain
        Pop-Location

        if ($status) {
            $changeCount = ($status -split "`n").Count
            Write-Host "    Changes: " -NoNewline -ForegroundColor Gray
            Write-Host "$changeCount uncommitted" -ForegroundColor Yellow
        } else {
            Write-Host "    Changes: " -NoNewline -ForegroundColor Gray
            Write-Host "clean" -ForegroundColor Green
        }
    }

    $index++
}

Write-Host "`n"
Write-Host "Total worktrees: $($allWorktrees.Count)" -ForegroundColor White

# Show helpful commands
Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  List detailed: " -NoNewline -ForegroundColor Gray
Write-Host ".\scripts\list-worktrees.ps1 -Detailed" -ForegroundColor White
Write-Host "  Create new:    " -NoNewline -ForegroundColor Gray
Write-Host ".\scripts\create-worktree.ps1 -BranchName <branch>" -ForegroundColor White
Write-Host "  Remove:        " -NoNewline -ForegroundColor Gray
Write-Host ".\scripts\remove-worktree.ps1 -WorktreePath <path> -DropDatabase" -ForegroundColor White
Write-Host "`n"
