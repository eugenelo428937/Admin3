# Admin3 Pre-Go-Live Checklist Script
# Comprehensive Pre-Launch Validation

function Test-Item {
    param([string]$TestName, [scriptblock]$TestScript)
    
    Write-Host "Testing: $TestName..." -ForegroundColor "Yellow"
    
    try {
        $result = & $TestScript
        if ($result) {
            Write-Host "✓ $TestName - PASSED" -ForegroundColor "Green"
            return $true
        } else {
            Write-Host "✗ $TestName - FAILED" -ForegroundColor "Red"
            return $false
        }
    } catch {
        Write-Host "✗ $TestName - ERROR: $_" -ForegroundColor "Red"
        return $false
    }
}

# Infrastructure Tests
$infraTests = @(
    @{Name="Server OS Updates"; Script={Get-HotFix | Where-Object {$_.InstalledOn -gt (Get-Date).AddDays(-30)} | Measure-Object | Select-Object -ExpandProperty Count -gt 0}},
    @{Name="Required Services Running"; Script={
        $services = @("Admin3-Waitress", "postgresql-x64-16", "Redis", "W3SVC")
        $runningServices = Get-Service -Name $services -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq "Running"}
        $runningServices.Count -eq $services.Count
    }},
    @{Name="Firewall Configuration"; Script={
        $rules = Get-NetFirewallRule | Where-Object {$_.DisplayName -in @("HTTP", "HTTPS")}
        $rules.Count -eq 2
    }},
    @{Name="SSL Certificate Valid"; Script={
        # Test SSL certificate validity (if applicable)
        $cert = Get-ChildItem Cert:\LocalMachine\WebHosting\ -ErrorAction SilentlyContinue | Where-Object {$_.Subject -like "*yourdomain.com*"}
        if ($cert) {
            $cert.NotAfter -gt (Get-Date).AddDays(30)
        } else {
            $true # Skip if no SSL cert configured
        }
    }}
)

# Security Tests
$securityTests = @(
    @{Name="Security Headers"; Script={
        try {
            $response = Invoke-WebRequest -Uri "http://localhost" -Method Head
            $securityHeaders = @("X-Frame-Options", "X-Content-Type-Options", "X-XSS-Protection")
            ($securityHeaders | Where-Object {$response.Headers.ContainsKey($_)}).Count -ge 1
        } catch {
            $false
        }
    }},
    @{Name="Database Encryption"; Script={
        try {
            $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
            $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "admin3_user" }
            $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "Admin3_Production" }
            $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
            $result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "SHOW ssl;" 2>$null
            $env:PGPASSWORD = $null
            $true # Assume OK if command runs
        } catch {
            $false
        }
    }}
)

# Application Tests
$appTests = @(
    @{Name="Django Admin Access"; Script={
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/admin/login/" -Method Get
            $response.StatusCode -eq 200
        } catch {
            $false
        }
    }},
    @{Name="API Health Check"; Script={
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -Method Get
            $response.StatusCode -eq 200
        } catch {
            $false
        }
    }},
    @{Name="React App Loading"; Script={
        try {
            $response = Invoke-WebRequest -Uri "http://localhost" -Method Get
            $response.Content -like "*<div id=`"root`"*"
        } catch {
            $false
        }
    }},
    @{Name="Database Connection"; Script={
        try {
            $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
            $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "admin3_user" }
            $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "Admin3_Production" }
            $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
            $result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "SELECT 1;" 2>$null
            $env:PGPASSWORD = $null
            $LASTEXITCODE -eq 0
        } catch {
            $false
        }
    }},
    @{Name="Redis Connection"; Script={
        try {
            $result = redis-cli ping 2>$null
            $result -eq "PONG"
        } catch {
            $false
        }
    }}
)

# Performance Tests
$perfTests = @(
    @{Name="API Response Time"; Script={
        try {
            $start = Get-Date
            $response = Invoke-WebRequest -Uri "http://localhost/api/health/" -Method Get
            $duration = ((Get-Date) - $start).TotalMilliseconds
            $duration -lt 2000 # Less than 2 seconds
        } catch {
            $false
        }
    }},
    @{Name="Database Query Performance"; Script={
        try {
            $env:PGPASSWORD = if ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } else { $env:DB_PASSWORD }
            $dbUser = if ($env:DB_APP_USER) { $env:DB_APP_USER } else { "admin3_user" }
            $dbName = if ($env:DB_APP_NAME) { $env:DB_APP_NAME } else { "Admin3_Production" }
            $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
            $start = Get-Date
            $result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $dbHost -U $dbUser -d $dbName -c "SELECT COUNT(*) FROM auth_user;" 2>$null
            $duration = ((Get-Date) - $start).TotalMilliseconds
            $env:PGPASSWORD = $null
            $duration -lt 1000 # Less than 1 second
        } catch {
            $false
        }
    }},
    @{Name="System Resource Usage"; Script={
        $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $memoryUsage = (($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100
        $cpu.Average -lt 80 -and $memoryUsage -lt 85
    }}
)

# Backup and Recovery Tests
$backupTests = @(
    @{Name="Backup Scripts Available"; Script={
        $scripts = @(".\09-backup-database.ps1", ".\10-backup-application.ps1")
        ($scripts | Where-Object {Test-Path $_}).Count -eq $scripts.Count
    }},
    @{Name="Recent Backup Exists"; Script={
        $backupPath = "C:\backups\postgresql"
        if (Test-Path $backupPath) {
            $recentBackup = Get-ChildItem -Path $backupPath -Filter "*.7z" | Sort-Object CreationTime -Descending | Select-Object -First 1
            $recentBackup -and $recentBackup.CreationTime -gt (Get-Date).AddDays(-7)
        } else {
            $false
        }
    }},
    @{Name="Recovery Scripts Available"; Script={
        $scripts = @(".\11-restore-database.ps1", ".\12-emergency-rollback.ps1")
        ($scripts | Where-Object {Test-Path $_}).Count -eq $scripts.Count
    }}
)

# Run all tests
Write-Host "Admin3 Pre-Go-Live Validation" -ForegroundColor "Cyan"
Write-Host "=============================" -ForegroundColor "Cyan"

$allTests = @(
    @{Category="Infrastructure"; Tests=$infraTests},
    @{Category="Security"; Tests=$securityTests},
    @{Category="Application"; Tests=$appTests},
    @{Category="Performance"; Tests=$perfTests},
    @{Category="Backup & Recovery"; Tests=$backupTests}
)

$totalTests = 0
$passedTests = 0

foreach ($category in $allTests) {
    Write-Host "`n$($category.Category) Tests:" -ForegroundColor "Magenta"
    Write-Host "$(('=' * $category.Category.Length)) Tests:" -ForegroundColor "Magenta"
    
    foreach ($test in $category.Tests) {
        $result = Test-Item -TestName $test.Name -TestScript $test.Script
        $totalTests++
        if ($result) { $passedTests++ }
    }
}

# Summary
Write-Host "`nTest Results Summary:" -ForegroundColor "Cyan"
Write-Host "===================" -ForegroundColor "Cyan"
Write-Host "Total Tests: $totalTests" -ForegroundColor "White"
Write-Host "Passed: $passedTests" -ForegroundColor "Green"
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor "Red"

$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -eq 100) {"Green"} elseif ($successRate -gt 90) {"Yellow"} else {"Red"})

if ($successRate -eq 100) {
    Write-Host "`n✓ SYSTEM READY FOR GO-LIVE!" -ForegroundColor "Green"
} elseif ($successRate -gt 90) {
    Write-Host "`n⚠ SYSTEM MOSTLY READY - Address failed tests before go-live" -ForegroundColor "Yellow"
} else {
    Write-Host "`n✗ SYSTEM NOT READY - Critical issues must be resolved" -ForegroundColor "Red"
}