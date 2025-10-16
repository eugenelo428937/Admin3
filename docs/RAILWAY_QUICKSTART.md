# Railway Deployment Quick Start Guide

## Prerequisites Checklist

- [x] Railway CLI installed and authenticated
- [x] Railway token configured in `.env` file
- [x] Git repository initialized
- [x] `uat` branch created and pushed to GitHub

## Option 1: Automated Deployment (Recommended)

Use the PowerShell deployment script for automated setup:

```powershell
# Full automated deployment (initialize + deploy + database setup)
.\scripts\deploy-to-railway.ps1 -Full

# Or run steps individually:
.\scripts\deploy-to-railway.ps1 -Init      # Initialize Railway project
.\scripts\deploy-to-railway.ps1 -Deploy    # Deploy services
.\scripts\deploy-to-railway.ps1 -SetupDB   # Run database migrations
```

**What the script does:**
1. Creates Railway project "admin3-uat"
2. Sets up PostgreSQL database
3. Deploys Django backend service
4. Deploys React frontend service
5. Configures environment variables
6. Sets up CORS between frontend and backend
7. Runs database migrations

**Estimated time:** 10-15 minutes

---

## Option 2: Manual Deployment

### Step 1: Initialize Railway Project (5 minutes)

```bash
# Create and link project
railway init --name admin3-uat

# Create UAT environment
railway environment create uat
railway environment uat

# Add PostgreSQL database
railway add --database postgresql
```

### Step 2: Deploy Backend Service (5-7 minutes)

```bash
# Navigate to backend
cd backend/django_Admin3

# Create and link backend service
railway service create admin3-backend
railway service admin3-backend

# Set environment variables
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
railway variables set DJANGO_ENV=uat
railway variables set DEBUG=False

# Generate Django secret key (PowerShell)
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
railway variables set DJANGO_SECRET_KEY=$SECRET_KEY

# Link database variables
railway variables set DATABASE_URL='${{admin3-postgres.DATABASE_URL}}'
railway variables set ALLOWED_HOSTS='${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}}'

# Deploy backend
railway up --detach

# Generate domain
railway domain generate
# Note the backend domain (e.g., admin3-backend-production.up.railway.app)
```

### Step 3: Deploy Frontend Service (3-5 minutes)

```bash
# Navigate to frontend
cd ../../frontend/react-Admin3

# Create and link frontend service
railway service create admin3-frontend
railway service admin3-frontend

# Set environment variables
railway variables set NODE_ENV=production
railway variables set REACT_APP_ENVIRONMENT=uat
railway variables set GENERATE_SOURCEMAP=false
railway variables set REACT_APP_API_URL='https://admin3-backend-production.up.railway.app'  # Use your backend domain
railway variables set REACT_APP_BACKEND_URL='https://admin3-backend-production.up.railway.app'

# Deploy frontend
railway up --detach

# Generate domain
railway domain generate
# Note the frontend domain (e.g., admin3-frontend-production.up.railway.app)
```

### Step 4: Update Backend CORS (2 minutes)

```bash
# Navigate back to backend
cd ../../backend/django_Admin3

# Switch to backend service
railway service admin3-backend

# Update CORS settings with frontend domain
railway variables set CORS_ALLOWED_ORIGINS='https://admin3-frontend-production.up.railway.app'  # Use your frontend domain
railway variables set CSRF_TRUSTED_ORIGINS='https://admin3-frontend-production.up.railway.app'
railway variables set FRONTEND_URL='https://admin3-frontend-production.up.railway.app'

# Redeploy backend
railway up --detach
```

### Step 5: Database Setup (3-5 minutes)

```bash
# Run migrations
railway run python manage.py migrate

# Create cache table
railway run python manage.py createcachetable

# Collect static files
railway run python manage.py collectstatic --noinput

# Create superuser (interactive)
railway run python manage.py createsuperuser
```

### Step 6: Verify Deployment (2 minutes)

```bash
# Check backend health
curl https://admin3-backend-production.up.railway.app/api/health/

# Expected response:
# {"status":"healthy","checks":{"database":"connected"},"environment":"uat","debug":false}

# View logs
railway logs --service admin3-backend
railway logs --service admin3-frontend
```

**Total estimated time:** 20-30 minutes

---

## Post-Deployment Tasks

### 1. Load Initial Data

```bash
cd backend/django_Admin3
railway service admin3-backend

# Import subjects
railway run python manage.py import_subjects

# Setup rules engine
railway run python manage.py shell < setup_tc_rules.py
```

### 2. Configure GitHub Auto-Deployment

1. Go to [railway.app](https://railway.app)
2. Select `admin3-uat` project
3. For **backend service**:
   - Click service → Settings → Source
   - Connect GitHub repository: `Admin3`
   - Set branch: `uat`
   - Set root directory: `backend/django_Admin3`
   - Enable auto-deploy on push

4. For **frontend service**:
   - Click service → Settings → Source
   - Connect GitHub repository: `Admin3`
   - Set branch: `uat`
   - Set root directory: `frontend/react-Admin3`
   - Enable auto-deploy on push

### 3. Create UAT Git Branch

```bash
# Create and push UAT branch
git checkout -b uat
git push -u origin uat

# Future deployments: just push to UAT
git add .
git commit -m "Update for UAT deployment"
git push origin uat  # Auto-deploys to Railway
```

---

## Testing Your Deployment

### Frontend Tests
1. Navigate to frontend URL
2. Test user registration flow
3. Test login/logout
4. Test shopping cart functionality
5. Test checkout process

### Backend Tests
```bash
# Health check
curl https://<backend-url>/api/health/

# API endpoints
curl https://<backend-url>/api/products/
curl https://<backend-url>/api/subjects/
```

### Database Tests
```bash
# Check database connectivity
railway run --service admin3-backend python manage.py dbshell

# Run Django check
railway run --service admin3-backend python manage.py check
```

---

## Troubleshooting

### Issue: Build fails with "Module not found"

**Solution:**
```bash
# Verify requirements.txt includes all dependencies
railway run --service admin3-backend pip list

# Force rebuild
railway up --force
```

### Issue: Database connection fails

**Solution:**
```bash
# Check DATABASE_URL is set
railway variables --service admin3-backend | grep DATABASE

# Verify PostgreSQL service is running
railway status --service admin3-postgres
```

### Issue: CORS errors in browser

**Solution:**
```bash
# Verify CORS settings
railway variables --service admin3-backend | grep CORS

# Ensure frontend domain is in CORS_ALLOWED_ORIGINS
railway variables set CORS_ALLOWED_ORIGINS='https://<frontend-domain>'
```

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check service logs
railway logs --service admin3-backend --follow

# Restart service
railway restart --service admin3-backend
```

---

## Monitoring & Maintenance

### View Logs
```bash
# Real-time logs
railway logs --service admin3-backend --follow
railway logs --service admin3-frontend --follow

# Last 100 lines
railway logs --service admin3-backend --lines 100
```

### Check Service Status
```bash
railway status
railway status --service admin3-backend
```

### Restart Services
```bash
railway restart --service admin3-backend
railway restart --service admin3-frontend
```

### Rollback Deployment
```bash
# Rollback to previous deployment
railway rollback --service admin3-backend

# Or revert via Git
git checkout uat
git revert HEAD
git push origin uat
```

---

## Cost Monitoring

### Current Resources (Minimal Traffic)
- PostgreSQL: 512MB RAM, 1GB storage (~$2-3/month)
- Backend: 512MB RAM, 0.5 vCPU (~$3-5/month)
- Frontend: 512MB RAM, 0.5 vCPU (~$2-3/month)

**Estimated Total:** $7-11/month on Hobby Plan ($5 credit)

### Cost Optimization Tips
1. Enable auto-sleep for inactive services
2. Monitor usage via Railway dashboard
3. Upgrade to Pro Plan ($20/month) only if needed

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| View all services | `railway service` |
| Switch environment | `railway environment uat` |
| View variables | `railway variables` |
| Set variable | `railway variables set KEY=value` |
| Deploy | `railway up` |
| View logs | `railway logs --follow` |
| Restart service | `railway restart` |
| Generate domain | `railway domain generate` |
| Run Django command | `railway run python manage.py <command>` |

---

## Next Steps

1. ✅ Complete deployment using automated script or manual steps
2. ✅ Verify all services are running
3. ✅ Test frontend and backend functionality
4. ✅ Configure GitHub auto-deployment
5. ✅ Set up monitoring and alerts
6. 📋 Document UAT testing procedures
7. 📋 Plan production deployment strategy

---

## Support & Resources

- **Railway Docs**: https://docs.railway.com
- **Railway Dashboard**: https://railway.app
- **Project Documentation**: `docs/railway-deployment-architecture.md`
- **Deployment Script**: `scripts/deploy-to-railway.ps1`

---

**Happy Deploying! 🚀**
