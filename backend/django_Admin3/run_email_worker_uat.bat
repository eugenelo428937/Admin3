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

REM Set Django environment
set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
set DJANGO_ENV=uat
set DJANGO_SECRET_KEY=tL4UippOZNeIMnIXV7PonSGvP7I1RPaNajWLRxWLuWf3UGi4xa

REM Database - Railway UAT Postgres (via proxy)
set LOCAL_MACHINE=False
set DATABASE_URL=postgres://actedadmin:Act3d@dm1n0EEoo@trolley.proxy.rlwy.net:20296/ACTEDDBUAT01

REM Service type
set SERVICE_TYPE=worker

REM Allowed hosts and CORS
set ALLOWED_HOSTS=admin3-backend-uat.up.railway.app,admin3-backend.railway.internal,healthcheck.railway.app,127.0.0.1,localhost
set CORS_ALLOWED_ORIGINS=https://acted-estore-uat.up.railway.app
set CSRF_TRUSTED_ORIGINS=https://acted-estore-uat.up.railway.app
set FRONTEND_URL=https://acted-estore-uat.up.railway.app

REM Email Configuration - Internal SMTP (accessible from local machine)
set USE_SENDGRID=False
set USE_INTERNAL_SMTP=True
set EMAIL_HOST=20.49.225.55
set EMAIL_PORT=25
set EMAIL_USE_TLS=False
set EMAIL_USE_SSL=False
set EMAIL_TIMEOUT=30
set EMAIL_AUTH_METHOD=CRAM-MD5
set EMAIL_HOST_USER=acted@acted.co.uk
set EMAIL_HOST_PASSWORD=Em*!1.$eNd-p@$$
set EMAIL_FROM_NAME=ActEd Sales
set DEFAULT_FROM_EMAIL=no-reply@acted.co.uk
set DEFAULT_REPLY_TO_EMAIL=acted@bpp.com

REM Email Queue Settings
set EMAIL_QUEUE_BATCH_SIZE=50
set EMAIL_QUEUE_INTERVAL=30

REM Email Monitoring
set EMAIL_BCC_MONITORING=True
set EMAIL_BCC_RECIPIENTS=eugene.lo1030@gmail.com
set DEV_EMAIL_OVERRIDE=False
set DEV_EMAIL_RECIPIENTS=eugene.lo1030@gmail.com

REM Password Reset
set PASSWORD_RESET_TIMEOUT_MINUTES=14

REM Address Lookup APIs
set GETADDRESS_API_KEY=aDGDtdypHkejzf6sQToLJQ46686
set GETADDRESS_ADMIN_KEY=-A-yR_lwoE2LJiIoDzrf_Q46686
set POSTCODER_API_KEY=PCWZ9-BBRBH-KK5BY-FYSEU

REM reCAPTCHA
set RECAPTCHA_SITE_KEY=6LfuZwksAAAAANJb4SnRapsdWHmpl9qJ3Ywnr70C
set RECAPTCHA_SECRET_KEY=6LfuZwksAAAAAGkWifb2E42dtKR5Hnr4pEWB1QmU
set RECAPTCHA_MIN_SCORE=0.6

REM Payment Gateway
set USE_DUMMY_PAYMENT_GATEWAY=True
set OPAYO_VENDOR_NAME=sandboxEC
set OPAYO_INTEGRATION_KEY=hJYxsw7HLbj40cB8udES8DRFhuJ8G54O6rDpUXvE6hYDrri
set OPAYO_INTEGRATION_PASSWORD=o2iHSrFabYMZmWOQMsXaP52V4faBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5
set OPAYO_BASE_URL=https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v12/payment-pages

REM Administrate API
set ADMINISTRATE_API_KEY=bJC4yEzW7dICQin2JbgwU0gsbN9kuaDC
set ADMINISTRATE_API_SECRET=9SCcBFTbquz7OL8qmg9cN5ky6yWQBxur
set ADMINISTRATE_API_URL=https://api.getadministrate.com/graphql
set ADMINISTRATE_AUTH_USER=eugenelo@bpp.com
set ADMINISTRATE_INSTANCE_URL=bppacteduat.administrateapp.com
set ADMINISTRATE_REST_API_URL=https://bppacteduat.administrateapp.com

REM Other settings
set USE_ALB_PROXY=true

echo Settings loaded:
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
