# Railway Environment Variables Cheat Sheet

Use these commands to set all environment variables for Railway deployment.

**Run these from**: `backend/django_Admin3`

**Note**: Replace `<value>` with actual values from your `.env.uat` file below.

---

## Core Django Settings

```bash
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
railway variables set DJANGO_ENV=uat
railway variables set DEBUG=False
```

## Django Secret Key (Auto-generate)

```powershell
# Run in PowerShell to generate a secure random key
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
railway variables set DJANGO_SECRET_KEY=$SECRET_KEY
```

## Database Configuration

```bash
# Railway auto-provides DATABASE_URL from PostgreSQL service
# Just set allowed hosts
railway variables set ALLOWED_HOSTS='${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}}'
```

## External API Credentials

**Copy from `.env.uat` file - values will be shown below**

```bash
railway variables set ADMINISTRATE_INSTANCE_URL="<see-below>"
railway variables set ADMINISTRATE_API_URL="<see-below>"
railway variables set ADMINISTRATE_API_KEY="<see-below>"
railway variables set ADMINISTRATE_API_SECRET="<see-below>"
railway variables set ADMINISTRATE_REST_API_URL="<see-below>"
railway variables set GETADDRESS_API_KEY="<see-below>"
railway variables set GETADDRESS_ADMIN_KEY="<see-below>"
```

## Email Configuration

```bash
railway variables set EMAIL_HOST_USER="<see-below>"
railway variables set EMAIL_HOST_PASSWORD="<see-below>"
railway variables set DEFAULT_FROM_EMAIL="noreply@acted.com"
```

## reCAPTCHA (Optional - uses test keys by default)

```bash
railway variables set RECAPTCHA_SITE_KEY="<see-below-or-use-default>"
railway variables set RECAPTCHA_SECRET_KEY="<see-below-or-use-default>"
railway variables set RECAPTCHA_MIN_SCORE="0.5"
```

## Frontend URLs (Set after frontend is deployed)

```bash
# Run this AFTER you have the frontend domain
railway variables set FRONTEND_URL="https://<frontend-domain>"
railway variables set CORS_ALLOWED_ORIGINS="https://<frontend-domain>"
railway variables set CSRF_TRUSTED_ORIGINS="https://<frontend-domain>"
```

---

# VALUES FROM YOUR .env.uat FILE

⚠️ **Important**: Copy these exact commands (values already filled in from your `.env.uat`)

---

## 📋 COPY-PASTE READY COMMANDS

**Run these from**: `backend/django_Admin3` directory

### Core Settings
```bash
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
railway variables set DJANGO_ENV=uat
railway variables set DEBUG=False
railway variables set ALLOWED_HOSTS='${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}}'
```

### Generate Django Secret Key (PowerShell)
```powershell
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
railway variables set DJANGO_SECRET_KEY=$SECRET_KEY
```

### Administrate API
```bash
railway variables set ADMINISTRATE_API_URL="https://api.getadministrate.com/graphql"
railway variables set ADMINISTRATE_INSTANCE_URL="bppacteduat.administrateapp.com"
railway variables set ADMINISTRATE_API_KEY="bJC4yEzW7dICQin2JbgwU0gsbN9kuaDC"
railway variables set ADMINISTRATE_API_SECRET="9SCcBFTbquz7OL8qmg9cN5ky6yWQBxur"
railway variables set ADMINISTRATE_REST_API_URL="https://bppacteduat.administrateapp.com"
railway variables set ADMINISTRATE_AUTH_USER="eugenelo@bpp.com"
```

### GetAddress.io API
```bash
railway variables set GETADDRESS_API_KEY="aDGDtdypHkejzf6sQToLJQ46686"
railway variables set GETADDRESS_ADMIN_KEY="-A-yR_lwoE2LJiIoDzrf_Q46686"
```

### Email Configuration
```bash
railway variables set EMAIL_HOST_USER="eugene.lo1030@gmail.com"
railway variables set EMAIL_HOST_PASSWORD="hhrhthqiymjnehby"
railway variables set DEFAULT_FROM_EMAIL="eugenelo@acted.com"
```

### reCAPTCHA
```bash
railway variables set RECAPTCHA_SITE_KEY="6LdhHm0rAAAAAPcWNrdES-7ns_VkwCT8DCKpWWg-"
railway variables set RECAPTCHA_SECRET_KEY="6LdhHm0rAAAAAGZJsCis9q94aUPVN4tRCFIfoxEi"
railway variables set RECAPTCHA_MIN_SCORE="0.5"
```

### Payment Gateway (Opayo - Test/Sandbox)
```bash
railway variables set USE_DUMMY_PAYMENT_GATEWAY="False"
railway variables set OPAYO_BASE_URL="https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages"
railway variables set OPAYO_VENDOR_NAME="sandboxEC"
railway variables set OPAYO_INTEGRATION_KEY="hJYxsw7HLbj40cB8udES8CDRFLhuJ8G54O6rDpUXvE6hYDrria"
railway variables set OPAYO_INTEGRATION_PASSWORD="o2iHSrFybYMZpmWOQMuhsXP52V4fBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5u"
railway variables set OPAYO_VPS_PROTOCOL="4.00"
railway variables set OPAYO_TXTYPE="PAYMENT"
railway variables set OPAYO_VENDOR="ifeltd"
```

### Frontend URLs (⚠️ Set AFTER frontend is deployed)
```bash
# Replace <frontend-domain> with your actual Railway frontend domain
railway variables set FRONTEND_URL="https://<frontend-domain>"
railway variables set CORS_ALLOWED_ORIGINS="https://<frontend-domain>"
railway variables set CSRF_TRUSTED_ORIGINS="https://<frontend-domain>"
```

---

## 📝 Quick Copy for Backend Service

**All-in-one script** (copy and run as one block):

```bash
# Navigate to backend
cd backend/django_Admin3

# Link to Railway project
railway link
# Select: admin3-uat

# Set all variables
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
railway variables set DJANGO_ENV=uat
railway variables set DEBUG=False
railway variables set ALLOWED_HOSTS='${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}}'
railway variables set ADMINISTRATE_API_URL="https://api.getadministrate.com/graphql"
railway variables set ADMINISTRATE_INSTANCE_URL="bppacteduat.administrateapp.com"
railway variables set ADMINISTRATE_API_KEY="bJC4yEzW7dICQin2JbgwU0gsbN9kuaDC"
railway variables set ADMINISTRATE_API_SECRET="9SCcBFTbquz7OL8qmg9cN5ky6yWQBxur"
railway variables set ADMINISTRATE_REST_API_URL="https://bppacteduat.administrateapp.com"
railway variables set ADMINISTRATE_AUTH_USER="eugenelo@bpp.com"
railway variables set GETADDRESS_API_KEY="aDGDtdypHkejzf6sQToLJQ46686"
railway variables set GETADDRESS_ADMIN_KEY="-A-yR_lwoE2LJiIoDzrf_Q46686"
railway variables set EMAIL_HOST_USER="eugene.lo1030@gmail.com"
railway variables set EMAIL_HOST_PASSWORD="hhrhthqiymjnehby"
railway variables set DEFAULT_FROM_EMAIL="eugenelo@acted.com"
railway variables set RECAPTCHA_SITE_KEY="6LdhHm0rAAAAAPcWNrdES-7ns_VkwCT8DCKpWWg-"
railway variables set RECAPTCHA_SECRET_KEY="6LdhHm0rAAAAAGZJsCis9q94aUPVN4tRCFIfoxEi"
railway variables set RECAPTCHA_MIN_SCORE="0.5"
railway variables set USE_DUMMY_PAYMENT_GATEWAY="False"
railway variables set OPAYO_BASE_URL="https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages"
railway variables set OPAYO_VENDOR_NAME="sandboxEC"
railway variables set OPAYO_INTEGRATION_KEY="hJYxsw7HLbj40cB8udES8CDRFLhuJ8G54O6rDpUXvE6hYDrria"
railway variables set OPAYO_INTEGRATION_PASSWORD="o2iHSrFybYMZpmWOQMuhsXP52V4fBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5u"

echo "✓ All environment variables set!"
```

**Then generate secret key separately in PowerShell:**
```powershell
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
railway variables set DJANGO_SECRET_KEY=$SECRET_KEY
Write-Host "✓ Django secret key generated and set!" -ForegroundColor Green
```

---
