# Railway Environment Variables for Frontend

This document lists the environment variables that must be configured in Railway's frontend service settings.

## Why Environment Variables Instead of .env Files?

- **Security**: `.env` files should never be committed to git as they may contain sensitive configuration
- **Railway Best Practice**: Railway injects environment variables during build and runtime
- **Build-time Variables**: React requires `REACT_APP_*` variables to be available during `npm run build`

## Required Environment Variables

Set these in your Railway frontend service's **Variables** section:

### API Configuration

```bash
# Backend API Base URL (NO trailing slash)
REACT_APP_API_BASE_URL=https://admin3-backend-uat.up.railway.app

# API Endpoint Paths (WITH leading slash)
REACT_APP_API_AUTH_URL=/api/auth
REACT_APP_API_USER_URL=/api/users
REACT_APP_API_PRODUCT_URL=/api/products
REACT_APP_API_EXAM_SESSION_URL=/api/exam-sessions
REACT_APP_API_SUBJECT_URL=/api/subjects
REACT_APP_API_EXAM_SESSION_SUBJECT_URL=/api/exam-sessions-subjects
REACT_APP_API_CART_URL=/api/cart
REACT_APP_API_COUNTRIES_URL=/api/countries
REACT_APP_API_MARKING_URL=/api/markings
REACT_APP_API_TUTORIAL_URL=/api/tutorials
```

### Application Configuration

```bash
# Pagination
REACT_APP_API_PAGE_SIZE=20

# reCAPTCHA (Public keys - safe to expose)
REACT_APP_RECAPTCHA_SITE_KEY=6LdeGW0rAAAAAISTQLDxwgYbjbdYtIINQokRTMAi
REACT_APP_DISABLE_RECAPTCHA=false

# Environment
REACT_APP_ENVIRONMENT=uat

# Build Configuration
GENERATE_SOURCEMAP=false
HOST=0.0.0.0
```

## How Railway Injects Variables

1. **Build Time**: Railway injects `REACT_APP_*` variables during `npm run build`
   - These get baked into the production bundle
   - The build creates a static HTML/JS/CSS bundle

2. **Runtime**: The static bundle is served by `npx serve`
   - No additional environment variables needed at runtime
   - All API URLs are already in the compiled JavaScript

## Setting Variables in Railway

### Via Railway Dashboard:
1. Go to your frontend service
2. Click **Variables** tab
3. Click **+ New Variable**
4. Add each variable above
5. Deploy to apply changes

### Via Railway CLI:
```bash
railway variables set REACT_APP_API_BASE_URL=https://admin3-backend-uat.up.railway.app
railway variables set REACT_APP_API_AUTH_URL=/api/auth
# ... etc for all variables
```

## Important Notes

### URL Format
- **Base URL**: NO trailing slash
  - ✅ `https://admin3-backend-uat.up.railway.app`
  - ❌ `https://admin3-backend-uat.up.railway.app/`

- **Path URLs**: WITH leading slash
  - ✅ `/api/auth`
  - ❌ `api/auth`

This prevents double slashes when concatenated: `base + path = https://...app/api/auth`

### Build Process
The Railway build command in `railway.json`:
```json
"buildCommand": "npm install && CI=false npm run build"
```

- No `.env` file copying needed
- Railway automatically injects variables during build
- `CI=false` prevents treating warnings as errors

### Security
- Never commit `.env.uat` or any `.env.*` files with sensitive data
- `.env.uat` is in `.gitignore`
- Use Railway's Variables feature for all environment-specific config
- Only `REACT_APP_RECAPTCHA_SITE_KEY` is public (client-side key)
- Never put `RECAPTCHA_SECRET_KEY` in frontend variables (backend only!)

## Verifying Variables

After deployment, check the build logs for:
```
Creating optimized production build...
```

If variables are missing, you'll see:
```
'REACT_APP_API_BASE_URL' is not defined
```

## Local Development

For local development, keep your `.env.uat` file locally (ignored by git):

```bash
# frontend/react-Admin3/.env.uat
HOST=0.0.0.0
REACT_APP_API_BASE_URL=https://admin3-backend-uat.up.railway.app
# ... rest of variables
```

Run with:
```bash
npm start
# or
npm run start:uat  # Copies .env.uat to .env then starts
```
