# Frontend 502 Bad Gateway Troubleshooting

## Problem
Accessing https://admin3-frontend-uat.up.railway.app/ returns **502 Bad Gateway**

## What 502 Means
- The Railway proxy received the request
- But the application container isn't responding properly
- Either the app crashed, isn't listening on the correct port, or failed to start

## Diagnostic Steps

### Step 1: Check Deployment Logs

Run the diagnostic script:
```powershell
.\check-frontend-deployment.ps1
```

Or manually:
```powershell
cd frontend/react-Admin3
railway logs --service admin3-frontend
```

### Step 2: Look for These Common Issues

#### A. Build Failed
**Logs show:**
```
Failed to compile.
ERROR: failed to build
```

**Fix:** We already addressed this with `CI=false` in the build command. If you still see this, there might be actual syntax errors in the code.

#### B. Serve Not Found
**Logs show:**
```
npx: command not found
serve: command not found
```

**Fix:** The `serve` package should be installed. Check package.json has:
```json
"serve": "^14.2.4"
```

#### C. Build Directory Missing
**Logs show:**
```
ERROR: "build" directory not found
serve: ENOENT: no such file or directory
```

**Fix:** Build failed silently. Check build logs for errors.

#### D. Port Binding Issue
**Logs show:**
```
ERROR: Port 3000 is already in use
ERROR: Address already in use
```

**Fix:** Remove manual PORT environment variable (Railway sets it automatically)

#### E. Missing Environment Variables
**Logs show:**
```
Cannot find module
Reference Error: process.env.REACT_APP_API_URL is not defined
```

**Fix:** Set required REACT_APP_* variables in Railway dashboard

### Step 3: Check Railway Configuration

#### Verify No Manual PORT Variable
1. Railway Dashboard → admin3-frontend → Variables
2. **DELETE** any `PORT` variable if it exists
3. Railway sets `$PORT` automatically

#### Verify Public Networking
1. Railway Dashboard → admin3-frontend → Settings → Networking
2. Should show domain without port specification
3. Railway handles port mapping automatically

### Step 4: Check Environment Variables

Required variables for frontend:
```bash
REACT_APP_API_URL = https://admin3-backend-uat.up.railway.app/api
REACT_APP_ENVIRONMENT = uat
REACT_APP_RECAPTCHA_SITE_KEY = <your-key>
```

**Important:** Use the **public backend domain** (`.up.railway.app`), not `.railway.internal`

### Step 5: Test Build Locally

```powershell
cd frontend/react-Admin3

# Clean install
rm -rf node_modules build
npm install

# Test build
CI=false npm run build

# Test serve locally
npx serve -s build -l 3000
```

If this works locally but not on Railway, it's likely a Railway configuration issue.

## Solutions Applied

### 1. Improved railway.json
```json
{
  "startCommand": "npx serve -s build -l $PORT --no-clipboard --no-port-switching",
  "healthcheckTimeout": 60,
  "initialDelaySeconds": 10
}
```

**Changes:**
- Added `--no-clipboard --no-port-switching` flags to prevent serve from trying to change ports
- Increased health check timeout to 60 seconds
- Added 10-second initial delay before health checks

### 2. Node 20 Configuration
- `.nvmrc`: Specifies Node 20.18.0
- `nixpacks.toml`: Configures Nixpacks for Node 20
- `package.json`: Engine requirements

### 3. CI=false for Build
Prevents ESLint warnings from failing the build

## Common Fixes

### Fix 1: Remove PORT Variable
```powershell
# Check current variables
cd frontend/react-Admin3
railway variables --service admin3-frontend

# If PORT exists, remove it via Railway Dashboard
```

### Fix 2: Check Build Succeeded
```powershell
# View full logs including build phase
railway logs --service admin3-frontend
```

Look for:
```
✅ npm install
✅ CI=false npm run build
✅ Compiled successfully!
```

### Fix 3: Verify Start Command
```powershell
# Check what command is actually running
railway logs --service admin3-frontend | grep "Starting"
```

Should see:
```
npx serve -s build -l $PORT --no-clipboard --no-port-switching
```

### Fix 4: Restart Deployment
```powershell
cd frontend/react-Admin3
railway up --service admin3-frontend
```

## Verification Checklist

After applying fixes:
- [ ] Build logs show "Compiled successfully!"
- [ ] No PORT variable in environment variables
- [ ] Start command includes `$PORT`
- [ ] Logs show "Accepting connections at http://0.0.0.0:XXXX"
- [ ] No crash errors in logs
- [ ] Health check passes
- [ ] https://admin3-frontend-uat.up.railway.app/ returns 200 OK

## Still Not Working?

### Check Specific Error in Logs

**Error: "Cannot find build directory"**
```powershell
# Verify build is creating the build folder
npm run build
ls build  # Should show index.html and static folder
```

**Error: "Module not found"**
```
# Missing dependencies - reinstall
npm install
```

**Error: "EADDRINUSE"**
```
# Port conflict - remove PORT variable
# Railway will assign port automatically
```

### Enable Debug Mode

Temporarily modify start command to see more output:
```json
"startCommand": "ls -la && ls -la build && npx serve -s build -l $PORT --debug"
```

This will:
1. List files in root directory
2. List files in build directory
3. Run serve with debug output

### Check Railway Service Logs in Dashboard

1. Go to Railway Dashboard
2. Click admin3-frontend service
3. Click "Deployments" tab
4. Click latest deployment
5. View full deployment logs

Look for:
- Build phase: Should show "Compiled successfully!"
- Deploy phase: Should show serve starting
- Runtime: Should show HTTP server accepting connections

## Quick Test Commands

```powershell
# Test locally first
cd frontend/react-Admin3
npm install
CI=false npm run build
npx serve -s build -l 3000

# If local works, then test on Railway
railway logs --service admin3-frontend

# Force redeploy
railway up --service admin3-frontend
```

## Contact Information

If none of these fixes work, share:
1. Complete Railway deployment logs
2. Output of `railway variables --service admin3-frontend`
3. Output of local build test
4. Screenshot of Railway dashboard showing deployment status
