# Admin Order List & Detail — Design Spec

**Date:** 2026-04-27
**Status:** Approved (pending user review of this document)
**Owner:** TBD (assign during implementation planning)

## 1. Goal

Give superuser admins a way to browse, filter, and inspect any order in the system, including the related order items, payments, contact details, preferences, and acknowledgments captured at checkout.

This complements the existing `/admin/legacy-orders` page (which serves the legacy `acted_orders` schema) with a new `/admin/orders` page backed by the modern `orders` Django app.

## 2. Scope

### In scope (v1)

- A list page at `/admin/orders` with searching, filtering, sorting, and pagination.
- A detail page at `/admin/orders/:id` showing all six related entities.
- A new admin-only API at `/api/admin/orders/` with list and retrieve endpoints.
- Superuser-only access on both API and frontend layers.

### Out of scope (v1)

- Edit / cancel / refund actions on the detail page (read-only).
- CSV / Excel export of filtered list results.
- Item-level click-through to product detail pages.
- Bulk operations (multi-select).
- Saved filter presets, URL synchronization of filter state.
- Real-time updates / polling.
- Print stylesheet.

## 3. Affected systems

| Layer | Files (new) | Files (modified) |
|---|---|---|
| Backend models | — (no schema changes) | — |
| Backend API | `orders/admin_views.py`, `orders/serializers/admin_order_serializer.py` | `orders/urls.py` (mount admin router) |
| Backend tests | `orders/tests/test_admin_views.py` | — |
| Frontend pages | `components/admin/orders/OrderList.tsx`, `useOrderListVM.ts`, `OrderDetail.tsx`, `useOrderDetailVM.ts` | `App.js` (route registration) |
| Frontend service | `services/adminOrderService.ts` | — |
| Frontend types | `types/admin-order.types.ts` | — |
| Frontend tests | `OrderList.test.tsx`, `OrderDetail.test.tsx`, `useOrderListVM.test.ts` | — |

## 4. Backend design

### 4.1 New endpoint: `/api/admin/orders/`

A new ReadOnly viewset, separate from the existing user-scoped `OrderViewSet`. Lives in `orders/admin_views.py`.

```python
class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/admin/orders/ and GET /api/admin/orders/{id}/.

    Superuser-only; returns orders across all users with related
    student/items/payments/contact/preferences/acknowledgments.
    """
    permission_classes = [IsAdminUser]  # Django's IsAdminUser maps to is_staff;
                                        # gate at queryset level on is_superuser
                                        # if stricter access required.
    pagination_class = PageNumberPagination

    def get_queryset(self):
        qs = (
            Order.objects
            .select_related('user', 'user__student')
            .prefetch_related(
                Prefetch('items', queryset=OrderItem.objects.select_related('purchasable')),
                'payments',
                'user_contact',
                'user_preferences',
                'user_acknowledgments',
            )
            .order_by('-created_at')
        )
        return self._apply_filters(qs)

    def get_serializer_class(self):
        return (
            AdminOrderDetailSerializer
            if self.action == 'retrieve'
            else AdminOrderListSerializer
        )
```

**URL mount** (`orders/urls.py`):

```python
admin_router = DefaultRouter()
admin_router.register(r'', AdminOrderViewSet, basename='admin-orders')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('admin/', include(admin_router.urls)),  # /api/orders/admin/...
    path('', include(router.urls)),
]
```

> **Routing note:** the existing project mounts the orders app at `/api/orders/`. Mounting the admin router at `admin/` inside that include yields `/api/orders/admin/` rather than the originally-discussed `/api/admin/orders/`. Confirm preferred URL shape during implementation; either is acceptable, but the in-app path is lower-friction (no project-level urls.py change).

### 4.2 Filter spec

All filters are applied via a custom `_apply_filters(queryset)` helper that reads `self.request.query_params`. AND-composition between filters; no implicit OR.

| Param | Behavior | ORM |
|---|---|---|
| `student_ref` | Exact match (int) | `user__student__student_ref=value` |
| `name` | Case-insensitive substring against first OR last name | `Q(user__first_name__icontains=value) \| Q(user__last_name__icontains=value)` |
| `email` | Case-insensitive substring | `user__email__icontains=value` |
| `order_no` | Exact match (int) — Order.id is the order number | `id=int(value)` |
| `product_code` | Exact match against any item's purchasable code | `items__purchasable__code=value` + `.distinct()` |
| `date_from` | `created_at` ≥ start of date | `created_at__date__gte=value` |
| `date_to` | `created_at` ≤ end of date (inclusive) | `created_at__date__lte=value` |
| `ordering` | Sortable fields | Whitelist: `created_at`, `-created_at`, `id`, `-id`, `user__last_name`, `-user__last_name` |

Empty/missing values skipped. Invalid `order_no`/`student_ref` (non-integer) returns an empty queryset rather than 400, mirroring the LegacyOrder list behavior — keeps the UX of "type and watch results filter" smooth.

### 4.3 Serializers

**`AdminOrderListSerializer`** — minimal payload for table rows.

```python
class StudentSummarySerializer(serializers.Serializer):
    student_ref = serializers.IntegerField(source='student.student_ref', default=None)
    first_name  = serializers.CharField()
    last_name   = serializers.CharField()
    email       = serializers.EmailField()


class AdminOrderListSerializer(serializers.ModelSerializer):
    student     = serializers.SerializerMethodField()
    item_codes  = serializers.SerializerMethodField()
    item_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = ['id', 'created_at', 'total_amount', 'student',
                  'item_codes', 'item_count']

    def get_student(self, obj):
        u = obj.user
        return {
            'student_ref': getattr(getattr(u, 'student', None), 'student_ref', None),
            'first_name':  u.first_name,
            'last_name':   u.last_name,
            'email':       u.email,
        }

    def get_item_codes(self, obj):
        # Pre-fetched in viewset; no extra query.
        return [it.purchasable.code for it in obj.items.all() if it.purchasable_id]

    def get_item_count(self, obj):
        return obj.items.count()  # uses prefetched cache
```

**`AdminOrderDetailSerializer`** — full nested payload.

```python
class AdminOrderDetailSerializer(serializers.ModelSerializer):
    student              = serializers.SerializerMethodField()  # same shape as list
    items                = OrderItemSerializer(many=True, read_only=True)
    payments             = PaymentSerializer(many=True, read_only=True)
    user_contact         = serializers.SerializerMethodField()  # 0-or-1 from reverse FK
    user_preferences     = OrderPreferenceSerializer(many=True, read_only=True)
    user_acknowledgments = OrderAcknowledgmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Order
        fields = ['id', 'created_at', 'updated_at',
                  'subtotal', 'vat_amount', 'total_amount',
                  'vat_rate', 'vat_country', 'vat_calculation_type',
                  'calculations_applied',
                  'student', 'items', 'payments',
                  'user_contact', 'user_preferences', 'user_acknowledgments']

    def get_user_contact(self, obj):
        contact = obj.user_contact.first()  # related_name='user_contact', reverse FK
        return OrderContactSerializer(contact).data if contact else None
```

New nested serializers `OrderContactSerializer`, `OrderPreferenceSerializer`, `OrderAcknowledgmentSerializer` are added in `orders/serializers/admin_order_serializer.py`. `OrderPreferenceSerializer` exposes a `display_value` field that calls `obj.get_display_value()` so the frontend never has to interpret raw JSON shapes.

### 4.4 Permissions

Use `IsAdminUser` (DRF) which checks `request.user.is_staff`. If superuser-only is required, add a queryset-level guard or a custom `IsSuperUser` permission class. Both layers should agree:

- API: `IsAdminUser` (or `IsSuperUser` if stricter — confirm during planning).
- Frontend: `useAuth().isSuperuser` gate on both pages, redirect non-matching users to `/`.

### 4.5 Performance

- `select_related('user', 'user__student')` covers the student summary in the list.
- `prefetch_related('items__purchasable')` covers item codes without N+1.
- A regression test asserts the list endpoint stays under a fixed query count (target: ≤ 6).

## 5. Frontend design

### 5.1 Files & route registration

```
src/
├── components/admin/orders/
│   ├── OrderList.tsx
│   ├── useOrderListVM.ts
│   ├── OrderDetail.tsx
│   └── useOrderDetailVM.ts
├── services/adminOrderService.ts
└── types/admin-order.types.ts
```

In `src/App.js`:

```js
const AdminOrderList   = React.lazy(() => import("./components/admin/orders/OrderList.tsx"));
const AdminOrderDetail = React.lazy(() => import("./components/admin/orders/OrderDetail.tsx"));

<Route path="/admin/orders"     element={<AdminOrderList />} />
<Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
```

### 5.2 List page (`OrderList.tsx`)

Mirrors the LegacyOrderList shape: filter card on top, results count, sortable table, pagination. Uses the shared composed components (`AdminPage`, `AdminPageHeader`, `AdminErrorAlert`, `AdminLoadingState`, `AdminEmptyState`, `AdminPagination`) and shadcn-style primitives (`Input`, `Button`, `Combobox`, `Table*`).

**Filter card layout:**

| Row | Fields |
|---|---|
| 1 | Student Ref (number, 130px) · Name (text, flex) |
| 2 | Email (text, flex) |
| 3 | Order No (number, 130px) · Product Code (Combobox, 280px) |
| 4 | Date From (date, 180px) · Date To (date, 180px) |

- Text fields debounce at 300ms (matches legacy VM).
- Page resets to 0 on any filter change.
- "Clear All" button appears when any filter is active.
- Product Code combobox is preloaded on mount via `/api/store/products/?page_size=10000` (matches legacy product combobox approach), each option `{ value: code, label: "<code> — <name>" }`.

**Table columns:**

| Order Date (sortable, default `-created_at`) | Student | Order Items | Actions |
|---|---|---|---|
| `2026-04-22 14:30` | `Jane Smith (A12345)` | `CM1/CC/26, CP2/CPBOR/26, CP3/M01/26` `[+3 more]` badge | `[View]` button |

- **Order Date** column: locale-formatted `created_at` (`Intl.DateTimeFormat`, short date + time).
- **Student** column: `${first_name} ${last_name} (${student_ref})`. If no Student row, shows `(—)`.
- **Order Items** column: comma-joined codes in a single line, truncated with CSS `text-overflow: ellipsis`. A trailing badge shows the **total item count** unconditionally (e.g. `5 items`). This avoids any DOM-measurement of which codes "fit" — the count badge gives admins the info, and the visible codes are whatever fits in the column width.
- **Actions** column: `[View]` button → `navigate(\`/admin/orders/${order.id}\`)`.

**Sortable columns:** Order Date (`created_at`), Order No (`id`), Student (`user__last_name`). Toggle pattern matches legacy: ascending → descending → cleared.

### 5.3 ViewModel (`useOrderListVM.ts`)

Mirror of `useLegacyOrderListVM`. Exposes:

- `orders`, `loading`, `error`, `totalCount`, `page`, `pageSize`
- `filters` (object) and per-field setters: `setStudentRef`, `setName`, `setEmail`, `setOrderNo`, `setProductCode`, `setDateFrom`, `setDateTo`
- `clearFilters()`
- `productCodeOptions` (loaded on mount)
- `ordering`, `toggleSort(field)`
- `handleChangePage`, `handleChangeRowsPerPage`
- `onView(orderId)` — navigation helper
- `isSuperuser` (from `useAuth`)

Single API call inside debounced effect; cancels in-flight request via AbortController to avoid stale results.

### 5.4 Detail page (`OrderDetail.tsx`)

Vertical stack of `AdminDetailCard` sections:

1. **Order Summary** — id, created_at, updated_at, subtotal, vat_amount, total_amount, vat_rate, vat_country, vat_calculation_type.
2. **Student** — name, student_ref, email, link back to filtered list (`/admin/orders?student_ref=<ref>`).
3. **Order Items** (table) — code, name, quantity, price_type, net_amount, vat_amount, gross_amount, vat_rate, is_cancelled.
4. **Payments** (table) — payment_method, amount, currency, status (badge), transaction_id, created_at, processed_at, error_message (only if present).
5. **Contact** (key-value list) — mobile_phone, home_phone, work_phone, email_address (with country codes shown next to phone numbers).
6. **Preferences** (table) — preference_type, preference_key, title, display_value (server-computed), submitted_at.
7. **Acknowledgments** (table) — acknowledgment_type, title, is_accepted (badge), accepted_at, content_version.

Empty sections render `<AdminEmptyState>` with section-appropriate copy ("No payments recorded", "No preferences captured", etc.) so users can distinguish "section is empty" from "section failed to load".

Header strip: `← Back to Orders` link (`/admin/orders`) and `Order #<id>` title.

### 5.5 Service & types

```ts
// services/adminOrderService.ts
import httpService from './httpService';

export interface AdminOrderListParams {
  student_ref?: number;
  name?: string;
  email?: string;
  order_no?: number;
  product_code?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

const adminOrderService = {
  search: (params: AdminOrderListParams) =>
    httpService.get<PaginatedResponse<AdminOrderListItem>>('/api/orders/admin/', { params })
              .then(r => r.data),
  getById: (id: number) =>
    httpService.get<AdminOrderDetail>(`/api/orders/admin/${id}/`).then(r => r.data),
};
```

Types in `types/admin-order.types.ts`:

```ts
export interface StudentSummary {
  student_ref: number | null;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminOrderListItem {
  id: number;
  created_at: string;
  total_amount: string;
  student: StudentSummary;
  item_codes: string[];
  item_count: number;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  updated_at: string;
  subtotal: string;
  vat_amount: string;
  vat_rate: string | null;
  vat_country: string | null;
  vat_calculation_type: string | null;
  calculations_applied: Record<string, unknown>;
  items: OrderItem[];
  payments: Payment[];
  user_contact: OrderContact | null;
  user_preferences: OrderPreference[];
  user_acknowledgments: OrderAcknowledgment[];
}
```

(Types for `OrderItem`, `Payment`, `OrderContact`, `OrderPreference`, `OrderAcknowledgment` mirror their serializer fields.)

## 6. Test plan (TDD)

Each task follows RED → GREEN → REFACTOR. `TodoWrite` tracks `tddStage`.

### Backend (`orders/tests/test_admin_views.py`)

- `test_list_requires_superuser` — anonymous & regular users get 403.
- `test_list_returns_orders_across_users` — superuser sees all.
- `test_filter_student_ref` / `test_filter_name_icontains` / `test_filter_email` / `test_filter_order_no` / `test_filter_product_code` / `test_filter_date_range`.
- `test_filters_compose_and_distinct` — multiple filters AND together; product-code filter does not return duplicate rows.
- `test_invalid_numeric_filters_return_empty` — non-integer `order_no` / `student_ref` → empty queryset (not 400).
- `test_ordering_whitelist` — only allowed fields accepted; unknown ordering ignored.
- `test_detail_payload_shape` — all 6 nested sections present, types correct.
- `test_detail_handles_missing_relations` — order with no contact/preferences/acks returns nulls / empty arrays cleanly.
- `test_query_count_under_threshold` — `assertNumQueries(<= 6)` on list endpoint.

### Frontend

- `OrderList.test.tsx` — renders rows from mocked service; filter inputs debounce (use jest fake timers); pagination calls service with new page; clicking View calls `navigate('/admin/orders/<id>')`; non-superuser → `<Navigate to="/" replace />`.
- `useOrderListVM.test.ts` — debounce timing, page reset on filter change, sort toggle 3-state cycle.
- `OrderDetail.test.tsx` — sections render, empty states for missing relations, 404 path shows error, non-superuser redirect.

**Coverage target:** 80%+ on new code (project standard).

## 7. Risks & open questions

1. **Permission class:** `IsAdminUser` (is_staff) vs custom `IsSuperUser` (is_superuser). LegacyOrderList uses `useAuth().isSuperuser` on the frontend; backend should match. Decide during planning; defaulting to `IsAdminUser` until told otherwise.
2. **URL shape:** `/api/orders/admin/` (lower-friction in-app mount) vs `/api/admin/orders/` (cleaner top-level prefix). Both are fine; spec uses the in-app mount.
3. **Product code combobox size:** preloading 10k options matches legacy precedent but adds ~hundreds of KB to initial admin page load. Acceptable for an admin-only page; revisit if it becomes a problem.
4. **`user_contact` cardinality:** model uses `related_name='user_contact'` (FK reverse → list-like) but business semantics are 0-or-1 per order. Spec serializes the first match; if multiple are ever inserted, only the first surfaces. Add a uniqueness constraint as a follow-up if confirmed 0-or-1.
5. **Order numbering:** spec treats `Order.id` as the order number. If the business prefers a separately-issued order number (with prefix/zero-padding), introducing a `display_order_no` field is a follow-up — out of scope here.

## 8. Implementation phases (high-level)

1. Backend: serializers (RED → GREEN → REFACTOR).
2. Backend: viewset + URL mount (RED → GREEN → REFACTOR).
3. Frontend: service + types.
4. Frontend: `useOrderListVM` (RED → GREEN → REFACTOR).
5. Frontend: `OrderList` page.
6. Frontend: `OrderDetail` page + VM.
7. Frontend: route registration in `App.js`.
8. Manual smoke test in browser, then full test suite + coverage check.

A detailed implementation plan with per-task RED/GREEN/REFACTOR breakdown will be authored next via the `writing-plans` workflow.
