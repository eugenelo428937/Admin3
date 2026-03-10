# CRA → Vite Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the React frontend from Create React App (react-scripts) to Vite for faster dev startup (~1-5s vs 30-60s), faster production builds (~20-40s vs 60-120s), and smaller node_modules footprint.

**Architecture:** Replace react-scripts with Vite as the dev server and build tool. Replace Jest with Vitest for testing (already partially present). Keep Storybook but switch its builder from webpack5 to Vite. Update all CRA-specific patterns (env vars, asset loading, HTML template). Update Docker multi-stage build.

**Tech Stack:** Vite 7.x (already installed), Vitest, @vitejs/plugin-react, ESLint flat config

**Vercel Best Practices Applied:**
- `bundle-barrel-imports`: Direct imports, avoid barrel files
- `bundle-dynamic-imports`: Vite's native code splitting via dynamic imports
- `bundle-defer-third-party`: Load analytics after hydration
- `async-parallel`: Vite's parallel dependency pre-bundling

---

## Phase 1: Core Vite Setup (no breaking changes)

### Task 1: Create vite.config.js

**Files:**
- Create: `frontend/react-Admin3/vite.config.js`

**Step 1: Create the Vite configuration file**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Match CRA's baseUrl: "src" from tsconfig.json
      src: path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build', // Match CRA's output dir (used by Docker)
    sourcemap: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Sass options if needed
      },
    },
  },
});
```

**Step 2: Install @vitejs/plugin-react**

Run: `cd frontend/react-Admin3 && npm install --save-dev @vitejs/plugin-react`

**Step 3: Commit**

```bash
git add frontend/react-Admin3/vite.config.js frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json
git commit -m "feat: add vite.config.js for CRA-to-Vite migration"
```

---

### Task 2: Create index.html for Vite (move from public/)

**Files:**
- Create: `frontend/react-Admin3/index.html`
- Reference: `frontend/react-Admin3/public/index.html`

Vite expects `index.html` at the project root (not in `public/`). The public/index.html will remain for CRA until we fully switch.

**Step 1: Create root index.html for Vite**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="ActEd Online Store" />
    <link rel="apple-touch-icon" href="/logo192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>ActEd Online Store</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

**Key differences from CRA's public/index.html:**
- No `%PUBLIC_URL%` — Vite serves public assets from `/` automatically
- Added `<script type="module" src="/src/index.js">` — Vite's entry point
- Moved to project root (Vite requirement)

**Step 2: Commit**

```bash
git add frontend/react-Admin3/index.html
git commit -m "feat: add root index.html for Vite entry point"
```

---

### Task 3: Rename environment variables (REACT_APP_ → VITE_)

**Files to modify:**
- `frontend/react-Admin3/.env`
- `frontend/react-Admin3/.env.development.local`
- `frontend/react-Admin3/.env.production`
- `frontend/react-Admin3/.env.staging`
- `frontend/react-Admin3/.env.uat`

**Step 1: Rename all REACT_APP_ prefixes to VITE_ in every .env file**

Find-and-replace in each file:
- `REACT_APP_` → `VITE_`

Remove CRA-specific variables that have no Vite equivalent:
- `SKIP_PREFLIGHT_CHECK=true` (CRA only)
- `DISABLE_ESLINT_PLUGIN=true` (CRA only — Vite uses vite-plugin-eslint if needed)
- `FAST_REFRESH=true` (CRA only — Vite has HMR built-in)
- `GENERATE_SOURCEMAP=false` (CRA only — use vite.config.js `build.sourcemap`)

Keep `HOST=0.0.0.0` but move to vite.config.js `server.host` instead.

**Step 2: Commit**

```bash
git add frontend/react-Admin3/.env*
git commit -m "feat: rename REACT_APP_ env vars to VITE_ for Vite migration"
```

---

### Task 4: Update source code to use import.meta.env

**Files to modify (24+ occurrences across these files):**

| File | Changes |
|------|---------|
| `src/config.js` (lines 4-40) | `process.env.REACT_APP_*` → `import.meta.env.VITE_*` |
| `src/config.js` (line 38) | `process.env.NODE_ENV` → `import.meta.env.MODE` |
| `src/App.js` (line 102) | `process.env.REACT_APP_RECAPTCHA_SITE_KEY` → `import.meta.env.VITE_RECAPTCHA_SITE_KEY` |
| `src/components/User/ForgotPasswordForm.js` (lines 46-47) | `process.env.REACT_APP_DISABLE_RECAPTCHA` → `import.meta.env.VITE_DISABLE_RECAPTCHA` |
| `src/components/Ordering/CheckoutSteps.js` (lines 109, 111) | Both REACT_APP and NODE_ENV references |
| `src/pages/Home.js` (lines 44-48, 84, 102) | `process.env.PUBLIC_URL` → `""` (empty string, Vite serves from root) |

**Step 1: Update src/config.js**

Replace all `process.env.REACT_APP_` with `import.meta.env.VITE_`.
Replace `process.env.NODE_ENV` with `import.meta.env.MODE`.

**Step 2: Update all remaining source files with process.env.NODE_ENV**

For each file listed in the analysis, replace:
- `process.env.NODE_ENV === 'development'` → `import.meta.env.DEV`
- `process.env.NODE_ENV === 'production'` → `import.meta.env.PROD`
- `process.env.NODE_ENV !== 'production'` → `!import.meta.env.PROD`
- `process.env.NODE_ENV !== 'development'` → `!import.meta.env.DEV`

**Files with NODE_ENV (18 occurrences):**
- `src/config/performanceBudgets.js` (lines 136, 152, 158)
- `src/components/ErrorBoundary.js` (line 28)
- `src/components/Ordering/CheckoutSteps.js` (lines 109, 329)
- `src/components/Product/FilterDebugger.js` (line 10)
- `src/components/Product/ProductList.js` (lines 259, 277)
- `src/components/User/ForgotPasswordForm.js` (line 46)
- `src/hooks/useProductsSearch.js` (line 167)
- `src/pages/Home.js` (lines 84, 102)
- `src/services/errorTrackingService.js` (line 5)
- `src/services/httpService.js` (line 35)
- `src/services/loggerService.js` (lines 11, 16)
- `src/store/filters/filterRegistry.js` (lines 95, 137)
- `src/store/filters/filterValidator.js` (line 60)
- `src/store/middleware/urlSyncMiddleware.js` (line 203)
- `src/utils/PerformanceTracker.js` (line 310)
- `src/utils/rulesEngineUtils.js` (line 242)

**Step 3: Update PUBLIC_URL usage**

In `src/pages/Home.js`:
```javascript
// Before:
const backgroundVideo = `${process.env.PUBLIC_URL}/video/12595751_2560_1440_30fps.mp4`;

// After:
const backgroundVideo = `/video/12595751_2560_1440_30fps.mp4`;
```

**Step 4: Convert require() to ES6 import**

In `src/components/Navigation/NavbarBrand.js`:
```javascript
// Before (lines 27, 39):
src={require("../../assets/ActEdlogo-S.png")}

// After — add import at top of file:
import actEdLogo from "../../assets/ActEdlogo-S.png";
// Then use: src={actEdLogo}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate process.env to import.meta.env for Vite compatibility"
```

---

## Phase 2: Testing Migration (Jest → Vitest)

### Task 5: Configure Vitest

**Files:**
- Create: `frontend/react-Admin3/vitest.config.js`
- Modify: `frontend/react-Admin3/package.json`

**Step 1: Install Vitest and related packages**

```bash
cd frontend/react-Admin3
npm install --save-dev vitest @vitest/coverage-v8 jsdom identity-obj-proxy
```

Note: `@vitest/mocker` is already installed.

**Step 2: Create vitest.config.js**

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/test-utils/**',
        'src/misc/**',
        'src/**/*.examples.{js,jsx}',
        'src/index.js',
        'src/reportWebVitals.js',
        'src/setupTests.js',
        'src/components/sandbox/**',
        'src/components/styleguide/**',
        'src/components/Test/**',
        'src/components/Testing/**',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
      reporter: ['text', 'text-summary', 'lcov', 'html'],
    },
    // Match CRA's transformIgnorePatterns behavior
    deps: {
      inline: [
        '@reduxjs/toolkit',
        '@standard-schema',
        'msw',
        '@mswjs',
        'axios',
        'react-router',
        'react-router-dom',
      ],
    },
  },
});
```

**Step 3: Commit**

```bash
git add frontend/react-Admin3/vitest.config.js frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json
git commit -m "feat: add vitest.config.js for test migration"
```

---

### Task 6: Migrate setupTests.js from Jest to Vitest

**Files:**
- Modify: `frontend/react-Admin3/src/setupTests.js`

**Step 1: Replace Jest globals with Vitest imports**

At the top of setupTests.js, add:
```javascript
import { vi } from 'vitest';
import '@testing-library/jest-dom';
```

**Step 2: Replace all jest.fn() → vi.fn(), jest.mock() → vi.mock()**

Global find-and-replace within setupTests.js:
- `jest.fn(` → `vi.fn(`
- `jest.mock(` → `vi.mock(`
- `jest.spyOn(` → `vi.spyOn(`
- `jest.requireActual(` → `await vi.importActual(`

**Important:** `vi.mock()` calls are hoisted automatically in Vitest (like jest.mock), but `vi.importActual()` returns a Promise, so use `await`.

**Step 3: Run a smoke test**

```bash
npx vitest run --reporter=verbose 2>&1 | head -50
```

Expected: Some tests pass, some may need individual fixes (Task 7).

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/setupTests.js
git commit -m "feat: migrate setupTests.js from Jest to Vitest"
```

---

### Task 7: Fix individual test files (batch approach)

**Files:**
- All files in `src/**/*.test.js` and `src/**/__tests__/*.test.js`

**Step 1: Global find-and-replace across all test files**

```bash
# In all .test.js files, replace:
jest.fn(     →  vi.fn(
jest.mock(   →  vi.mock(
jest.spyOn(  →  vi.spyOn(
jest.clearAllMocks()  →  vi.clearAllMocks()
jest.resetAllMocks()  →  vi.resetAllMocks()
jest.restoreAllMocks() → vi.restoreAllMocks()
jest.useFakeTimers()  →  vi.useFakeTimers()
jest.useRealTimers()  →  vi.useRealTimers()
jest.advanceTimersByTime(  →  vi.advanceTimersByTime(
jest.runAllTimers()   →  vi.runAllTimers()
```

**Step 2: Add vi import to each test file that uses mocking**

Each test file that calls `vi.fn()`, `vi.mock()`, etc. needs:
```javascript
import { vi } from 'vitest';
```

If `vitest.config.js` has `globals: true`, `describe`, `it`, `expect`, `beforeEach`, `afterEach` are available globally without import. But `vi` must still be imported.

**Step 3: Handle jest.requireActual → vi.importActual**

This is the trickiest change. `vi.importActual()` is async:

```javascript
// Before (Jest):
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// After (Vitest):
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});
```

**Step 4: Run full test suite**

```bash
npx vitest run 2>&1 | tail -20
```

Fix any remaining failures iteratively.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate all test files from Jest to Vitest"
```

---

## Phase 3: Package.json & Cleanup

### Task 8: Update package.json scripts and dependencies

**Files:**
- Modify: `frontend/react-Admin3/package.json`

**Step 1: Update scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "start:uat": "copy .env.uat .env && vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:pact": "vitest run --config vitest.pact.config.js",
    "lint": "eslint --no-cache src",
    "lint:fix": "eslint --no-cache --fix src",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

**Step 2: Remove CRA dependencies**

```bash
npm uninstall react-scripts @storybook/preset-create-react-app @storybook/react-webpack5
```

**Step 3: Install Vite Storybook framework**

```bash
npm install --save-dev @storybook/react-vite
```

**Step 4: Remove CRA-specific config from package.json**

Remove these sections:
- `eslintConfig` block (use .eslintrc.json instead — already exists)
- `browserslist` block (Vite uses its own browser targets)
- `jest` block (replaced by vitest.config.js)

**Step 5: Remove unused CRA-related packages**

```bash
npm uninstall @babel/core @babel/plugin-transform-runtime @babel/preset-env @babel/preset-react webpack eslint-plugin-storybook
```

Note: Keep `sass` (used for SCSS), keep `@types/jest` if needed for type hints.

**Step 6: Commit**

```bash
git add frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json
git commit -m "feat: replace react-scripts with vite in package.json"
```

---

### Task 9: Update Storybook config for Vite

**Files:**
- Modify: `frontend/react-Admin3/.storybook/main.js`

**Step 1: Update framework and remove CRA preset**

```javascript
const config = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "storybook-design-token"
  ],
  framework: "@storybook/react-vite",
  staticDirs: ["../public"]
};

export default config;
```

**Key changes:**
- Remove `@storybook/preset-create-react-app` from addons
- Change `@storybook/react-webpack5` → `@storybook/react-vite`
- Fix staticDirs path (forward slashes)
- Use ESM export

**Step 2: Commit**

```bash
git add frontend/react-Admin3/.storybook/main.js
git commit -m "feat: update storybook to use vite framework"
```

---

### Task 10: Clean up CRA artifacts

**Files:**
- Remove: `frontend/react-Admin3/.babelrc` (Vite uses esbuild/SWC, not Babel)
- Keep: `frontend/react-Admin3/jest.config.js` (for Pact tests if still needed, else remove)
- Keep: `frontend/react-Admin3/tsconfig.json` (Vite uses it for path resolution)
- Keep: `frontend/react-Admin3/public/index.html` → DELETE (replaced by root index.html)

**Step 1: Remove .babelrc**

```bash
rm frontend/react-Admin3/.babelrc
```

**Step 2: Decide on jest.config.js**

If Pact tests (`test:pact`) have been migrated to vitest, remove jest.config.js.
If Pact tests still need Jest, keep jest.config.js but rename script to clarify.

**Step 3: Remove eject script reference**

The `eject` script in package.json is CRA-only. Remove it.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove CRA artifacts (.babelrc, eject script, public/index.html)"
```

---

## Phase 4: Docker Build Update

### Task 11: Update Nginx Dockerfile for Vite

**Files:**
- Modify: `nginx/Dockerfile`

**Step 1: Update the frontend build stage**

```dockerfile
# ── Stage 1: Build React frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install dependencies first (layer caching)
COPY frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json ./
RUN npm ci --silent

# Copy source, config, and staging env
COPY frontend/react-Admin3/ ./
COPY frontend/react-Admin3/.env.staging .env.production

# Build for production (Vite reads .env.production)
RUN npm run build
```

**Step 2: Update the copy from build output**

```dockerfile
# Vite outputs to 'build' dir (configured in vite.config.js)
COPY --from=frontend-build /app/build /usr/share/nginx/html
```

**Key changes:**
- Removed `CI=false` (CRA-specific flag to suppress warnings-as-errors)
- Renamed `.env.staging` → `.env.production` (not `.env.production.local` — Vite's env file loading uses `.env.production` for production mode)
- Build output stays in `build/` (configured in vite.config.js)

**Step 3: Commit**

```bash
git add nginx/Dockerfile
git commit -m "feat: update Dockerfile for Vite build process"
```

---

## Phase 5: Verification

### Task 12: Verify local dev server

**Step 1: Start Vite dev server**

```bash
cd frontend/react-Admin3
npm run dev
```

**Expected:** Server starts in < 5 seconds on http://localhost:3000

**Step 2: Verify HMR works**

Edit any component, confirm hot reload happens instantly (< 1 second).

**Step 3: Test environment variables**

Open browser console, verify API calls go to the correct backend URL.

---

### Task 13: Verify production build

**Step 1: Run production build**

```bash
cd frontend/react-Admin3
npm run build
```

**Expected:** Build completes in < 30 seconds, outputs to `build/` directory.

**Step 2: Preview production build**

```bash
npm run preview
```

Navigate to http://localhost:4173 and verify the app works.

---

### Task 14: Verify Docker build

**Step 1: Build Docker image**

```bash
docker compose build nginx
```

**Expected:** Build succeeds, frontend stage completes with Vite.

**Step 2: Run full stack**

```bash
docker compose up
```

**Expected:** App accessible at configured port, API calls work through Nginx proxy.

---

### Task 15: Verify test suite

**Step 1: Run full test suite**

```bash
cd frontend/react-Admin3
npm test
```

**Expected:** All tests pass with Vitest.

**Step 2: Run coverage**

```bash
npm run test:coverage
```

**Expected:** Coverage meets thresholds (95% statements/branches/functions/lines).

---

### Task 16: Run npm prune and measure savings

**Step 1: Clean install**

```bash
cd frontend/react-Admin3
rm -rf node_modules
npm install
```

**Step 2: Measure node_modules size**

```bash
du -sh node_modules
```

**Expected:** Significantly smaller than 2.7 GB (target: < 1 GB).

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: complete CRA to Vite migration - verified working"
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tests break during migration | Phase 2 is isolated — can keep Jest in parallel until Vitest is stable |
| Storybook incompatible | Can defer Storybook migration (Task 9) and keep webpack5 temporarily |
| Docker build fails | Test `npm run build` locally before updating Dockerfile |
| Missing env vars | Centralized in `src/config.js` — one file to verify |
| Pact tests need Jest | Keep jest.config.js for Pact only, run via separate script |

## Rollback Plan

If migration fails at any phase:
1. `git stash` or `git revert` back to CRA
2. `npm install` restores react-scripts
3. All CRA configs (public/index.html, .babelrc) are in git history

Each phase is independently committable and revertable.
