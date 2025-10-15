# Railway Environment Variables Setup Script for UAT
# Run this from: backend/django_Admin3/ directory

# Navigate to the backend directory
cd backend/django_Admin3

# Set environment variables for Railway UAT deployment
# Replace <placeholders> with actual values before running

# Core Django Settings
railway variables set DJANGO_ENV=uat --service admin3-backend
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat --service admin3-backend
railway variables set DJANGO_SECRET_KEY="<GENERATE_SECURE_KEY_HERE>" --service admin3-backend

# Database Configuration
# IMPORTANT: Replace <YOUR_DB_HOST> with your actual database host
railway variables set DATABASE_URL="postgresql://actedadmin:Act3d@dm1n0EEoo@<YOUR_DB_HOST>:5432/ACTEDDBUAT01" --service admin3-backend

# Security Settings
# Replace <your-railway-domain> with your actual Railway domain
railway variables set ALLOWED_HOSTS="<your-railway-domain>.railway.app,healthcheck.railway.app" --service admin3-backend
railway variables set CORS_ALLOWED_ORIGINS="https://<frontend-domain>.railway.app" --service admin3-backend
railway variables set CSRF_TRUSTED_ORIGINS="https://<frontend-domain>.railway.app" --service admin3-backend

# Administrate API Settings
railway variables set ADMINISTRATE_INSTANCE_URL="<your-value>" --service admin3-backend
railway variables set ADMINISTRATE_API_URL="<your-value>" --service admin3-backend
railway variables set ADMINISTRATE_API_KEY="<your-value>" --service admin3-backend
railway variables set ADMINISTRATE_API_SECRET="<your-value>" --service admin3-backend
railway variables set ADMINISTRATE_REST_API_URL="<your-value>" --service admin3-backend
railway variables set GETADDRESS_API_KEY="<your-value>" --service admin3-backend

# Email Configuration
railway variables set EMAIL_HOST_USER="<your-gmail-address>" --service admin3-backend
railway variables set EMAIL_HOST_PASSWORD="<your-gmail-app-password>" --service admin3-backend
railway variables set DEFAULT_FROM_EMAIL="noreply@acted.com" --service admin3-backend

# Frontend URL
railway variables set FRONTEND_URL="https://<frontend-domain>.railway.app" --service admin3-backend

# Opayo Payment Gateway (Test Mode for UAT)
railway variables set OPAYO_VENDOR_NAME="<your-vendor-name>" --service admin3-backend
railway variables set OPAYO_INTEGRATION_KEY="<your-integration-key>" --service admin3-backend
railway variables set OPAYO_INTEGRATION_PASSWORD="<your-integration-password>" --service admin3-backend

# reCAPTCHA Settings
railway variables set RECAPTCHA_SITE_KEY="<your-site-key>" --service admin3-backend
railway variables set RECAPTCHA_SECRET_KEY="<your-secret-key>" --service admin3-backend
railway variables set RECAPTCHA_MIN_SCORE="0.5" --service admin3-backend

Write-Host "Environment variables setup complete!" -ForegroundColor Green
Write-Host "Review the variables in Railway dashboard before deploying" -ForegroundColor Yellow
