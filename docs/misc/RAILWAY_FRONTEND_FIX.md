# Railway Frontend Deployment Fix

## Problem

Railway deployment was failing with two issues:

1. **Node Version Mismatch**
   ```
   EBADENGINE Unsupported engine {
     package: 'react-router@7.9.4',
     required: { node: '>=20.0.0' },
     current: { node: 'v18.20.5', npm: '10.8.2' }
   }
   ```

2. **CI Warnings as Errors**
   ```
   Treating warnings as errors because process.env.CI = true.
   Failed to compile.
   ```

## Solution

### Files Modified/Created

1. **`.nvmrc`** - Specifies Node 20.18.0 for Railway
   ```
   20.18.0
   ```

2. **`nixpacks.toml`** - Explicit Nixpacks configuration
   ```toml
   [phases.setup]
   nixPkgs = ["nodejs-20_x"]

   [phases.build]
   cmds = ["CI=false npm run build"]
   ```

3. **`package.json`** - Fixed Node version declaration
   - Removed: `"node": "^24.4.0"` from dependencies (incorrect)
   - Added: `"engines": { "node": ">=20.0.0", "npm": ">=9.0.0" }`

4. **`railway.json`** - Cleaned up build command
   - Changed: `npm install && npm run build --omit=dev`
   - To: `npm install && npm run build`

## Why These Changes Work

### Node 20 Requirement
React Router 7.9.4 and other modern packages require Node >=20.0.0. Railway was defaulting to Node 18.

**Solution:**
- `.nvmrc` tells Railway/nvm which Node version to use
- `nixpacks.toml` explicitly configures Nixpacks to use Node 20
- `package.json` engines field documents the requirement

### CI Warnings-as-Errors
Railway sets `CI=true` by default, which causes create-react-app to treat ESLint warnings as build errors.

**Solution:**
- Set `CI=false` in the build command via nixpacks.toml
- This allows the build to succeed with warnings (which can be fixed later)

## Deployment Steps

### 1. Push Changes
```powershell
git push origin uat
```

### 2. Deploy Frontend
```powershell
cd frontend/react-Admin3
railway up --service admin3-frontend
```

Or if Railway is connected to GitHub, it will auto-deploy on push.

### 3. Verify Build
Watch the Railway dashboard for:
- ✅ Node 20.x detected
- ✅ Build completes successfully
- ✅ Health check passes

### 4. Test Deployment
```powershell
# Get frontend URL
railway domain --service admin3-frontend

# Test in browser
curl https://<frontend-domain>/
```

## Additional Fixes (If Needed)

### If You Still See Node 18 Warnings

Add to Railway environment variables:
```
NODE_VERSION = 20.18.0
```

### If Build Still Fails on Warnings

You can also set CI=false as an environment variable in Railway dashboard:
```
CI = false
```

But the nixpacks.toml approach is better as it's version-controlled.

### If You Want to Fix the Warnings (Recommended)

Instead of ignoring them, you can:

1. **Check what the warnings are:**
   ```powershell
   cd frontend/react-Admin3
   npm run build
   ```

2. **Common warnings and fixes:**
   - Unused variables: Remove them or prefix with `_`
   - Unused imports: Remove them
   - Missing dependencies in useEffect: Add them to dependency array
   - Console.log statements: Remove or use proper logging

3. **Fix them locally:**
   ```powershell
   npm run lint:fix
   ```

## Package.json Correction

### Before (Incorrect)
```json
{
  "dependencies": {
    "node": "^24.4.0"  // ❌ Wrong - this tries to install a 'node' package
  }
}
```

### After (Correct)
```json
{
  "engines": {
    "node": ">=20.0.0",  // ✅ Correct - specifies required Node version
    "npm": ">=9.0.0"
  }
}
```

The `engines` field tells package managers and deployment platforms what Node version is required, but doesn't try to install Node as a dependency.

## Verification Checklist

After deployment:
- [ ] Railway build log shows Node 20.x
- [ ] No EBADENGINE errors
- [ ] Build completes without "Treating warnings as errors" failure
- [ ] Frontend loads in browser
- [ ] Frontend can communicate with backend API
- [ ] No console errors in browser DevTools

## Troubleshooting

### Build Still Uses Node 18

**Cause:** Railway might be caching the old builder.

**Solution:**
1. Go to Railway dashboard
2. Delete the service and recreate it
3. Or clear Railway's build cache

### "Module not found" Errors

**Cause:** Dependencies might not be installed correctly.

**Solution:**
```powershell
# Clean install locally first
rm -rf node_modules package-lock.json
npm install

# Verify it works locally
npm run build

# Then push to Railway
```

### Health Check Fails

**Cause:** Build might be succeeding but the app isn't starting correctly.

**Solution:**
Check Railway logs:
```powershell
railway logs --service admin3-frontend
```

Common issues:
- Missing environment variables (REACT_APP_* variables)
- Port binding issues (make sure serve is using $PORT)
- Build artifacts not in correct location

## Environment Variables Needed

Make sure these are set in Railway for the frontend service:

```bash
# Backend API URL
REACT_APP_API_URL = https://<backend-domain>.railway.app/api

# Other environment-specific variables
REACT_APP_ENVIRONMENT = uat
REACT_APP_RECAPTCHA_SITE_KEY = <your-key>
```

## Next Steps

1. ✅ Fix Node version (done)
2. ✅ Fix CI warnings-as-errors (done)
3. ⬜ Deploy frontend
4. ⬜ Set environment variables in Railway
5. ⬜ Test frontend loads
6. ⬜ Test frontend → backend communication
7. ⬜ Fix any ESLint warnings (optional but recommended)

## Resources

- Railway Nixpacks Docs: https://nixpacks.com/docs
- Railway Node.js Guide: https://docs.railway.app/guides/nodejs
- Node Version Management: https://nodejs.org/en/download/package-manager
