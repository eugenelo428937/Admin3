# Database Recovery Script for Admin3
# Run this after restoring your database backup

Write-Host "Admin3 Database Recovery Process" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Step 1: Check current migration status
Write-Host "`nStep 1: Checking migration status..." -ForegroundColor Yellow
cd C:\Code\Admin3\backend\django_Admin3
python manage.py showmigrations > migration_status_before.txt
Write-Host "Migration status saved to migration_status_before.txt"

# Step 2: Fake initial migrations if needed (for apps that existed in backup)
Write-Host "`nStep 2: Faking initial migrations for existing apps..." -ForegroundColor Yellow
python manage.py migrate --fake-initial

# Step 3: Apply missing migrations
Write-Host "`nStep 3: Applying missing migrations..." -ForegroundColor Yellow
python manage.py migrate

# Step 4: Check final migration status
Write-Host "`nStep 4: Verifying final migration status..." -ForegroundColor Yellow
python manage.py showmigrations > migration_status_after.txt
Write-Host "Final migration status saved to migration_status_after.txt"

# Step 5: Run integrity checks
Write-Host "`nStep 5: Running database integrity checks..." -ForegroundColor Yellow
python manage.py dbshell -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

Write-Host "`nRecovery process complete!" -ForegroundColor Green
Write-Host "Please review migration_status_after.txt to ensure all migrations applied successfully."