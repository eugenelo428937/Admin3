# Quickstart: Admin Panel

**Branch**: `20260216-admin-panel` | **Date**: 2026-02-16

## Prerequisites

1. Backend running on `http://127.0.0.1:8888` with PostgreSQL
2. Frontend dev server: `cd frontend/react-Admin3 && npm start`
3. Superuser account for testing admin features

## Implementation Order

Follow user story priorities P1 → P5:

### P1: Admin MegaMenu Navigation
1. Modify `NavigationMenu.js` - replace `<Menu>` with `<MegaMenuPopover>`
2. Add two-row Grid layout with all admin categories
3. Test: Login as superuser, verify all menu links and disabled states

### P2: Update Existing Catalog Pages
1. Update `admin/exam-sessions/*` to use `admin/` prefixed routes
2. Update `admin/subjects/*` similarly
3. Verify existing CRUD operations still work

### P3: New Catalog Admin Pages
1. Create services: `examSessionSubjectService`, `productVariationService`, `productProductVariationService`, `catalogBundleService`, `catalogBundleProductService`
2. Create components: ExamSessionSubjects, ProductVariations, ProductBundles (each with List + Form)
3. Add routes to App.js
4. Requires backend endpoints for exam-session-subjects, product-variations, product-product-variations, product-bundles, bundle-products

### P4: Store Admin Pages
1. Create services: `storeProductService`, `recommendationService`, `priceService`, `storeBundleService`, `storeBundleProductService`
2. Create components: StoreProducts, Recommendations, Prices, StoreBundles (each with List + Form)
3. Add routes to App.js
4. Requires backend endpoints with CUD operations for store entities

### P5: User Admin Pages
1. Create services: `userProfileService`, `staffService`
2. Create components: UserProfiles (list + edit), Addresses, Contacts, Emails, Staff (full CRUD)
3. Add routes to App.js
4. Requires backend user profile sub-resource endpoints

## Development Pattern

For each new admin entity, follow this order:

```
1. Write service tests (RED)
2. Create service file
3. Write component tests (RED)
4. Create List component
5. Create Form component
6. Add routes to App.js
7. Add menu link in NavigationMenu.js (if not already)
8. Run all tests (GREEN)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Navigation/NavigationMenu.js` | Admin MegaMenu (MODIFY) |
| `src/components/Navigation/MegaMenuPopover.js` | Reusable popover (READ ONLY) |
| `src/App.js` | Route definitions (MODIFY) |
| `src/config.js` | API URL config (READ ONLY - compose from existing) |
| `src/services/httpService.js` | Axios wrapper (READ ONLY) |
| `src/hooks/useAuth.js` | Auth context with `isSuperuser` (READ ONLY) |

## Testing

```bash
# Run all frontend tests
cd frontend/react-Admin3
npm test

# Run specific admin tests
npm test -- --testPathPattern=admin

# Run with coverage
npm test -- --coverage --watchAll=false
```

## Backend Dependencies

Backend endpoints that don't exist yet must be created before the corresponding frontend pages can be fully tested with real data. Use mock services for development if backend is not ready.
