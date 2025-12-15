@echo off
REM =============================================================
REM Email Worker for UAT Database (runs locally)
REM =============================================================
REM This script runs the email queue processor on your local machine
REM connecting to the Railway UAT database. Since your machine can
REM access the internal SMTP server (20.49.225.55), emails will send.
REM =============================================================

echo ============================================================
echo Email Worker - UAT Database (Local Machine)
echo ============================================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Load environment variables from .env.uat file
set ENV_FILE=%SCRIPT_DIR%.env.uat
if not exist "%ENV_FILE%" (
    echo ERROR: .env.uat file not found at %ENV_FILE%
    echo Please ensure .env.uat exists in the same directory as this script.
    exit /b 1
)

echo Loading environment from .env.uat...
for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
    REM Skip lines starting with # (comments)
    echo %%a | findstr /b "#" >nul
    if errorlevel 1 (
        REM Remove surrounding quotes from value if present
        set "value=%%b"
        setlocal enabledelayedexpansion
        set "value=!value:"=!"
        endlocal & set "%%a=%value%"
    )
)

REM Override ALLOWED_HOSTS to include localhost for local worker
set ALLOWED_HOSTS=%ALLOWED_HOSTS%,127.0.0.1,localhost

echo Settings loaded from .env.uat:
echo   DJANGO_ENV: %DJANGO_ENV%
echo   DATABASE: Railway UAT (trolley.proxy.rlwy.net)
echo   EMAIL_HOST: %EMAIL_HOST%:%EMAIL_PORT%
echo   EMAIL_AUTH: %EMAIL_AUTH_METHOD%
echo   FROM: %DEFAULT_FROM_EMAIL%
echo.

REM Change to the Django project directory
cd /d %~dp0

REM Activate virtual environment
echo Activating virtual environment...
call c:\Code\Admin3\.venv\Scripts\activate.bat

REM Run the email queue processor
echo.
echo Starting email queue processor (continuous mode)...
echo Press Ctrl+C to stop
echo.

python manage.py process_email_queue --continuous --interval 30

REM Deactivate when done
deactivate
