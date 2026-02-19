# API Service Contracts: Admin Panel

**Branch**: `20260216-admin-panel` | **Date**: 2026-02-16

Each service follows the existing pattern: `import httpService` + `config` URLs.

## Existing Services (Modify)

### examSessionService.js (exists)

No changes needed. Already has: `getAll`, `getById`, `create`, `update`, `delete`.

**Base URL**: `config.examSessionUrl` → `/api/catalog/exam-sessions`

### subjectService.js (exists)

No changes needed. Already has: `getAll`, `getById`, `create`, `update`, `delete`, `bulkImport`.

**Base URL**: `config.subjectUrl` → `/api/catalog/subjects`

### productService.js (exists - catalog products)

No changes needed for admin use. Already has: `getById`, `create`, `update`, `delete`, `bulkImport`.

**Base URL**: `config.productsUrl` → `/api/products` (uses catalog viewset)

## New Services

### examSessionSubjectService.js

```
Base URL: ${config.catalogUrl}/exam-session-subjects

Methods:
  getAll()              → GET    /api/catalog/exam-session-subjects/
  getById(id)           → GET    /api/catalog/exam-session-subjects/{id}/
  create(data)          → POST   /api/catalog/exam-session-subjects/
  update(id, data)      → PUT    /api/catalog/exam-session-subjects/{id}/
  delete(id)            → DELETE /api/catalog/exam-session-subjects/{id}/
```

### productVariationService.js

```
Base URL: ${config.catalogUrl}/product-variations

Methods:
  getAll()              → GET    /api/catalog/product-variations/
  getById(id)           → GET    /api/catalog/product-variations/{id}/
  create(data)          → POST   /api/catalog/product-variations/
  update(id, data)      → PUT    /api/catalog/product-variations/{id}/
  delete(id)            → DELETE /api/catalog/product-variations/{id}/
```

### productProductVariationService.js

```
Base URL: ${config.catalogUrl}/product-product-variations

Methods:
  getAll()              → GET    /api/catalog/product-product-variations/
  getById(id)           → GET    /api/catalog/product-product-variations/{id}/
  create(data)          → POST   /api/catalog/product-product-variations/
  update(id, data)      → PUT    /api/catalog/product-product-variations/{id}/
  delete(id)            → DELETE /api/catalog/product-product-variations/{id}/
```

### catalogBundleService.js

```
Base URL: ${config.catalogUrl}/product-bundles

Methods:
  getAll()              → GET    /api/catalog/product-bundles/
  getById(id)           → GET    /api/catalog/product-bundles/{id}/
  create(data)          → POST   /api/catalog/product-bundles/
  update(id, data)      → PUT    /api/catalog/product-bundles/{id}/
  delete(id)            → DELETE /api/catalog/product-bundles/{id}/
```

### catalogBundleProductService.js

```
Base URL: ${config.catalogUrl}/bundle-products

Methods:
  getAll()              → GET    /api/catalog/bundle-products/
  getByBundleId(bundleId) → GET  /api/catalog/bundle-products/?bundle={bundleId}
  create(data)          → POST   /api/catalog/bundle-products/
  update(id, data)      → PUT    /api/catalog/bundle-products/{id}/
  delete(id)            → DELETE /api/catalog/bundle-products/{id}/
```

### recommendationService.js

```
Base URL: ${config.catalogUrl}/recommendations

Methods:
  getAll()              → GET    /api/catalog/recommendations/
  getById(id)           → GET    /api/catalog/recommendations/{id}/
  create(data)          → POST   /api/catalog/recommendations/
  update(id, data)      → PUT    /api/catalog/recommendations/{id}/
  delete(id)            → DELETE /api/catalog/recommendations/{id}/
```

### storeProductService.js

```
Base URL: ${config.apiBaseUrl}/api/store/products

Methods:
  getAll()              → GET    /api/store/products/
  getById(id)           → GET    /api/store/products/{id}/
  create(data)          → POST   /api/store/products/
  update(id, data)      → PUT    /api/store/products/{id}/
  delete(id)            → DELETE /api/store/products/{id}/
```

### priceService.js

```
Base URL: ${config.apiBaseUrl}/api/store/prices

Methods:
  getAll()              → GET    /api/store/prices/
  getById(id)           → GET    /api/store/prices/{id}/
  getByProductId(pid)   → GET    /api/store/products/{pid}/prices/
  create(data)          → POST   /api/store/prices/
  update(id, data)      → PUT    /api/store/prices/{id}/
  delete(id)            → DELETE /api/store/prices/{id}/
```

### storeBundleService.js

```
Base URL: ${config.apiBaseUrl}/api/store/bundles

Methods:
  getAll()              → GET    /api/store/bundles/
  getById(id)           → GET    /api/store/bundles/{id}/
  create(data)          → POST   /api/store/bundles/
  update(id, data)      → PUT    /api/store/bundles/{id}/
  delete(id)            → DELETE /api/store/bundles/{id}/
```

### storeBundleProductService.js

```
Base URL: ${config.apiBaseUrl}/api/store/bundle-products

Methods:
  getAll()              → GET    /api/store/bundle-products/
  getByBundleId(bid)    → GET    /api/store/bundles/{bid}/products/
  create(data)          → POST   /api/store/bundle-products/
  update(id, data)      → PUT    /api/store/bundle-products/{id}/
  delete(id)            → DELETE /api/store/bundle-products/{id}/
```

### userProfileService.js

```
Base URL: ${config.userUrl}/profiles

Methods:
  getAll()              → GET    /api/users/profiles/
  getById(id)           → GET    /api/users/profiles/{id}/
  update(id, data)      → PUT    /api/users/profiles/{id}/
  getAddresses(id)      → GET    /api/users/profiles/{id}/addresses/
  updateAddress(pid, aid, data) → PUT /api/users/profiles/{pid}/addresses/{aid}/
  getContacts(id)       → GET    /api/users/profiles/{id}/contacts/
  updateContact(pid, cid, data) → PUT /api/users/profiles/{pid}/contacts/{cid}/
  getEmails(id)         → GET    /api/users/profiles/{id}/emails/
  updateEmail(pid, eid, data)   → PUT /api/users/profiles/{pid}/emails/{eid}/
```

### staffService.js

```
Base URL: ${config.userUrl}/staff

Methods:
  getAll()              → GET    /api/users/staff/
  getById(id)           → GET    /api/users/staff/{id}/
  create(data)          → POST   /api/users/staff/
  update(id, data)      → PUT    /api/users/staff/{id}/
  delete(id)            → DELETE /api/users/staff/{id}/
```

## Frontend Route Contracts

### Pattern: `admin/{resource}` (list), `admin/{resource}/new` (create), `admin/{resource}/:id` (detail), `admin/{resource}/:id/edit` (edit)

| Route | Component | Entity |
|-------|-----------|--------|
| `admin/exam-sessions` | ExamSessionList | ExamSession |
| `admin/subjects` | SubjectList | Subject |
| `admin/exam-session-subjects` | ExamSessionSubjectList | ExamSessionSubject |
| `admin/catalog-products` | CatalogProductList | CatalogProduct |
| `admin/product-variations` | ProductVariationList | ProductVariation + PPV |
| `admin/product-bundles` | ProductBundleList | ProductBundle + BundleProduct |
| `admin/store-products` | StoreProductList | StoreProduct |
| `admin/recommendations` | RecommendationList | Recommendation |
| `admin/prices` | PriceList | Price |
| `admin/store-bundles` | StoreBundleList | StoreBundle + BundleProduct |
| `admin/user-profiles` | UserProfileList | UserProfile |
| `admin/user-addresses` | UserAddressList | UserProfileAddress |
| `admin/user-contacts` | UserContactList | UserProfileContactNumber |
| `admin/user-emails` | UserEmailList | UserProfileEmail |
| `admin/staff` | StaffList | Staff |

Each resource also has `/new`, `/:id`, `/:id/edit` routes following the standard pattern (except user-profiles, user-addresses, user-contacts, user-emails which only have list and edit).
