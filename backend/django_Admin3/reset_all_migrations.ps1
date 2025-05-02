# PowerShell script to reset and re-apply all Django app migrations in dependency order

# 1. Find all apps with migrations
$apps = Get-ChildItem -Path . -Recurse -Directory -Filter "migrations" | 
    Where-Object { Test-Path "$($_.FullName)\__init__.py" } | 
    ForEach-Object { Split-Path $_.FullName -Parent | Split-Path -Leaf }

Write-Host "Detected Django apps with migrations:" -ForegroundColor Cyan
$apps | ForEach-Object { Write-Host $_ }

# 2. Show migration dependencies (optional, for review)
Write-Host "`nMigration dependencies (first migration file in each app):" -ForegroundColor Cyan
foreach ($app in $apps) {
    $migPath = Get-ChildItem -Path ".\$app\migrations" -Filter "*.py" | Where-Object { $_.Name -ne "__init__.py" } | Sort-Object Name | Select-Object -First 1
    if ($migPath) {
    $deps = Select-String -Path $migPath.FullName -Pattern "dependencies\s*=\s*\[(.*?)\]" -AllMatches | ForEach-Object { $_.Matches.Groups[1].Value }
    Write-Host ("{0}: {1}" -f $app, $deps)
}
}

# 3. Fake-unapply all migrations in reverse order
Write-Host "`nFaking migration reset for all apps (reverse order):" -ForegroundColor Yellow
$appsReversed = $apps | Sort-Object -Descending
foreach ($app in $appsReversed) {
    Write-Host "python manage.py migrate $app zero --fake"
    python manage.py migrate $app zero --fake
}

# 4. Re-apply migrations in normal order
Write-Host "`nRe-applying migrations for all apps (correct order):" -ForegroundColor Green
foreach ($app in $apps) {
    Write-Host "python manage.py migrate $app"
    python manage.py migrate $app
}

Write-Host "`nDone! If you see errors, check for missing or circular dependencies in your migration files." -ForegroundColor Cyan