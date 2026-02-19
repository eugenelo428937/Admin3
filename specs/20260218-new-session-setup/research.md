# Research: New Session Setup Wizard

**Branch**: `20260218-new-session-setup`
**Date**: 2026-02-18

## R1: Backend Endpoint Placement for Step 3 Copy/Create

**Decision**: Place the copy/create endpoint in the `catalog` app as a custom action, since session setup is a catalog-level orchestration that crosses both catalog and store models.

**Rationale**: The session setup workflow starts in catalog (ExamSession, ExamSessionSubject) and reaches into store (Product, Price, Bundle, BundleProduct). The catalog app already imports store models for bundle views. A dedicated service in `catalog/services/` keeps the business logic isolated and testable.

**Alternatives considered**:
- Store app: Rejected because the operation starts from catalog entities (ESS) and also creates bundles from catalog templates.
- New dedicated app: Rejected as over-engineering; the operation is a single endpoint with focused scope.

## R2: Atomic Transaction Strategy for Step 3

**Decision**: Use Django's `transaction.atomic()` wrapping the entire copy/create operation in a single database transaction. On any exception, all records are rolled back automatically.

**Rationale**: Django's `transaction.atomic()` is the standard approach for all-or-nothing database operations. It leverages PostgreSQL's native transaction support with zero additional infrastructure. The operation creates ~100-200 products + their prices + ~30 bundles with bundle products — well within a single transaction's capability.

**Alternatives considered**:
- Saga pattern with compensating transactions: Rejected; unnecessary complexity for a single-database, single-request operation.
- Async task with status polling: Rejected; the operation completes in seconds and doesn't need background processing.

## R3: Previous Session Determination

**Decision**: Query `ExamSession.objects.exclude(id=new_session_id).order_by('-id').first()` to get the most recently created session.

**Rationale**: Per spec assumption, "previous session" means the most recently created exam session by ID ordering (auto-increment primary key). This is simpler and more deterministic than ordering by `created_at` (which could have ties) or by `session_code` (which is alphabetical, not chronological).

**Alternatives considered**:
- Order by `created_at`: Could produce ties with identical timestamps; ID ordering breaks ties deterministically.
- Order by `session_code`: Session codes like "2026-09" are lexicographic but not guaranteed to reflect creation order.

## R4: Product Matching Strategy for Copy Operation

**Decision**: Match previous session's products to new session's subjects via `product.exam_session_subject.subject_id`. For each previous product, find the new ESS with the same `subject_id` and create a new store Product with the new ESS and the same `product_product_variation_id`.

**Rationale**: The `product_product_variation` (PPV) is a catalog-level entity shared across sessions. Only the ESS changes between sessions. Matching by `subject_id` correctly maps products to the new session's subjects.

**Algorithm**:
1. Get all new ESS records → build `{subject_id: new_ess_id}` mapping
2. Get all active products from previous session's ESS records, filtering out Tutorial variation types
3. For each previous product, look up new ESS by subject_id
4. Skip if subject not assigned to new session (FR-012)
5. Create new Product with `exam_session_subject=new_ess, product_product_variation=prev_product.ppv`
6. Product code auto-generates on save

## R5: Bundle Creation from Catalog Templates

**Decision**: For each new ESS, query `ProductBundle.objects.filter(subject=ess.subject, is_active=True)`. For each catalog bundle template, create a `store.Bundle` and populate it with `store.BundleProduct` entries by matching the template's `ProductBundleProduct.product_product_variation` to the newly created store products.

**Rationale**: Bundles are created from catalog templates (not copied from previous store bundles) per the clarification. The catalog templates (`catalog_product_bundles` + `catalog_product_bundle_products`) define the bundle structure; we instantiate them for the new session's ESS records.

**Algorithm**:
1. Build `{(ess_id, ppv_id): new_store_product}` lookup from newly created products
2. For each new ESS:
   a. Find all active `ProductBundle` templates for the ESS's subject
   b. For each template, create `store.Bundle(bundle_template=template, exam_session_subject=new_ess)`
   c. For each `ProductBundleProduct` in the template:
      - Look up the newly created store product by `(new_ess_id, pbp.product_product_variation_id)`
      - If found, create `store.BundleProduct(bundle=new_bundle, product=new_product, ...)`
      - If not found (e.g., the PPV wasn't copied because it's a Tutorial), skip that bundle product

## R6: MUI Transfer List Implementation

**Decision**: Build a custom transfer list using MUI `List`, `ListItem`, `Checkbox`, and `Button` components following the MUI Transfer List documentation pattern. No third-party transfer list library needed.

**Rationale**: MUI doesn't provide a built-in `TransferList` component, but their documentation shows a straightforward implementation pattern using standard MUI components. The codebase has no existing transfer list component to reuse.

**Alternatives considered**:
- Autocomplete-based approach (like BundleProductsPanel): Rejected; the spec explicitly requires a transfer list UX with left/right panels and move buttons.
- Third-party library (react-dual-listbox): Rejected; adds a dependency for a single-use component that's simple to build with MUI.

## R7: Frontend State Management for Wizard

**Decision**: Use React component state (`useState`) within the `NewSessionSetup` parent component. No Redux/Context needed.

**Rationale**: The wizard is a linear, create-only workflow used by a single admin user. The state (current step, created session ID, assigned subjects) is short-lived and doesn't need to persist beyond the wizard flow. Component state is sufficient and simpler than adding Redux slices.

**Alternatives considered**:
- Redux slice: Rejected; no cross-component state sharing needed beyond parent-child props. The wizard is self-contained.
- URL state (session ID in URL): Useful for refresh persistence (edge case). Decision: Store the created exam session ID in the URL path (`/admin/new-session-setup/:sessionId`) after Step 1 completes, so a refresh can recover the wizard context.
