# =============================================================
# Email Worker for UAT Database (runs locally)
# =============================================================
# This script runs the email queue processor on your local machine
# connecting to the Railway UAT database. Since your machine can
# access the internal SMTP server (20.49.225.55), emails will send.
# =============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Email Worker - UAT Database (Local Machine)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Set Django environment
$env:DJANGO_SETTINGS_MODULE = "django_Admin3.settings.uat"
$env:DJANGO_ENV = "uat"
$env:DJANGO_SECRET_KEY = "tL4UippOZNeIMnIXV7PonSGvP7I1RPaNajWLRxWLuWf3UGi4xa"

# Database - Railway UAT Postgres (via proxy)
$env:LOCAL_MACHINE = "False"
$env:DATABASE_URL = "postgres://actedadmin:Act3d@dm1n0EEoo@trolley.proxy.rlwy.net:20296/ACTEDDBUAT01"

# Service type
$env:SERVICE_TYPE = "worker"

# Allowed hosts and CORS
$env:ALLOWED_HOSTS = "admin3-backend-uat.up.railway.app,admin3-backend.railway.internal,healthcheck.railway.app,127.0.0.1,localhost"
$env:CORS_ALLOWED_ORIGINS = "https://acted-estore-uat.up.railway.app"
$env:CSRF_TRUSTED_ORIGINS = "https://acted-estore-uat.up.railway.app"
$env:FRONTEND_URL = "https://acted-estore-uat.up.railway.app"

# Email Configuration - Internal SMTP (accessible from local machine)
$env:USE_SENDGRID = "False"
$env:USE_INTERNAL_SMTP = "True"
$env:EMAIL_HOST = "20.49.225.55"
$env:EMAIL_PORT = "25"
$env:EMAIL_USE_TLS = "False"
$env:EMAIL_USE_SSL = "False"
$env:EMAIL_TIMEOUT = "30"
$env:EMAIL_AUTH_METHOD = "CRAM-MD5"
$env:EMAIL_HOST_USER = "acted@acted.co.uk"
$env:EMAIL_HOST_PASSWORD = 'Em*!1.$eNd-p@$$'
$env:EMAIL_FROM_NAME = "ActEd Sales"
$env:DEFAULT_FROM_EMAIL = "no-reply@acted.co.uk"
$env:DEFAULT_REPLY_TO_EMAIL = "acted@bpp.com"

# Email Queue Settings
$env:EMAIL_QUEUE_BATCH_SIZE = "50"
$env:EMAIL_QUEUE_INTERVAL = "30"

# Email Monitoring
$env:EMAIL_BCC_MONITORING = "True"
$env:EMAIL_BCC_RECIPIENTS = "eugene.lo1030@gmail.com"
$env:DEV_EMAIL_OVERRIDE = "False"
$env:DEV_EMAIL_RECIPIENTS = "eugene.lo1030@gmail.com"

# Password Reset
$env:PASSWORD_RESET_TIMEOUT_MINUTES = "14"

# Address Lookup APIs
$env:GETADDRESS_API_KEY = "aDGDtdypHkejzf6sQToLJQ46686"
$env:GETADDRESS_ADMIN_KEY = "-A-yR_lwoE2LJiIoDzrf_Q46686"
$env:POSTCODER_API_KEY = "PCWZ9-BBRBH-KK5BY-FYSEU"

# reCAPTCHA
$env:RECAPTCHA_SITE_KEY = "6LfuZwksAAAAANJb4SnRapsdWHmpl9qJ3Ywnr70C"
$env:RECAPTCHA_SECRET_KEY = "6LfuZwksAAAAAGkWifb2E42dtKR5Hnr4pEWB1QmU"
$env:RECAPTCHA_MIN_SCORE = "0.6"

# Payment Gateway
$env:USE_DUMMY_PAYMENT_GATEWAY = "True"
$env:OPAYO_VENDOR_NAME = "sandboxEC"
$env:OPAYO_INTEGRATION_KEY = "hJYxsw7HLbj40cB8udES8DRFhuJ8G54O6rDpUXvE6hYDrri"
$env:OPAYO_INTEGRATION_PASSWORD = "o2iHSrFabYMZmWOQMsXaP52V4faBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5"
$env:OPAYO_BASE_URL = "https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v12/payment-pages"

# Administrate API
$env:ADMINISTRATE_API_KEY = "bJC4yEzW7dICQin2JbgwU0gsbN9kuaDC"
$env:ADMINISTRATE_API_SECRET = "9SCcBFTbquz7OL8qmg9cN5ky6yWQBxur"
$env:ADMINISTRATE_API_URL = "https://api.getadministrate.com/graphql"
$env:ADMINISTRATE_AUTH_USER = "eugenelo@bpp.com"
$env:ADMINISTRATE_INSTANCE_URL = "bppacteduat.administrateapp.com"
$env:ADMINISTRATE_REST_API_URL = "https://bppacteduat.administrateapp.com"

# Other settings
$env:USE_ALB_PROXY = "true"

Write-Host "Settings loaded:" -ForegroundColor Green
Write-Host "  DJANGO_ENV: $env:DJANGO_ENV"
Write-Host "  DATABASE: Railway UAT (trolley.proxy.rlwy.net)"
Write-Host "  EMAIL_HOST: $env:EMAIL_HOST`:$env:EMAIL_PORT"
Write-Host "  EMAIL_AUTH: $env:EMAIL_AUTH_METHOD"
Write-Host "  FROM: $env:DEFAULT_FROM_EMAIL"
Write-Host ""

# Change to the Django project directory
Set-Location $PSScriptRoot

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& c:\Code\Admin3\.venv\Scripts\Activate.ps1

# Run the email queue processor
Write-Host ""
Write-Host "Starting email queue processor (continuous mode)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

python manage.py process_email_queue --continuous --interval 15
