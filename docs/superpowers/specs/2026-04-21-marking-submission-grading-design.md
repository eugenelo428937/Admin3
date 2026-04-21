# Marking Submission, Grading, and Feedback Models — Design

**Date:** 2026-04-21
**App:** `marking`
**Status:** Draft (pending user review)

## Purpose

Staff need visibility in the Admin Panel into the lifecycle of a marked paper:
student submits an assignment or mock exam → staff allocates the submission to
a marker → the marker grades it → the student leaves feedback on the marking.

The authoritative source for this data is an external system. Admin3 receives
imported rows and surfaces them in the custom Admin Panel. **This spec covers
the models, migration, Django admin registration, and read-only REST API only.**
Import tooling is a later phase.

## Scope

**In scope**

- Four new Django models in the existing `marking` app:
  `Marker`, `MarkingPaperSubmission`, `MarkingPaperGrading`, `MarkingPaperFeedback`.
- Single migration creating the four tables in the `acted` schema.
- Django admin registrations (zero-cost developer visibility).
- Read-only DRF ViewSets exposed at `/api/admin/marking/...` behind `IsSuperUser`.
- Unit and API tests (TDD-first per `CLAUDE.md`).

**Out of scope**

- React admin-panel pages (follow-on phase, matches pattern from spec
  `20260216-admin-panel`).
- Data import / synchronization from the external system.
- Write endpoints (`POST`/`PATCH`/`DELETE`). Read-only is intentional — the
  external importer is authoritative.

## Architectural Decisions

1. **Admin surface: Custom Admin Panel (option B).** REST API consumed by a
   React page, not raw Django admin. Django admin is still registered as a
   developer convenience.
2. **`staff.id` FK resolves to `staff.Staff`.** Admin3 has an existing
   `staff.Staff` model (`"acted"."staff"`, OneToOne to `auth.User`). Markers,
   by contrast, link directly to `auth.User` per the spec — markers may be
   external contractors.
3. **`on_delete` pattern: PROTECT for audit-critical FKs, CASCADE for
   tight ownership chains.**
   - Submission.student / Submission.marking_paper / Submission.marking_voucher /
     Submission.order_item / Grading.marker / Grading.allocate_by
     → **PROTECT** (preserves audit history; blocks accidental deletes).
   - Grading.submission → **CASCADE** (grading belongs to submission).
   - Feedback.grading → **CASCADE** (feedback belongs to grading).
   - Rationale: matches `staff.Staff` (audit-preserving). Imported reference
     data should not evaporate when an upstream entity is removed.
4. **Uniqueness.**
   - `(student, marking_paper)` unique on Submission — one submission per paper
     per student; resubmission replaces the row.
   - `submission` unique on Grading — one grading per submission.
5. **Nullability.** FK and timestamp fields that are populated later in the
   workflow are nullable, because the importer may land a row before the
   downstream step has happened:
   - Submission: `marking_voucher`, `order_item`, `hub_download_date` nullable.
   - Grading: `submission_date`, `hub_download_date`, `hub_upload_date`, `score` nullable.
   - Feedback: `grade`, `hub_download_date` nullable; `comments` blank-allowed.
6. **Audit timestamps.** Every new model has `created_at` and `updated_at`.
   Matches `staff.Staff`, `marking_vouchers.MarkingVoucher`. Invaluable for
   debugging import issues (distinguishes "when the event happened" from
   "when Admin3 learned about it").
7. **Schema.** All tables in `acted` schema with double-quoted
   `db_table = '"acted"."..."'` format, matching `CLAUDE.md` convention.

## Model Definitions

### `marking.Marker`

Table: `"acted"."markers"`

| Field         | Type                                                                   |
|---------------|------------------------------------------------------------------------|
| `user`        | `OneToOneField(settings.AUTH_USER_MODEL, on_delete=PROTECT, related_name='marker')` |
| `initial`     | `CharField(max_length=10)`                                             |
| `created_at`  | `DateTimeField(auto_now_add=True)`                                     |
| `updated_at`  | `DateTimeField(auto_now=True)`                                         |

### `marking.MarkingPaperSubmission`

Table: `"acted"."marking_paper_submissions"`

| Field                | Type                                                                       |
|----------------------|----------------------------------------------------------------------------|
| `student`            | `ForeignKey('students.Student', on_delete=PROTECT, related_name='submissions')` |
| `marking_paper`      | `ForeignKey('marking.MarkingPaper', on_delete=PROTECT, related_name='submissions')` |
| `marking_voucher`    | `ForeignKey('marking_vouchers.MarkingVoucher', on_delete=PROTECT, null=True, blank=True, related_name='submissions')` |
| `order_item`         | `ForeignKey('orders.OrderItem', on_delete=PROTECT, null=True, blank=True, related_name='marking_submissions')` |
| `submission_date`    | `DateTimeField()`                                                          |
| `hub_download_date`  | `DateTimeField(null=True, blank=True)`                                     |
| `created_at`         | `DateTimeField(auto_now_add=True)`                                         |
| `updated_at`         | `DateTimeField(auto_now=True)`                                             |

Constraints: `UniqueConstraint(fields=['student', 'marking_paper'], name='uq_submission_student_paper')`.

### `marking.MarkingPaperGrading`

Table: `"acted"."marking_paper_gradings"`

| Field                | Type                                                                       |
|----------------------|----------------------------------------------------------------------------|
| `submission`         | `OneToOneField('marking.MarkingPaperSubmission', on_delete=CASCADE, related_name='grading')` |
| `marker`             | `ForeignKey('marking.Marker', on_delete=PROTECT, related_name='gradings')`  |
| `allocate_date`      | `DateTimeField()`                                                          |
| `allocate_by`        | `ForeignKey('staff.Staff', on_delete=PROTECT, related_name='allocated_gradings')` |
| `submission_date`    | `DateTimeField(null=True, blank=True)`                                     |
| `hub_download_date`  | `DateTimeField(null=True, blank=True)`                                     |
| `hub_upload_date`    | `DateTimeField(null=True, blank=True)`                                     |
| `score`              | `IntegerField(null=True, blank=True)`                                      |
| `created_at`         | `DateTimeField(auto_now_add=True)`                                         |
| `updated_at`         | `DateTimeField(auto_now=True)`                                             |

Note: `OneToOneField` on `submission` enforces the "one grading per submission" uniqueness.

### `marking.MarkingPaperFeedback`

Table: `"acted"."marking_paper_feedbacks"`

| Field                | Type                                                                       |
|----------------------|----------------------------------------------------------------------------|
| `grading`            | `OneToOneField('marking.MarkingPaperGrading', on_delete=CASCADE, related_name='feedback')` |
| `grade`              | `CharField(max_length=1, choices=GRADE_CHOICES, null=True, blank=True)` where `GRADE_CHOICES = [('E','Excellent'),('G','Good'),('A','Average'),('P','Poor')]` |
| `comments`           | `TextField(blank=True, default='')`                                        |
| `submission_date`    | `DateTimeField()`                                                          |
| `hub_download_date`  | `DateTimeField(null=True, blank=True)`                                     |
| `created_at`         | `DateTimeField(auto_now_add=True)`                                         |
| `updated_at`         | `DateTimeField(auto_now=True)`                                             |

The `student` FK from the original spec is dropped. The chain
Submission → Grading → Feedback is 1:1:1, so the student is derivable via
`feedback.grading.submission.student`. `grading` is `OneToOneField` (not
`ForeignKey`) to enforce one feedback row per grading, matching the
single-grading-per-submission rule.

## File Layout

```
marking/
  models/
    __init__.py                        # re-export all 5 models
    marking_paper.py                   # EXISTING — unchanged
    marker.py                          # NEW
    marking_paper_submission.py        # NEW
    marking_paper_grading.py           # NEW
    marking_paper_feedback.py          # NEW
  admin.py                             # UPDATE — register 4 new models
  serializers.py                       # UPDATE — 4 new ModelSerializers
  views.py                             # UPDATE — 4 ReadOnlyModelViewSets
  urls.py                              # UPDATE — register DRF router for admin/marking/
  migrations/
    0005_add_submission_grading_feedback.py   # NEW
  tests/
    test_models.py                     # UPDATE — ~10 new tests
    test_views.py                      # UPDATE — ~5 new tests
```

## Django Admin

Each of the four new models registered with:

- `list_display` showing the discriminating fields (e.g. Submission: `id`,
  `student`, `marking_paper`, `submission_date`, `hub_download_date`).
- `list_filter` on date fields and FK status.
- `search_fields` on related identifiers (e.g. `student__user__email`,
  `marker__user__email`).
- `raw_id_fields` for all FKs (student/marker/staff/user/order lists are large).
- `readonly_fields = ('created_at', 'updated_at')`.

## REST API

Permission: `IsSuperUser` (imported from `catalog.permissions`, matches the
pattern from spec `20260216-admin-panel-api`). All viewsets are
`ReadOnlyModelViewSet`. Mounted inside the existing `marking.urls` module
(the project URL conf already includes `marking.urls` at `/api/markings/`),
following the `students.urls` pattern of a separate `admin_router`.

| Endpoint                                      | Filter query params                                      |
|-----------------------------------------------|----------------------------------------------------------|
| `GET /api/markings/admin-markers/`            | `user` (id), `initial`                                   |
| `GET /api/markings/admin-submissions/`        | `student`, `marking_paper`, `submission_date__gte/lte`   |
| `GET /api/markings/admin-gradings/`           | `marker`, `submission`, `score__gte/lte`, `allocate_date__gte/lte` |
| `GET /api/markings/admin-feedback/`           | `grade`, `grading`, `grading__submission__student`       |

Serializers return nested shallow summaries for FK relationships (e.g.
Submission includes `{ id, student_ref, student_name, marking_paper_name, ... }`)
to avoid N+1 on the frontend. `select_related` / `prefetch_related` applied in
the viewset `get_queryset()` method.

Pagination: default DRF pagination (matches project convention).

## Migration

Single migration `marking/migrations/0005_add_submission_grading_feedback.py`:

- Dependencies: `marking.0004_alter_markingpaper_store_product`, `students`,
  `marking_vouchers`, `orders`, `staff`.
- Operations: `CreateModel` × 4 — no data migration required, no schema move.
- `Meta.db_table` uses quoted schema format: `'"acted"."markers"'`, etc.
- `UniqueConstraint` on `(student, marking_paper)` for
  `MarkingPaperSubmission`. Grading's single-submission constraint is enforced
  implicitly by `OneToOneField`.

## Test Plan

Following the TDD flow in `CLAUDE.md`: write failing tests first, then
implement, then refactor. All tests run with
`DJANGO_SETTINGS_MODULE=django_Admin3.settings.test`.

### `marking/tests/test_models.py` (extend)

1. `test_marker_creation` — save and retrieve a Marker.
2. `test_marker_user_is_onetoone` — creating a second Marker for the same user raises `IntegrityError`.
3. `test_submission_creation_required_fields_only` — save with nullable FKs/timestamps `=None`.
4. `test_submission_unique_student_paper` — duplicate raises `IntegrityError`.
5. `test_submission_protect_on_student_delete` — deleting the student raises `ProtectedError`.
6. `test_grading_creation` — save and retrieve.
7. `test_grading_cascades_from_submission_delete` — deleting the submission removes the grading.
8. `test_grading_protect_on_marker_delete` — deleting the marker raises `ProtectedError`.
9. `test_feedback_grade_choices` — valid grades save; invalid grade fails `full_clean()`.
10. `test_feedback_cascades_from_grading_delete`.
11. `test_str_methods` — each `__str__` contains the discriminating identifier.

### `marking/tests/test_views.py` (extend)

1. `test_submissions_list_requires_superuser` — 403 for staff, 200 for superuser.
2. `test_submissions_list_returns_paginated` — seeds 3 rows, list returns them.
3. `test_gradings_filter_by_marker` — query param narrows results.
4. `test_feedback_filter_by_grade`.
5. `test_markers_retrieve_detail`.

## Open Questions (for later phases, not blocking this spec)

- Import tool: CLI command vs webhook listener vs scheduled poll?
- Does the external system send deltas or full snapshots?
- Should the admin panel surface aggregate stats (avg score per marker, etc.)?
  If yes, add `/summary` endpoints and chart components in the React phase.

## References

- `CLAUDE.md` — schema conventions, TDD process, API endpoint conventions.
- Spec `20260216-admin-panel-api` — permission class and viewset pattern to mirror.
- `backend/django_Admin3/marking/models/marking_paper.py` — existing pattern
  the new models are consistent with.
- `backend/django_Admin3/staff/models/staff.py` — source of the `PROTECT`
  on-delete pattern we're adopting for audit-critical FKs.
