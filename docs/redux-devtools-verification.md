# Redux DevTools Verification Guide

## ✅ Configuration Status: ENABLED

Redux DevTools is **already configured correctly** in our Redux Toolkit store.

### Why You Don't See `window.__REDUX_DEVTOOLS_EXTENSION__`

**We're using Redux Toolkit** (modern approach), not legacy Redux:

```javascript
// ❌ OLD WAY (Legacy Redux - requires manual setup)
const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// ✅ NEW WAY (Redux Toolkit - automatic setup)
export const store = configureStore({
  reducer: { ... },
  devTools: process.env.NODE_ENV !== 'production', // Automatic DevTools!
});
```

**Redux Toolkit's `configureStore` handles DevTools automatically** - you don't need the manual `window.__REDUX_DEVTOOLS_EXTENSION__` code!

See official docs: https://redux-toolkit.js.org/api/configureStore#devtools

---

## How to Verify DevTools is Working

### Step 1: Install Redux DevTools Browser Extension

**Chrome/Edge:**
- Install: [Redux DevTools Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)

**Firefox:**
- Install: [Redux DevTools Extension](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Step 2: Start Development Server

```bash
npm start
```

**Important**: DevTools only works in **development mode** (`npm start`), not production builds.

### Step 3: Open Redux DevTools

1. Open your app in browser: http://localhost:3000
2. Press **F12** to open Browser DevTools
3. Look for **"Redux"** tab (next to Console, Network, etc.)
4. Click the **Redux** tab

### Step 4: Verify State is Visible

In the Redux tab, you should see:

**State Tab:**
```json
{
  "filters": {
    "subjects": [],
    "categories": [],
    "product_types": [],
    "products": [],
    "modes_of_delivery": [],
    "tutorial_format": null,        // ✅ Story 1.2 navbar filter
    "distance_learning": false,     // ✅ Story 1.2 navbar filter
    "tutorial": false,              // ✅ Story 1.2 navbar filter
    "searchQuery": "",
    "currentPage": 1,
    "pageSize": 20,
    "isLoading": false,
    "error": null,
    "filterCounts": {},
    "lastUpdated": null
  },
  "catalogApi": { ... }
}
```

**Action Tab:**
- Should show actions like `filters/setSubjects`, `filters/setTutorialFormat`, etc.

### Step 5: Test Actions (Story 1.2 - Line 551 Manual Testing)

Open **Browser Console** (not Redux tab) and run:

```javascript
// Test 1: Set tutorial format
store.dispatch({type: 'filters/setTutorialFormat', payload: 'online'})
// ✅ Redux tab should show tutorial_format: 'online'

// Test 2: Toggle distance learning
store.dispatch({type: 'filters/toggleDistanceLearning'})
// ✅ Redux tab should show distance_learning: true

// Test 3: Toggle tutorial
store.dispatch({type: 'filters/toggleTutorial'})
// ✅ Redux tab should show tutorial: true

// Test 4: Clear all filters
store.dispatch({type: 'filters/clearAllFilters'})
// ✅ Redux tab should reset all filters to defaults
```

Watch the **Redux DevTools State tab** update in real-time as you dispatch actions!

---

## Troubleshooting

### Problem: Can't see Redux tab

**Solution 1**: Make sure extension is installed
- Check browser extensions/add-ons
- Redux DevTools icon should appear in browser toolbar

**Solution 2**: Refresh the page
- Sometimes DevTools doesn't connect until page refresh
- Try Ctrl+R or Cmd+R

**Solution 3**: Check dev mode
- Redux DevTools only works with `npm start` (development)
- Production builds disable DevTools for performance

### Problem: State shows empty or undefined

**Solution**: Wait for app to fully load
- State initializes after React app mounts
- Give it 1-2 seconds after page load

### Problem: Actions aren't showing up

**Solution**: Make sure you're dispatching from console
- Open **Browser Console** (Ctrl+Shift+J / Cmd+Option+J)
- NOT Redux DevTools console
- Run dispatch commands there

---

## Configuration Details

**File**: `frontend/react-Admin3/src/store/index.js`

**Configuration** (Lines 42-46):
```javascript
// Enable Redux DevTools Extension in development (Story 1.2 - AC13)
// Redux Toolkit's configureStore automatically connects to Redux DevTools Extension
// No need for window.__REDUX_DEVTOOLS_EXTENSION__ - it's handled internally!
// See: https://redux-toolkit.js.org/api/configureStore#devtools
devTools: process.env.NODE_ENV !== 'production',
```

**What This Does**:
- ✅ Automatically enables Redux DevTools in development
- ✅ Automatically disables Redux DevTools in production (performance)
- ✅ No manual `window.__REDUX_DEVTOOLS_EXTENSION__` code needed
- ✅ Works with all Redux Toolkit features (RTK Query, listeners, etc.)

---

## References

- **Redux Toolkit ConfigureStore Docs**: https://redux-toolkit.js.org/api/configureStore#devtools
- **Redux DevTools Extension**: https://github.com/reduxjs/redux-devtools
- **Story 1.2 AC13**: Redux DevTools shows navbar filters in state
- **Story 1.2 Manual Testing**: Lines 549-556 in story document

---

**Status**: ✅ Redux DevTools is ENABLED and ready to use!

**Last Verified**: 2025-10-19
