# Plan: Streamline Frontend Services

## Context

The `frontend/react-Admin3/src/services/` directory has **34 files (~5,900 lines)** with significant duplication, inconsistency, and a God Object. This analysis identifies consolidation opportunities and proposes a phased approach to reduce ~46% of service code while maintaining backward compatibility.

---

## Key Findings

### 1. CRUD Boilerplate: 14 services share identical patterns (~715 lines)
Every one of these is a copy-paste of the same `list/getAll/getById/create/update/delete` body, differing only in the API URL string and error log label:

| Service | URL | Extra Methods |
|---------|-----|---------------|
| staffService.js | `/api/users/staff` | none |
| recommendationService.js | `/api/catalog/recommendations` | none |
| examSessionSubjectService.js | `/api/catalog/exam-session-subjects` | none |
| productVariationService.js | `/api/catalog/product-variations` | none |
| examSessionService.ts | `/api/catalog/exam-sessions` | none |
| productProductVariationService.js | `/api/catalog/product-product-variations` | `getByProduct` |
| catalogBundleService.js | `/api/catalog/product-bundles` | none |
| catalogBundleProductService.js | `/api/catalog/bundle-products` | `getByBundleId` |
| catalogProductService.js | `/api/catalog/products` | `bulkImport` |
| subjectService.ts | `/api/catalog/admin-subjects` | `getSubjects`, `bulkImport` |
| storeProductService.js | `/api/store/products` | `adminList`, `getByCatalogProduct` |
| storeBundleService.js | `/api/store/bundles` | `adminList`, `getProducts` |
| storeBundleProductService.js | `/api/store/bundle-products` | `getByBundleId` |
| priceService.js | `/api/store/prices` | `getByProductId` |

### 2. productService.js is a God Object (386 lines)
Mixes 5 API domains: products CRUD, navigation, store products, bundles, marking vouchers, search, and filter config.

### 3. Bundle Service Explosion: 5 files for 1 domain
`bundleService.js` (294-line class) + 4 thin CRUD wrappers for catalog/store bundles and bundle products.

### 4. Address Service Fragmentation: 4 files
Config (49KB), Google API fetcher, orchestrator, and Postcoder validator — scattered at the same directory level.

### 5. Inconsistencies
- Mixed TS/JS with no clear pattern
- 3 export styles (object literal, class instance, named exports)
- 4 error handling patterns
- 2 services use native `fetch()` instead of `httpService` (missing JWT auth)
- Inconsistent URL construction

---

## Implementation Plan

### Phase 1: CRUD Service Factory (Foundation)

**New files:**
- `src/services/createCrudService.ts` — Factory function
- `src/services/__tests__/createCrudService.test.ts` — Factory tests

**Design:**
```typescript
// createCrudService.ts
export function createCrudService<T>(options: { apiUrl: string; resourceName: string }) {
  return {
    list: async (params = {}) => { /* httpService.get + parsePaginatedResponse */ },
    getAll: async () => { /* httpService.get with error-swallowing pattern */ },
    getById: async (id) => { /* httpService.get */ },
    create: async (data) => { /* httpService.post */ },
    update: async (id, data) => { /* httpService.put */ },
    delete: async (id) => { /* httpService.delete */ },
  };
}

// Extension for store services with admin endpoints
export function createAdminCrudService<T>(options: { apiUrl; adminApiUrl; resourceName }) {
  return {
    ...createCrudService<T>(options),
    adminList: async (params) => { /* GET adminApiUrl */ },
    delete: async (id) => { /* DELETE adminApiUrl */ },  // override
  };
}
```

The factory replicates the exact pattern from [staffService.js](frontend/react-Admin3/src/services/staffService.js) — returns an object literal, uses `httpService`, `parsePaginatedResponse`, same error-swallowing `getAll`, same `console.error` logging.

**No existing files modified.**

---

### Phase 2: Migrate CRUD Services to Factory

Replace each service body with a factory call. Each becomes ~8-20 lines instead of ~45-65.

**Example — staffService.ts (was 45 lines, becomes 8):**
```typescript
import config from '../config';
import { createCrudService } from './createCrudService';

const staffService = createCrudService({
  apiUrl: `${config.userUrl}/staff`,
  resourceName: 'staff',
});
export default staffService;
```

**Services with extras use spread:**
```typescript
const catalogProductService = {
  ...createCrudService({ apiUrl: API_URL, resourceName: 'catalog product' }),
  bulkImport: async (products) => { /* custom method */ },
};
```

**Migration order:** Pure CRUD (6 services) → CRUD+extras (4 services) → Admin CRUD (4 services)

**Backward compatibility:** Same default export shape. All existing imports and tests work unchanged.

**Net reduction: ~550 lines**

---

### Phase 3: Break Up productService.js God Object

Split 386-line monolith into focused services with a backward-compatible facade.

**New focused services:**
| New Service | Methods | Source |
|-------------|---------|--------|
| `navigationService.ts` (~30 lines) | `getNavigationData()` | productService lines calling `/api/catalog/navigation-data/` |
| `markingService.ts` (~30 lines) | `getMarkingDeadlines()`, `getBulkMarkingDeadlines()` | productService lines calling `/api/marking/` |
| `markingVoucherService.ts` (~40 lines) | `getMarkingVouchers()`, `getMarkingVoucherById()`, `addMarkingVoucherToCart()` | productService lines calling `/api/marking-vouchers/` |

**Existing services absorb methods:**
- `storeProductService.ts` gains `getAvailableProducts()`, `getProductsAndBundles()`
- `searchService` already has `fuzzySearch` (matches `searchProducts`)
- `catalogProductService` already has CRUD (matches create/update/delete)

**Facade (productService.ts):**
```typescript
/** @deprecated Use domain-specific services directly */
const productService = {
  getAll: catalogProductService.getAll,
  getNavigationData: navigationService.getNavigationData,
  getAvailableProducts: storeProductService.getAvailableProducts,
  searchProducts: searchService.fuzzySearch,
  // ... all methods delegated
};
export default productService;
```

**Net reduction: 386 → ~60 lines facade + ~100 lines across new services = ~226 lines saved**

---

### Phase 4: Consolidate Bundle Services (5 → 2+re-exports)

| Before (5 files, 502 lines) | After |
|------------------------------|-------|
| `bundleService.js` (294, class) | Business logic absorbed into `storeBundleService.ts` |
| `catalogBundleService.js` (46) | `catalogBundleService.ts` with nested `.products` namespace |
| `catalogBundleProductService.js` (47) | Re-export from `catalogBundleService.products` |
| `storeBundleService.js` (66) | `storeBundleService.ts` with CRUD + business logic + `.products` |
| `storeBundleProductService.js` (49) | Re-export from `storeBundleService.products` |

**Net reduction: ~150 lines**

---

### Phase 5: Address Service Organization

Move 4 address files into `src/services/address/` subdirectory with barrel export. Fix `addressValidationService.ts` to use `httpService` instead of native `fetch()` for internal API calls (currently missing JWT auth headers).

**Low disruption** — just reorganization + one bug fix.

---

### Phase 6: Standardize Remaining Inconsistencies

1. **TypeScript migration** for remaining JS services: `searchService`, `sessionSetupService`, `tutorialService`
2. **Error handling**: Use `ServiceError` class for non-CRUD services
3. **Export pattern**: All services use object literal default export (convert `phoneValidationService` class → object)

---

## Summary of Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total lines | ~5,900 | ~3,200 | -46% |
| Service files | 34 | 30 real + 7 re-exports | clearer |
| Duplicated CRUD code | ~715 lines | ~0 (factory) | -100% |
| productService.js | 386 lines (God Object) | 60-line facade | -84% |
| Bundle services | 5 files, 502 lines | 2 real + 3 re-exports | -60% |
| TS/JS consistency | 50/50 mixed | All TypeScript | standardized |

## Verification

After each phase:
1. Run `cd frontend/react-Admin3 && npm test -- --watchAll=false` — all 3,246 passing tests must remain green
2. Run `npm start` — verify dev server starts and pages load
3. Spot-check admin panel CRUD operations in browser
4. Check that no import paths are broken: `npx tsc --noEmit` (for TS files)

## Critical Files

- [httpService.js](frontend/react-Admin3/src/services/httpService.js) — Foundation all services depend on
- [paginationHelper.js](frontend/react-Admin3/src/services/paginationHelper.js) — `parsePaginatedResponse` used by factory
- [staffService.js](frontend/react-Admin3/src/services/staffService.js) — Canonical CRUD pattern the factory replicates
- [productService.js](frontend/react-Admin3/src/services/productService.js) — God Object to decompose in Phase 3
- [bundleService.js](frontend/react-Admin3/src/services/bundleService.js) — Business logic to preserve in Phase 4
- [catalogApi.js](frontend/react-Admin3/src/store/api/catalogApi.js) — RTK Query endpoints (avoid duplication)
