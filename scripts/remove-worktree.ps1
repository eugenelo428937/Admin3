# Admin3 Git Worktree Cleanup Script
# Safely removes a worktree and its associated database

param(
    [Parameter(Mandatory=$true)]
    [string]$WorktreePath,

    [Parameter(Mandatory=$false)]
    [switch]$DropDatabase,

    [Parameter(Mandatory=$false)]
    [string]$PostgresUser = "actedadmin",

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "`n=== Admin3 Worktree Cleanup ===" -ForegroundColor Yellow

# Resolve absolute path
$WorktreePath = Resolve-Path $WorktreePath -ErrorAction SilentlyContinue
if (-not $WorktreePath) {
    Write-Host "Error: Worktree path not found" -ForegroundColor Red
    exit 1
}

Write-Host "Worktree: $WorktreePath" -ForegroundColor Cyan

# Check if it's a valid worktree
$worktreeList = git worktree list --porcelain
if (-not ($worktreeList -match [regex]::Escape($WorktreePath))) {
    Write-Host "Error: Not a valid git worktree" -ForegroundColor Red
    exit 1
}

# Extract branch name and derive database name
$branchLine = ($worktreeList -split "`n" | Where-Object { $_ -match "^branch " } | Select-Object -First 1)
if ($branchLine -match "branch refs/heads/(.+)") {
    $branchName = $matches[1]
    $dbName = "admin3_$($branchName.Replace('/', '_').Replace('-', '_'))"
    Write-Host "Branch: $branchName" -ForegroundColor Cyan
    Write-Host "Associated DB: $dbName" -ForegroundColor Cyan
}

# Check for uncommitted changes
Push-Location $WorktreePath
$gitStatus = git status --porcelain
Pop-Location

if ($gitStatus -and -not $Force) {
    Write-Host "`n⚠ Warning: Worktree contains uncommitted changes:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor Gray
    Write-Host "`nUse -Force to remove anyway, or commit/stash changes first" -ForegroundColor Yellow
    exit 1
}

# Confirm removal
if (-not $Force) {
    Write-Host "`nThis will remove the worktree directory and all its contents." -ForegroundColor Yellow
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled" -ForegroundColor Gray
        exit 0
    }
}

# Remove worktree
Write-Host "`nRemoving worktree..." -ForegroundColor Yellow
if ($Force) {
    git worktree remove $WorktreePath --force
} else {
    git worktree remove $WorktreePath
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Worktree removed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to remove worktree" -ForegroundColor Red
    exit 1
}

# Drop database if requested
if ($DropDatabase -and $dbName) {
    Write-Host "`nDropping database '$dbName'..." -ForegroundColor Yellow

    $psqlPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
    if (-not (Test-Path $psqlPath)) {
        $psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
    }

    if ($psqlPath) {
        # Terminate active connections first
        $terminateCmd = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid <> pg_backend_pid();"
        & $psqlPath -U $PostgresUser -c $terminateCmd 2>$null

        # Drop database
        $dropCmd = "DROP DATABASE IF EXISTS $dbName;"
        & $psqlPath -U $PostgresUser -c $dropCmd 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database '$dbName' dropped successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Failed to drop database (may not exist)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ psql not found, cannot drop database automatically" -ForegroundColor Yellow
        Write-Host "Manually drop with: psql -U $PostgresUser -c `"DROP DATABASE $dbName;`"" -ForegroundColor Gray
    }
}

# Prune deleted worktrees
Write-Host "`nCleaning up worktree references..." -ForegroundColor Yellow
git worktree prune
Write-Host "✓ Cleanup complete" -ForegroundColor Green

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "✓ Worktree removed: $WorktreePath" -ForegroundColor White
if ($DropDatabase -and $dbName) {
    Write-Host "✓ Database dropped: $dbName" -ForegroundColor White
} elseif ($dbName) {
    Write-Host "ℹ Database preserved: $dbName" -ForegroundColor Cyan
    Write-Host "  To drop manually: psql -U $PostgresUser -c `"DROP DATABASE $dbName;`"" -ForegroundColor Gray
}
Write-Host "`n"
