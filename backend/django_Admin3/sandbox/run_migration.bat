@echo off
REM Batch file to run database migration from ACTEDDBDEVOLD to ACTEDDBDEV01
REM This preserves IDs to maintain referential integrity

echo ==========================================
echo Database Migration Script
echo From: ACTEDDBDEVOLD
echo To:   ACTEDDBDEV01
echo Table: acted_products
echo ==========================================
echo.

REM Set PostgreSQL connection parameters
set PGPASSWORD=Act3d@dm1n0EEoo
set PGUSER=actedadmin
set PGHOST=127.0.0.1
set PGPORT=5432
set PGDATABASE=ACTEDDBDEV01

echo Running migration SQL script...
echo.

REM Execute the migration script
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -f migrate_acted_products.sql

if %ERRORLEVEL% == 0 (
    echo.
    echo ==========================================
    echo Migration completed successfully!
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo ERROR: Migration failed!
    echo Please check the error messages above.
    echo ==========================================
)

echo.
pause