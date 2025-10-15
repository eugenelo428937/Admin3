# Manual Railway Deployment Steps

Follow these commands in order. Each section should be run in sequence.

## Step 1: Initialize Railway Project (5 minutes)

```bash
# Initialize project (will prompt for project name - type "admin3-uat")
railway init

# When prompted:
# - Project Name: admin3-uat
# - Workspace: Select "Eugene Lo's Projects"
# - Start with empty project: Yes
```

## Step 2: Setup Database (2 minutes)

```bash
# Add PostgreSQL database
railway add

# When prompted, select: PostgreSQL

# Verify database was added
railway status
```

## Step 3: Deploy Backend Service (10 minutes)

```bash
# Navigate to backend directory
cd backend/django_Admin3

# Link Railway project
railway link

# When prompted, select: admin3-uat

# Create UAT environment
railway environment

# Select: Create new environment
# Name: uat

# Add PostgreSQL to UAT environment (follow prompts)

# Set environment variables
railway variables set DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
railway variables set DJANGO_ENV=uat
railway variables set DEBUG=False

# Generate Django secret key (run in PowerShell)
# PowerShell command:
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
railway variables set DJANGO_SECRET_KEY=$SECRET_KEY

# Set database connection (Railway auto-provides these)
railway variables set ALLOWED_HOSTS='${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}}'

# Add your external API credentials
railway variables set ADMINISTRATE_INSTANCE_URL="<from-your-.env>"
railway variables set ADMINISTRATE_API_URL="<from-your-.env>"
railway variables set ADMINISTRATE_API_KEY="<from-your-.env>"
railway variables set ADMINISTRATE_API_SECRET="<from-your-.env>"
railway variables set ADMINISTRATE_REST_API_URL="<from-your-.env>"
railway variables set GETADDRESS_API_KEY="<from-your-.env>"
railway variables set GETADDRESS_ADMIN_KEY="<from-your-.env>"

# Set email configuration
railway variables set EMAIL_HOST_USER="<from-your-.env>"
railway variables set EMAIL_HOST_PASSWORD="<from-your-.env>"
railway variables set DEFAULT_FROM_EMAIL="noreply@acted.com"

# Deploy backend
railway up

# This will build and deploy - takes ~5-7 minutes
# Watch the logs to ensure it completes successfully

# Once deployed, generate a public domain
railway domain

# Note the backend URL (e.g., admin3-uat-production-xxxx.up.railway.app)
```

## Step 4: Deploy Frontend Service (7 minutes)

```bash
# Navigate to frontend directory
cd ../../frontend/react-Admin3

# Link to same Railway project
railway link

# Select: admin3-uat
# Environment: uat

# Set frontend environment variables
railway variables set NODE_ENV=production
railway variables set REACT_APP_ENVIRONMENT=uat
railway variables set GENERATE_SOURCEMAP=false

# Set backend URL (use the domain from Step 3)
railway variables set REACT_APP_API_URL="https://<backend-domain-from-step-3>"
railway variables set REACT_APP_BACKEND_URL="https://<backend-domain-from-step-3>"

# Deploy frontend
railway up

# This will build and deploy - takes ~3-5 minutes

# Generate frontend domain
railway domain

# Note the frontend URL
```

## Step 5: Update Backend CORS (3 minutes)

```bash
# Navigate back to backend
cd ../../backend/django_Admin3

# Set CORS to allow frontend domain
railway variables set CORS_ALLOWED_ORIGINS="https://<frontend-domain-from-step-4>"
railway variables set CSRF_TRUSTED_ORIGINS="https://<frontend-domain-from-step-4>"
railway variables set FRONTEND_URL="https://<frontend-domain-from-step-4>"

# Redeploy backend with new CORS settings
railway up
```

## Step 6: Setup Database (5 minutes)

```bash
# Still in backend/django_Admin3

# Run migrations
railway run python manage.py migrate

# Create cache table
railway run python manage.py createcachetable

# Collect static files
railway run python manage.py collectstatic --noinput

# Create superuser (interactive)
railway run python manage.py createsuperuser

# When prompted, enter:
# - Username: admin
# - Email: your-email@example.com
# - Password: (strong password)
```

## Step 7: Verify Deployment (2 minutes)

```bash
# Test backend health
curl https://<backend-domain>/api/health/

# Expected response:
# {"status":"healthy","checks":{"database":"connected"},"environment":"uat","debug":false}

# View backend logs
railway logs

# Open frontend in browser
start https://<frontend-domain>
```

## Step 8: Configure GitHub Auto-Deployment (Via Railway Dashboard)

1. Go to https://railway.app
2. Login and select "admin3-uat" project
3. Select "uat" environment

### For Backend Service:
1. Click on the backend service
2. Go to Settings → Source
3. Click "Connect Repo"
4. Select repository: "Admin3"
5. Branch: `uat`
6. Root Directory: `backend/django_Admin3`
7. Click "Deploy Now"
8. Enable "Auto Deploy": ON

### For Frontend Service:
1. Click on the frontend service
2. Go to Settings → Source
3. Click "Connect Repo"
4. Select repository: "Admin3"
5. Branch: `uat`
6. Root Directory: `frontend/react-Admin3`
7. Click "Deploy Now"
8. Enable "Auto Deploy": ON

---

## Estimated Total Time: 30-40 minutes

## Your URLs

After completion, save these:
- **Backend**: https://<your-backend-domain>
- **Frontend**: https://<your-frontend-domain>
- **Admin Panel**: https://<your-backend-domain>/admin/

## Testing Checklist

- [ ] Health endpoint returns healthy status
- [ ] Frontend loads successfully
- [ ] Can log in to admin panel
- [ ] Can register new user
- [ ] Can view products
- [ ] Shopping cart functionality works
- [ ] No CORS errors in browser console

---

## Troubleshooting

### Build fails
```bash
# View detailed logs
railway logs --follow

# Check build output
railway logs | grep ERROR
```

### Database connection fails
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE

# Check PostgreSQL service status
railway status
```

### CORS errors
```bash
# Verify CORS settings
railway variables | grep CORS

# Ensure frontend domain is in CORS_ALLOWED_ORIGINS
```

---

## Future Deployments

Once GitHub auto-deployment is configured, just push to the `uat` branch:

```bash
git checkout uat
git add .
git commit -m "Your commit message"
git push origin uat

# Railway will automatically deploy!
```

---

Good luck with your deployment! 🚀
