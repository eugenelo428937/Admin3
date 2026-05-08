# Tutorial Event Admin Panel — Design Spec

- **Date:** 2026-05-07
- **Branch:** `feat/20260501-tutorial-attendance`
- **Status:** Approved (brainstorming complete; awaiting user review of this document)
- **Parent spec:** [2026-05-01-tutorial-choice-registration-attendance-design.md](2026-05-01-tutorial-choice-registration-attendance-design.md)
- **Author:** Claude + Eugene (pair-design)

## 1. Purpose and scope

Add an admin-only page at `/admin/tutorial-events` that lets superusers:

1. Browse `TutorialEvents` with rich filtering (subject, code, dates, location, venue, instructor, finalisation date).
2. Drill into each event's `TutorialSessions` via an in-row expander.
3. Record per-student attendance for any session whose `start_date` is in the past.

This spec covers **only newly-created records** (cart → order → registration). Legacy CSV-imported registrations and historic attendance backfill are explicitly **out of scope** — they were paused on 2026-05-07 pending data clarification.

### 1.1 Out of scope (v1)

- Editing or creating events / sessions (read-only browse).
- Bulk attendance ("mark all attended", CSV upload).
- Per-event detail page (the expand-row covers v1's needs).
- Mobile-optimised layout (admin panel is desktop-first).
- Realtime concurrency control on attendance (last write wins is acceptable at admin volumes).
- Surfacing attendance status in the events list (no `Attended/Absent` column on the table).

### 1.2 Success criteria

- A superuser can find any event for the current sitting in ≤ 3 clicks.
- Recording attendance for a 30-student session takes ≤ 1 minute.
- All endpoints respond in < 500ms p95 against a sitting with ~200 events.
- TDD: every endpoint and component has unit tests; new code coverage ≥ 80%.

## 2. Architecture overview (Approach 3 — eager sessions, lazy roster)

```
┌────────── Frontend (React + shadcn/ui) ──────────┐
│ /admin/tutorial-events                           │
│   ├─ TutorialEventList   (page)                  │
│   │    ├─ TutorialEventFilterBar                 │
│   │    └─ TutorialEventRow × N                   │
│   │         └─ AttendanceModal (on demand)       │
│   └─ Hooks                                        │
│        ├─ useTutorialEventListVM                 │
│        └─ useAttendanceVM                        │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   GET events/?...      GET / POST sessions/{id}/attendance/
        │                     │
┌───────┴─────────────────────┴────────────────────┐
│ Backend (Django + DRF)                           │
│   tutorials/admin_views.py                       │
│   tutorials/admin_serializers.py                 │
│   tutorials/admin_filters.py                     │
└──────────────────────────────────────────────────┘
        │                     │
        └─────────┬───────────┘
                  ▼
┌──────────────────────────────────────────────────┐
│ PostgreSQL  (acted schema)                       │
│   TutorialEvents · TutorialSessions ·            │
│   TutorialRegistration · TutorialAttendance ·    │
│   TutorialInstructor · Subject · ExamSession     │
└──────────────────────────────────────────────────┘
```

**Approach 3 trade-off:** sessions are embedded in the events list payload (small — typically 1-10 per event), but the per-session **roster** (registrations + existing attendance) is fetched lazily when the modal opens. This keeps the events list snappy while avoiding a per-expand spinner.

## 3. Backend design

### 3.1 File layout

```
backend/django_Admin3/tutorials/
├── admin_views.py            # NEW — AdminTutorialEventViewSet, AdminTutorialAttendanceView
├── admin_serializers.py      # NEW — list/detail/roster/save serializers
├── admin_filters.py          # NEW — _apply_filters helper(s)
├── urls.py                   # MODIFIED — register admin router
└── tests/
    ├── test_admin_event_list.py     # NEW
    ├── test_admin_attendance.py     # NEW
    └── test_admin_filters.py        # NEW
```

### 3.2 Endpoints

#### 3.2.1 `GET /api/tutorials/admin/events/`

Paginated list of events with sessions embedded.

- **ViewSet:** `AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet)`
- **Permission:** `IsSuperUser`
- **Pagination:** `PageNumberPagination` — `page_size=20`, `max_page_size=200`
- **Base queryset:** `TutorialEvents.objects.filter(cancelled=False)` with:
  - `select_related('venue', 'location', 'main_instructor__staff', 'store_product__exam_session_subject__subject', 'store_product__exam_session_subject__exam_session')`
  - `prefetch_related(Prefetch('sessions', queryset=sessions_qs))`
    where `sessions_qs` is `TutorialSessions.objects.order_by('sequence').prefetch_related('instructors__staff', 'venue').annotate(enrolled_count=Count('registrations', filter=Q(registrations__is_active=True)))`
- **Annotation:** `enrolled_distinct = Count('sessions__registrations__student', distinct=True, filter=Q(sessions__registrations__is_active=True))`

##### Query parameters

| Param | Type | Behaviour |
|---|---|---|
| `subject_codes` | CSV string | `store_product__exam_session_subject__subject__code__in=[...]` |
| `code` | string | `code__icontains` |
| `start_from` | `YYYY-MM-DD` | `start_date__gte` |
| `start_to` | `YYYY-MM-DD` | `start_date__lte` |
| `location_ids` | CSV ints | `location_id__in=[...]` |
| `venue_ids` | CSV ints | `venue_id__in=[...]` |
| `instructor_id` | int | `Q(main_instructor_id=N) \| Q(sessions__instructors__id=N)` + `.distinct()` |
| `finalisation_from` | `YYYY-MM-DD` | `finalisation_date__gte` |
| `finalisation_to` | `YYYY-MM-DD` | `finalisation_date__lte` |
| `sitting_id` | int or `all` | `store_product__exam_session_subject__exam_session_id=N`; `all` disables this filter |
| `ordering` | string | Whitelist: `start_date`, `-start_date`, `code`, `-code`, `end_date`, `-end_date` |
| `page`, `page_size` | int | DRF default |

**Default sitting:** if `sitting_id` is absent, the viewset injects the latest `ExamSession` ordered by `start_date` descending (the model has no archived flag — see `catalog/exam_session/models.py`; only `session_code`, `start_date`, `end_date` are defined). Frontend can override (specific id) or clear (`sitting_id=all`).

**Default ordering:** `start_date` ascending.

##### Response shape

```json
{
  "count": 123,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 42,
      "code": "CP1-01-24A",
      "subject": {"code": "CP1", "description": "Actuarial Practice"},
      "exam_session": {"id": 17, "session_code": "2024S"},
      "start_date": "2026-06-01",
      "end_date": "2026-06-15",
      "location": {"id": 1, "name": "London"},
      "venue": {"id": 5, "name": "BPP Centre"},
      "main_instructor": {"id": 7, "name": "Karen Smith"},
      "all_instructors": [
        {"id": 7, "name": "Karen Smith"},
        {"id": 9, "name": "Mark Davis"}
      ],
      "finalisation_date": "2026-05-15",
      "enrolled_distinct": 28,
      "sessions": [
        {
          "id": 101,
          "title": "CP1-01-24A-1",
          "sequence": 1,
          "start_date": "2026-06-01T09:00:00Z",
          "end_date":   "2026-06-01T17:00:00Z",
          "venue": {"id": 5, "name": "BPP Centre"},
          "instructors": [{"id": 9, "name": "Mark Davis"}],
          "enrolled_count": 28
        }
      ]
    }
  ]
}
```

#### 3.2.2 `GET /api/tutorials/admin/events/filter-options/`

Helper that populates the dropdowns. Cached per-process for 60s via `lru_cache` on a TTL-bound key.

```json
{
  "subjects":    [{"code": "CP1", "name": "..."}, ...],
  "locations":   [{"id": 1, "name": "London"}, ...],
  "venues":      [{"id": 5, "name": "BPP Centre"}, ...],
  "instructors": [{"id": 7, "name": "Karen Smith"}, ...],
  "sittings":    [{"id": 17, "code": "2024S"}, ...]
}
```

**Convention:** API field names mirror raw Django model fields wherever they exist (`description`, `session_code`, etc.) — no renames in serializers. The only synthesised field is `instructor.name`, which is composed.

Sources:
- `subjects` — `Subject.objects.filter(active=True, exam_session_subjects__products__store_products__events__isnull=False).distinct().order_by('code')`. Returned as `{code, description}`.
- `locations` — `TutorialLocation.objects.filter(is_active=True).order_by('name')`. Returned as `{id, name}`.
- `venues` — `TutorialVenue.objects.all().order_by('name')` (model has **no** `is_active` field; don't filter on it).
- `instructors` — `TutorialInstructor.objects.filter(is_active=True).select_related('staff__user')`. Returned as `{id, name}` where `name = staff.user.get_full_name() or staff.user.username` (mirrors `TutorialInstructor.__str__`); instructors with `staff IS NULL` are excluded.
- `sittings` — `ExamSession.objects.order_by('-start_date')`. Returned as `{id, session_code, start_date, end_date}`.

#### 3.2.3 `GET /api/tutorials/admin/sessions/{id}/attendance/`

Roster + existing attendance for one session.

- **View:** `AdminTutorialAttendanceView(APIView)` — a single-resource view (not a viewset). Implements `get()` and `post()` methods directly.
- **Permission:** `IsSuperUser`
- **Lookup:** `session_id` (URL kwarg) → `get_object_or_404(TutorialSessions, id=session_id, tutorial_event__cancelled=False)`.
- **404** if session does not exist or its event is `cancelled=True`.

##### Response shape

```json
{
  "session": {
    "id": 101,
    "title": "CP1-01-24A-1",
    "start_date": "2026-06-01T09:00:00Z",
    "end_date":   "2026-06-01T17:00:00Z",
    "venue": {"id": 5, "name": "BPP Centre"},
    "tutorial_event": {"id": 42, "code": "CP1-01-24A"}
  },
  "attendance_enabled": true,
  "registrations": [
    {
      "registration_id": 5001,
      "student": {"student_ref": 12345, "first_name": "Alice", "last_name": "Smith"},
      "current_status": "ATTENDED",
      "current_reason": ""
    },
    {
      "registration_id": 5002,
      "student": {"student_ref": 12346, "first_name": "Bob", "last_name": "Lee"},
      "current_status": null,
      "current_reason": ""
    }
  ]
}
```

- `attendance_enabled` ≡ `today >= session.start_date.date()` (UTC), computed server-side — non-spoofable.
- `registrations` includes only `is_active=True` rows; ordered by `student__last_name, student__first_name`.

#### 3.2.4 `POST /api/tutorials/admin/sessions/{id}/attendance/`

Upserts attendance for the session.

##### Request body

```json
{
  "items": [
    {"registration_id": 5001, "status": "ATTENDED", "reason": ""},
    {"registration_id": 5002, "status": "OTHER",    "reason": "Family emergency"}
  ]
}
```

##### Semantics

- Wrapped in `transaction.atomic()`.
- **Pre-flight:** if `attendance_enabled` is false, respond `409 Conflict` with `{detail: "...", code: "not_yet_open"}`.
- **Per-item validation** in serializer:
  - `registration_id` must belong to the URL session (`registration.tutorial_session_id == session_id`); else `400`.
  - `status` ∈ `STATUS_CHOICES`; else `400`.
  - `reason` non-blank when `status == 'OTHER'`; else `400`.
- **Upsert:** for each item, `TutorialAttendance.objects.update_or_create(registration_id=..., defaults={status, reason, recorded_by=request.user, recorded_at=now()})`.
- **Response:** `200` with the same shape as `GET` (so client can refresh state without an extra round-trip).

##### Audit

- `recorded_by` is always set from `request.user` (never trusted from the body).
- `recorded_at` is `timezone.now()` at upsert time.
- No additional audit log in v1; the `(recorded_by, recorded_at)` columns plus the registration FK are sufficient for "who marked X attended and when".

### 3.3 Permissions

```python
# already exists at catalog/permissions.py
class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)
```

Both viewsets use `permission_classes = [IsSuperUser]`.

### 3.4 URL routing

The current `tutorials/urls.py` already has a public `router` (registering `TutorialEventsViewSet` and `TutorialViewSet` at `events`). We add a **separate** admin router so paths don't collide with public ones, and add the attendance `APIView` as a stand-alone path.

```python
# additions to tutorials/urls.py
from tutorials.admin_views import (
    AdminTutorialEventViewSet,
    AdminTutorialAttendanceView,
)

admin_router = DefaultRouter()
admin_router.register(
    r'events',
    AdminTutorialEventViewSet,
    basename='admin-tutorial-events',
)

urlpatterns = [
    # ... existing entries ...
    path('admin/', include(admin_router.urls)),
    path(
        'admin/sessions/<int:session_id>/attendance/',
        AdminTutorialAttendanceView.as_view(),
        name='admin-tutorial-attendance',
    ),
] + router.urls   # existing public router stays intact
```

This produces:

- `GET /api/tutorials/admin/events/` (paginated list)
- `GET /api/tutorials/admin/events/{id}/` (auto-generated detail; not used by frontend in v1 but harmless)
- `GET /api/tutorials/admin/events/filter-options/` (custom action)
- `GET|POST /api/tutorials/admin/sessions/{id}/attendance/`

The attendance endpoint is an `APIView` (not registered with the router) because it's a single-resource view keyed by session id, not a collection.

## 4. Frontend design

### 4.1 File layout

```
frontend/react-Admin3/src/components/admin/tutorial-events/
├── TutorialEventList.tsx              # main page
├── TutorialEventRow.tsx               # one event + expanded sessions
├── TutorialEventFilterBar.tsx         # filter card
├── AttendanceModal.tsx                # the modal dialog
├── AttendanceRosterRow.tsx            # one student row in modal
├── useTutorialEventListVM.ts          # list page state + data fetching
├── useAttendanceVM.ts                 # modal state + save
└── __tests__/
    ├── TutorialEventList.test.tsx
    ├── TutorialEventRow.test.tsx
    ├── AttendanceModal.test.tsx
    ├── AttendanceRosterRow.test.tsx
    └── useAttendanceVM.test.ts
```

Plus a thin service wrapper (no business logic):

```
frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts
```

### 4.2 Routing and navigation

In `App.js`:

```js
const TutorialEventList = lazy(() => import('./components/admin/tutorial-events/TutorialEventList'));
// inside the AdminLayout-wrapped routes:
<Route path="tutorial-events" element={<TutorialEventList />} />
```

In `AppSidebar` (or top admin nav): a single top-level entry **"Tutorials"** routing to `/admin/tutorial-events`. (No sub-menu in v1; later tutorial-admin pages can convert this into a section.)

### 4.3 Components

#### 4.3.1 `TutorialEventList.tsx`

Orchestrates the page. Owns nothing — defers to `useTutorialEventListVM`.

```tsx
const TutorialEventList = () => {
  const { isSuperuser } = useAuth();
  const vm = useTutorialEventListVM();
  if (!isSuperuser) return <Navigate to="/" />;

  return (
    <AdminPage>
      <AdminPageHeader title="Tutorials" />
      <TutorialEventFilterBar vm={vm} />
      <AdminDataTable> ... </AdminDataTable>
      <AdminPagination state={vm.pagination} onChange={vm.setPagination} />
      {vm.attendanceTarget && (
        <AttendanceModal
          session={vm.attendanceTarget}
          onClose={vm.closeAttendance}
          onSaved={vm.handleAttendanceSaved}
        />
      )}
    </AdminPage>
  );
};
```

#### 4.3.2 `TutorialEventFilterBar.tsx`

shadcn `Card` containing one `<form>` with:

- **Subject** — multi-select combobox (driven by `vm.filterOptions.subjects`).
- **Code** — text `Input`, `code__icontains` semantics on backend; debounced 300ms.
- **Start date range** — two `DatePicker`s (`start_from`, `start_to`).
- **Location** — multi-select combobox.
- **Venue** — multi-select combobox.
- **Instructor** — single-select combobox (UNION semantics handled server-side).
- **Finalisation date range** — two `DatePicker`s (`finalisation_from`, `finalisation_to`).
- **Sitting** — single-select; defaults to "Current sitting" with a clear button to switch to "All sittings" (sends `sitting_id=all`).
- **Clear filters** button — resets to defaults (current sitting, no other filters, page=1).

Filter changes call `vm.setFilter(name, value)`. Any filter change resets pagination to `page=1`.

#### 4.3.3 `TutorialEventRow.tsx`

Renders **one event** as two `<TableRow>`s:

- Main row: chevron · Code · Start · End · Venue · Instructor (`"Karen Smith +2"` if multiple) · Enrolled · (right-aligned spacer for alignment with mini-table).
- Expanded row (rendered conditionally): single `<TableCell colSpan={n}>` containing an inner mini-table — one row per session: Title · Start · End · Venue · enrolled count · `...` menu.

The `...` menu is a shadcn `DropdownMenu` with a single item **Attendance**. The item is **disabled** (with tooltip `Available from {session.start_date | format}`) when `today < session.start_date`.

Clicking **Attendance** calls `vm.openAttendance(session)`.

#### 4.3.4 `AttendanceModal.tsx`

shadcn `Dialog` with `DialogContent` containing:

- **Header** (`DialogHeader`):
  - Title: session title
  - Description: dates (formatted) and venue
  - Close `X` (built into shadcn `DialogContent`)
- **Body**: scrollable list (`max-h-[60vh] overflow-y-auto`) of `AttendanceRosterRow`.
  - Loading state: 5 skeleton rows.
  - Error state: `<AdminErrorAlert>` with **Retry** (re-runs the GET).
  - Empty state ("No students enrolled in this session"): centred message; Save hidden.
- **Footer** (`DialogFooter`):
  - **Cancel** button (left) — calls `onClose`.
  - **Save** button (right):
    - Disabled when no roster row is dirty.
    - Disabled when any `OTHER` row has empty `reason` (and shows inline red border on those rows).
    - Disabled while `isSaving`.
    - Disabled when `attendanceVM.attendanceEnabled === false` (with tooltip).

#### 4.3.5 `AttendanceRosterRow.tsx`

```
[ Last, First (#student_ref) ]   [ Select status ▾ ]   [ Reason input — only when OTHER ]
```

- Status `Select` from shadcn — options ATTENDED / ABSENT / LATE / OTHER.
- When status changes from anything else *to* OTHER, the row gains an inline `Input` for reason next to the select. When changing *away from* OTHER, the row keeps the typed reason in component state but the API serialises `reason=""` for non-OTHER rows.
- Marking a row dirty: `dirty = (status !== current_status) || (status === 'OTHER' && reason !== current_reason)`.

### 4.4 View-model hooks

#### 4.4.1 `useTutorialEventListVM`

```ts
function useTutorialEventListVM() {
  // State
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [ordering, setOrdering] = useState<Ordering>({key: 'start_date', dir: 'asc'});
  const [pagination, setPagination] = useState({page: 1, pageSize: 20});
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [meta, setMeta] = useState<{count: number}>({count: 0});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [attendanceTarget, setAttendanceTarget] = useState<SessionLite | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  // Fetch on mount: filterOptions
  // Fetch on filters/ordering/pagination change: events list (debounced text inputs)
  // Methods: setFilter, clearFilters, toggleExpanded, openAttendance, closeAttendance,
  //          handleAttendanceSaved, setOrdering, setPagination, retry

  return { ... };
}
```

`DEFAULT_FILTERS` includes the current-sitting auto-pick (resolved on mount once `filterOptions.sittings` arrives).

#### 4.4.2 `useAttendanceVM`

```ts
function useAttendanceVM(sessionId: number) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [roster, setRoster] = useState<RosterRow[]>([]); // each row tracks dirty
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Methods:
  //   setStatus(regId, status)
  //   setReason(regId, reason)
  //   save()  -> POSTs all items, refreshes state from response
  //   reset() -> reverts dirty rows to current_status

  return { ... };
}
```

`save()` POSTs the **entire roster** (not just dirty rows). The server's upsert is idempotent and the cost (~30 queries on a busy session) is acceptable. On `200`, replaces local state from response.

### 4.5 Service wrapper

```ts
// services/admin/tutorialEventsAdminService.ts
export const tutorialEventsAdminService = {
  listEvents:    (params) => httpService.get('/api/tutorials/admin/events/', { params }),
  filterOptions: ()        => httpService.get('/api/tutorials/admin/events/filter-options/'),
  getAttendance: (sessionId) =>
    httpService.get(`/api/tutorials/admin/sessions/${sessionId}/attendance/`),
  saveAttendance: (sessionId, items) =>
    httpService.post(`/api/tutorials/admin/sessions/${sessionId}/attendance/`, { items }),
};
```

## 5. Data flow

### 5.1 Happy path — opening attendance

```
[user] expands event row     → no API call (sessions in payload)
[user] clicks "..." → "Attendance"
       ↓
useTutorialEventListVM.openAttendance(session)
  sets attendanceTarget = session
       ↓
[modal] mounts → useAttendanceVM
  GET /api/tutorials/admin/sessions/{id}/attendance/
       ↓
[modal] renders roster with current_status pre-selected
[user] toggles statuses, types reasons, clicks Save
       ↓
  POST same URL with { items: [...] }
       ↓
[server] transaction.atomic() → upsert all rows
       ↓
[modal] sonner toast "Attendance saved"; closes; vm.handleAttendanceSaved fires
```

### 5.2 Error matrix (backend)

| Condition | HTTP | Body shape |
|---|---|---|
| Non-superuser | 403 | DRF default |
| Unknown session id | 404 | `{detail: "Not found."}` |
| `attendance_enabled=false` on POST | 409 | `{detail: "Session has not started.", code: "not_yet_open"}` |
| `registration_id` not in this session | 400 | `{items: [{<idx>: "registration X does not belong to this session"}]}` |
| `status='OTHER'` and blank reason | 400 | `{items: [{<idx>: {reason: "Required when status is OTHER."}}]}` |
| Invalid status code | 400 | `{items: [{<idx>: {status: "Choice not in [...]"}}]}` |
| Unexpected server error | 500 | logged, generic message |

### 5.3 Error matrix (frontend UX)

| Failure | UX |
|---|---|
| List fetch fails | `<AdminErrorAlert>` above table with **Retry**; preserves filter state |
| Filter-options fetch fails | Dropdowns show "Failed to load options — retry"; other filters still usable |
| Attendance fetch fails | Modal shows `<AdminErrorAlert>` with **Retry**; **Cancel** still works |
| Attendance save 4xx with `items` errors | Inline red border + message under offending row(s); Save re-enables; toast "Some entries are invalid" |
| Attendance save 409 `not_yet_open` | Toast "Session not started yet"; modal closes |
| Attendance save 5xx / network | Toast "Save failed — please try again"; Save re-enables; no data loss in modal state |

## 6. Edge cases

| Case | Behaviour |
|---|---|
| Event with no sessions | Row renders; expand-row shows "No sessions scheduled"; chevron still works (returns empty mini-table). |
| Session with no registrations | Modal renders centred "No students enrolled"; Save button is hidden. |
| `is_active=False` registration | Hidden from roster (default manager filters). Historical attendance row stays in DB. |
| Cancelled event | Listed only if a future filter shows cancelled (out of scope v1); attendance endpoint returns 404 to be safe. |
| Stale `attendance_enabled` (modal opened pre-start) | GET says enabled=false; Save disabled with tooltip showing start time; user refreshes manually after time passes. |
| Two superusers saving simultaneously | Last write wins. Acceptable at admin volumes; no optimistic-lock token in v1. |
| Sitting filter mismatch with subject filter | No special handling — independent AND-combined filters; empty state renders if no events match. |
| Pagination after filter change | Reset to `page=1`. |
| Pagination after sort change | Preserved. |
| Dark mode | Inherits from `DarkModeProvider`; shadcn handles automatically. |
| Mobile viewport | Out of scope v1; modal scrolls naturally; table has horizontal scroll. |

## 7. Testing strategy (TDD per CLAUDE.md)

### 7.1 Backend tests

`tutorials/tests/test_admin_event_list.py`:

- `test_requires_superuser` — 403 for anon and regular user.
- `test_list_returns_events_with_sessions_embedded` — sessions present in serialised output.
- `test_enrolled_distinct_aggregation` — student enrolled in 2 sessions of same event counts once at event level, twice across `enrolled_count` per session.
- `test_default_sitting_filter_applied_when_param_absent` — only events from latest sitting returned.
- `test_sitting_id_all_sentinel_disables_filter` — passes through.
- `test_subject_codes_filter` — CSV → `__in` lookup.
- `test_code_icontains_filter` — substring match.
- `test_date_range_filter` — start_from / start_to.
- `test_location_and_venue_multi_select_filters`.
- `test_instructor_filter_union_main_and_session` — instructor X assigned only as session instructor still surfaces the event; same for main-only; `.distinct()` prevents duplicates.
- `test_finalisation_date_range_filter`.
- `test_ordering_whitelist_rejects_unsafe`.
- `test_pagination_default_and_max`.
- `test_filter_options_endpoint_returns_expected_keys`.
- `test_filter_options_cached_60s` (light — verify cache key behaviour, not actual TTL drift).

`tutorials/tests/test_admin_attendance.py`:

- `test_requires_superuser`.
- `test_get_returns_session_meta_and_roster`.
- `test_get_attendance_enabled_true_when_today_ge_start`.
- `test_get_attendance_enabled_false_when_today_lt_start`.
- `test_roster_excludes_inactive_registrations`.
- `test_roster_ordered_by_last_then_first_name`.
- `test_post_creates_attendance_rows`.
- `test_post_updates_existing_attendance_row` — upsert semantics.
- `test_post_rejects_other_with_blank_reason` — 400 with field error.
- `test_post_rejects_invalid_status` — 400.
- `test_post_rejects_registration_from_other_session` — 400.
- `test_post_rejects_when_attendance_not_enabled` — 409 with `code: not_yet_open`.
- `test_post_sets_recorded_by_to_request_user_not_body`.
- `test_post_returns_refreshed_get_shape`.
- `test_post_atomic_rollback_on_partial_failure` — one bad item rolls back the whole batch.

`tutorials/tests/test_admin_filters.py`:

- Unit-level tests of `_apply_filters` covering each clause in isolation (separate from viewset wiring).

### 7.2 Frontend tests (React Testing Library + Vitest/Jest)

`__tests__/TutorialEventList.test.tsx`:

- Renders `<Navigate to="/" />` when not superuser.
- Renders filter bar, table, pagination on superuser.
- Calls service `listEvents` on mount with default params.
- Resets pagination to 1 when a filter changes.
- Shows error alert with Retry when service rejects.

`__tests__/TutorialEventRow.test.tsx`:

- Chevron toggles expanded state; sessions render below.
- "..." menu item **Attendance** is disabled with tooltip when `today < session.start_date` (mock `Date`).
- Clicking **Attendance** calls `onOpenAttendance(session)` with the right session.

`__tests__/AttendanceModal.test.tsx`:

- Renders skeleton while loading; replaces with roster on success.
- Renders centred empty message when roster is empty; Save hidden.
- Selecting OTHER reveals `Input` for reason; Save disabled while reason is blank.
- Save button disabled when nothing dirty.
- Save POSTs to service with full items list; shows toast and closes on success.
- 4xx with `items` errors: highlights offending rows; toast "Some entries are invalid"; Save re-enables.
- 409 not_yet_open: toast and close.

`__tests__/useAttendanceVM.test.ts`:

- Initial GET populates session, attendanceEnabled, roster.
- `setStatus` marks row dirty; `setReason` marks dirty when current is OTHER.
- `save()` calls service with all items; replaces state with response on success.
- `save()` does not clear local state on failure.

### 7.3 Coverage and CI

- New code: ≥ 80% line coverage (CLAUDE.md threshold).
- Both `tutorials/tests/` and `frontend/.../__tests__/` run in the existing CI pipelines unchanged.
- Schema-placement check (`python manage.py verify_schema_placement`) — no new models in this spec, so this is unchanged.

## 8. Open questions / future work

- **"Attended" column on the events list.** Possibly useful for tutors auditing past sittings. Defer to v2.
- **Bulk attendance actions** (mark-all-attended). Defer to v2.
- **Historical/legacy attendance backfill.** Paused 2026-05-07 pending data clarification.
- **Per-event detail page** with summary metrics (total enrolled, attended %, by-session breakdown). Defer until a workflow needs it.
- **Concurrency token** on attendance save. Defer until duplication is observed.
- **Mobile layout.** Defer to v2.
- **Attendance audit timeline** ("who changed status from ATTENDED to ABSENT and when"). Defer until requested; the data is in the DB already (we'd need to retain history rows rather than upserting).

## 9. Acceptance checklist (for implementation phase)

- [ ] Backend: both viewsets implemented with `IsSuperUser`.
- [ ] Backend: all filter parameters honoured; default sitting works; `sitting_id=all` sentinel works.
- [ ] Backend: `enrolled_distinct` matches expected aggregation in tests.
- [ ] Backend: attendance upsert atomic; `recorded_by` set from request.
- [ ] Backend: 409 returned when `attendance_enabled=false`.
- [ ] Backend: 80%+ coverage on new code.
- [ ] Frontend: page renders at `/admin/tutorial-events`, gated by `isSuperuser`.
- [ ] Frontend: sidebar/topbar entry "Tutorials" added.
- [ ] Frontend: all filters working with debounced text input.
- [ ] Frontend: expand-row shows sessions; "..." menu disabled until session starts.
- [ ] Frontend: attendance modal with status select + conditional reason input.
- [ ] Frontend: empty / loading / error states match spec.
- [ ] Frontend: 80%+ coverage on new components and hooks.
- [ ] All existing tests still pass.
- [ ] Conventional-commit history.
