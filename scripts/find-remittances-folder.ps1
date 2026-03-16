<#
.SYNOPSIS
    Find a folder named "REMITTANCES to  POST" on the system.

.DESCRIPTION
    Searches specified drives for a directory with the exact name
    "REMITTANCES to  POST" (note: double space between "to" and "POST").
    Reports all matching paths found.

.PARAMETER SearchPaths
    Root paths to search. Defaults to all fixed drives.

.EXAMPLE
    .\find-remittances-folder.ps1
    .\find-remittances-folder.ps1 -SearchPaths "D:\", "E:\"
#>

param(
    [string[]]$SearchPaths
)

$folderName = "REMITTANCES to  POST"

# Default to all fixed drives if no paths specified
if (-not $SearchPaths) {
    $SearchPaths = (Get-PSDrive -PSProvider FileSystem |
        Where-Object { $_.Used -ne $null } |
        ForEach-Object { "$($_.Root)" })
}

Write-Host "Searching for folder: '$folderName'" -ForegroundColor Cyan
Write-Host "Search paths: $($SearchPaths -join ', ')" -ForegroundColor Cyan
Write-Host ""

$found = @()

foreach ($root in $SearchPaths) {
    if (-not (Test-Path $root)) {
        Write-Host "  Skipping '$root' (not accessible)" -ForegroundColor Yellow
        continue
    }

    Write-Host "  Scanning $root ..." -ForegroundColor Gray

    $results = Get-ChildItem -Path $root -Directory -Recurse -Filter $folderName -ErrorAction SilentlyContinue

    foreach ($dir in $results) {
        $found += $dir.FullName
        Write-Host "  FOUND: $($dir.FullName)" -ForegroundColor Green
    }
}

Write-Host ""

if ($found.Count -eq 0) {
    Write-Host "No folders named '$folderName' were found." -ForegroundColor Yellow
} else {
    Write-Host "Found $($found.Count) match(es):" -ForegroundColor Green
    $found | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
}
