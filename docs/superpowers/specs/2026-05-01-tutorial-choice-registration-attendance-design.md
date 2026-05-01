# Tutorial Choice, Registration, Attendance & Swap — Design

**Date:** 2026-05-01
**Status:** Approved (design)
**Scope:** Backend data model, CSV import, swap workflow. UI work is out of scope for this spec.

## 1. Problem

Students who order a face-to-face tutorial product (Online Classroom is excluded) need to express a 1st/2nd/3rd choice of tutorial event at checkout. Staff enrol the student into one of those events in an external system. Admin3 ingests the resulting enrolment via a CSV full-sync. Once enrolled in an event, the student is registered to all of that event's sessions. Students can request to swap one session for another session of the same subject and course template; staff approve, perform the actual swap externally, and the next CSV sync reconciles. Per-session attendance is tracked.

## 2. Design Principles

- **Separate intent from state.** `TutorialChoice` is the immutable record of what the student wanted at order time. `TutorialRegistration` is the mutable record of where they're actually enrolled, owned by the CSV sync. Swaps and re-imports never rewrite history.
- **External system is the source of truth for enrolment.** Admin3 never directly mutates registrations in response to in-app actions (including swap approvals). Registration mutations flow exclusively through the CSV sync.
- **Soft-delete registrations.** Full sync removes rows by setting `is_active=False`, preserving history and supporting "what did the CSV say last week" queries plus swap audit trails.
- **One writer per table.** `TutorialChoice` written by checkout. `TutorialRegistration` written by CSV sync. `TutorialAttendance` written by attendance UI/API. `TutorialSessionSwap` written by student request + staff decision.

## 3. Data Model

All tables live in the existing `acted` PostgreSQL schema. Models added under `tutorials/models/` for proximity to existing tutorial models.

### 3.1 `TutorialChoice`

`db_table = '"acted"."tutorial_choices"'`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| order_item | FK → `orders.OrderItem` (CASCADE) | required |
| student | FK → `students.Student` (PROTECT) | denormalized for query simplicity |
| tutorial_event | FK → `tutorials.TutorialEvents` (PROTECT) | event-level, not session |
| choice_rank | PositiveSmallIntegerField | choices: 1, 2, 3; CHECK constraint enforces range |
| created_at, updated_at | timestamps | |

**Constraints**
- `UniqueConstraint(order_item, choice_rank)` — each rank exactly once per order item
- `UniqueConstraint(order_item, tutorial_event)` — can't pick the same event twice
- `CheckConstraint(choice_rank__in=[1,2,3])`

**Validation (`clean()`)** — application-level guard, no DB trigger:
- Reject if `tutorial_event.store_product` variation type is Online Classroom (see `ProductProductVariation` taxonomy).
- Verify `tutorial_event` subject matches `order_item`'s product subject.

### 3.2 `TutorialRegistration`

`db_table = '"acted"."tutorial_registrations"'`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| student | FK → `students.Student` (PROTECT) | |
| tutorial_session | FK → `tutorials.TutorialSessions` (PROTECT) | session-level |
| order_item | FK → `orders.OrderItem` (PROTECT) | NOT NULL |
| tutorial_choice | FK → `TutorialChoice` (SET_NULL, null) | which preference fulfilled this; null when CSV row could not be matched to a choice |
| is_active | Bool, default True | soft-delete for sync removal & swap supersession |
| import_batch | FK → `TutorialEnrolmentImport` (SET_NULL, null) | which CSV sync created this row |
| deactivated_at | DateTime, null | set when sync removes or swap supersedes |
| created_at, updated_at | timestamps | |

**Constraints**
- Partial unique index: `UniqueConstraint(student, tutorial_session, condition=Q(is_active=True))` — one *active* registration per student per session; inactive history preserved.

**Manager:** custom default manager filters `is_active=True`; `objects_all` available for history queries.

### 3.3 `TutorialAttendance`

`db_table = '"acted"."tutorial_attendance"'`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| registration | OneToOne → `TutorialRegistration` (CASCADE) | one row per registration |
| status | CharField | `ATTENDED / ABSENT / LATE / OTHER` |
| reason | TextField, blank | required iff `status=OTHER` (validated in `clean()`) |
| recorded_by | FK → `auth.User` (SET_NULL, null) | |
| recorded_at | DateTime | |
| created_at, updated_at | timestamps | |

Keying off `registration` (not `student + session` directly) means a swap automatically moves attendance with the registration via the FK.

### 3.4 `TutorialSessionSwap`

`db_table = '"acted"."tutorial_session_swaps"'`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| student | FK → `students.Student` (PROTECT) | |
| from_registration | FK → `TutorialRegistration` (PROTECT) | the active registration to swap out |
| to_session | FK → `tutorials.TutorialSessions` (PROTECT) | desired target session |
| reason | TextField | required from student |
| status | CharField | `PENDING / APPROVED / REJECTED / CANCELLED / APPLIED` |
| requested_at | DateTime | |
| decided_by | FK → `auth.User` (SET_NULL, null) | |
| decided_at | DateTime, null | |
| decision_note | TextField, blank | |
| applied_at | DateTime, null | set when next CSV sync confirms the swap landed |
| resulting_registration | FK → `TutorialRegistration` (SET_NULL, null) | populated on APPLIED |
| created_at, updated_at | timestamps | |

**Validation (`clean()`)**
- `to_session != from_registration.tutorial_session`
- `to_session.tutorial_event` and `from_registration.tutorial_session.tutorial_event` must share the same subject and same `course_template`.
- `from_registration.is_active == True` at request time.

**Constraints**
- Partial unique index: at most one `PENDING` swap per `from_registration`.

### 3.5 `TutorialEnrolmentImport`

`db_table = '"acted"."tutorial_enrolment_imports"'`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| filename | CharField | |
| uploaded_by | FK → `auth.User` (PROTECT) | |
| uploaded_at | DateTime | |
| status | CharField | `PENDING / DRY_RUN / COMMITTED / FAILED` |
| total_rows | Int | |
| created_count | Int | |
| reactivated_count | Int | |
| deactivated_count | Int | |
| unmatched_count | Int | |
| report | JSONField | per-row outcome for download/audit |
| committed_at | DateTime, null | |

## 4. Workflows

### 4.1 Swap state machine

```
       student submits
            ↓
        PENDING ──── student cancels ──→ CANCELLED
        │     │
  staff │     │ staff
 reject │     │ approve
        ↓     ↓
   REJECTED  APPROVED
                │
                │ next CSV sync detects
                │ student now in to_session
                ↓
              APPLIED  (resulting_registration populated, applied_at set)
```

Approval action is transactional but **does not mutate registrations** — it only records the decision. Staff then performs the change in the external system; the next CSV sync reconciles and flips status to `APPLIED`.

### 4.2 CSV import (full sync)

**Format:**
```
session_title, student_refs
"London Bloomsbury Day 1 (12 May 2026)", "12345;67890;54321"
```
One row per session. `student_refs` semicolon-delimited.

**Resolution:** `session_title` is globally unique → look up `TutorialSessions` → derive `tutorial_event` and `course_template` via existing FKs.

**Algorithm:**
1. Parse and validate all rows. Collect unmatched (unknown title, unknown `student_ref`) into the import report. Continue with valid rows.
2. Build target set `{(student_id, tutorial_session_id)}` from CSV.
3. Build current set of all `is_active=True` registrations whose `tutorial_session.tutorial_event` appears in the CSV's events. Scope is limited to events touched by this import — registrations for events not mentioned in the CSV are left untouched.
4. Diff:
   - In CSV, not in current → resolve `tutorial_choice` and `order_item` (see 4.3); INSERT new row, or reactivate matching inactive row by setting `is_active=True` and clearing `deactivated_at`.
   - In current, not in CSV → set `is_active=False`, `deactivated_at=now()`.
   - In both → no-op.
5. Post-pass: for each `APPROVED` swap touching this student, check whether `from_registration` is now inactive AND a new active registration exists for `to_session`. If so → mark swap `APPLIED`, set `applied_at`, link `resulting_registration`.
6. Wrap the entire sync (including swap reconciliation) in a single DB transaction. Persist `TutorialEnrolmentImport` regardless of outcome.

### 4.3 Order_item / choice resolution per registration row

For each `(student, session)` row from CSV:
- Find `TutorialChoice` rows where `student=student` AND `tutorial_event=session.tutorial_event` AND the parent `order_item` is active (i.e., not cancelled).
- Exactly one match → link both `order_item` and `tutorial_choice`.
- Multiple matches → link the one with the lowest `choice_rank` (1st preference wins). Log a warning row in the import report.
- Zero matches → registration **cannot** be created (since `order_item` is NOT NULL). Add to `unmatched` with reason `"no matching order/choice"`.

### 4.4 Management command

```
python manage.py import_tutorial_enrolments <path/to/file.csv> [--dry-run] [--commit]
```
- `--dry-run` (default): produces report only; `TutorialEnrolmentImport.status=DRY_RUN`.
- `--commit`: applies changes; `status=COMMITTED`.

## 5. API surface (sketch — full design in implementation plan)

- `POST /api/tutorials/choices/` — create choices for an order item (called from checkout).
- `GET /api/tutorials/registrations/?student=<id>` — student's own registrations.
- `POST /api/tutorials/swaps/` — student submits swap request.
- `POST /api/tutorials/swaps/<id>/approve/` — staff approval.
- `POST /api/tutorials/swaps/<id>/reject/` — staff rejection.
- `POST /api/tutorials/attendance/` — record attendance for a registration.
- `POST /api/tutorials/imports/` — upload CSV (multipart), triggers dry-run.
- `POST /api/tutorials/imports/<id>/commit/` — commit a previously dry-run import.

## 6. Assumptions

1. `TutorialEvents` has (or will have) a way to derive `course_template` for the swap "same course template" validation. If absent, the implementation plan adds the FK as a precursor task.
2. Choices are captured at order placement; UI work is out of scope here. Until UI lands, choices can be created via the API directly.
3. Attendance recording UI is out of scope; only model + API.
4. No notifications wired in this iteration. Swap state transitions emit Django signals so the rules engine or a future notification service can subscribe later.
5. Manual registration creation is disallowed at the API level — registrations flow exclusively via CSV sync (since `order_item` is required and `TutorialEnrolmentImport.uploaded_by` provides the audit trail).
6. Inactive registrations are excluded from default querysets via a custom manager; a separate `objects_all` manager exposes history.

## 7. Out of scope

- Frontend choice-selection UI at checkout.
- Frontend swap-request UI for students.
- Staff swap-approval UI.
- Attendance recording UI / instructor interface.
- Email notifications on swap state changes.
- Drop-in attendance (attending a session not registered to).

## 8. Testing strategy (high level)

- Model-level: `clean()` validators (OC exclusion, swap subject/template match, attendance reason-required-when-OTHER), constraint enforcement (partial unique indexes), soft-delete manager behaviour.
- Service-level: CSV import diff algorithm with fixtures covering insert/reactivate/deactivate/unmatched/multiple-choice-resolution, swap reconciliation post-pass, transaction rollback on parse failure.
- API-level: choice creation rejects OC, swap approval is no-op on registrations, dry-run vs commit semantics.
- Integration: full round-trip — order → choices → CSV sync → registrations → attendance → swap request → approval → re-import → APPLIED.

All tests run against PostgreSQL (per project standard). Schema placement verified by `manage.py verify_schema_placement`.
