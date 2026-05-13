# Tutorial Instructor Attendance — Design

**Date:** 2026-05-11
**Status:** Approved (brainstorming phase complete)
**Delivery shape:** Single spec, 3-phase implementation plan

## Summary

Tutors must be able to record student attendance for their own tutorial sessions without logging into Admin3. Each morning at 06:00, a Django management command emails every instructor whose sessions run the next day. Each email contains a generated Excel roster and a personalised magic link that opens a public, login-free attendance page valid for 7 days. Tutors can submit attendance either by editing selects inline or by uploading the filled spreadsheet. The same attendance editor is reused by the existing admin AttendanceModal.

## Goals

- Tutors record attendance with zero login friction, within 7 days of the session.
- Admin staff retain the existing AttendanceModal experience for after-the-fact corrections.
- Excel and inline flows write to the same `TutorialAttendance` rows; either flow can be used multiple times within the window.
- Idempotent daily job — re-running the cron does not produce duplicate emails.

## Non-goals

- Email-reply parsing (tutor cannot reply to the email with the filled xlsx — they must use the link or upload via the page).
- Token revocation prior to natural expiry. (If needed later, the existing log table can grow a `revoked_at` field — non-breaking upgrade.)
- Self-service link regeneration by tutors. Admins re-trigger by removing the matching `TutorialAttendanceEmailLog` row and re-running the command for that session.
- Mobile-optimised xlsx upload (xlsx editing is a desktop activity in practice).
- "Company" data integration — column is intentionally blank for v1.

## Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Instructor scope | One email per (session, instructor); each instructor gets their own link |
| Link auth | `django.core.signing.TimestampSigner`, salt `tutorials.attendance_link.v1`, payload `{session_id, instructor_id, issued_at}` |
| Link lifetime | 7 days, re-editable until expiry |
| Excel row identity | Visible `Student Ref` column |
| Excel upload | Per-row upsert; blank Attendance cells skipped silently |
| Cron dedup | New `TutorialAttendanceEmailLog(session, instructor, sent_at, email_queue_id, token_issued_at)` table with `unique_together = (session, instructor)` |
| Public page UX | Full-page route at `/instructor/attendance/:token`; extract shared `AttendanceRosterPanel` consumed by admin modal too |
| Status colors | Coloured options in dropdown + tinted trigger after selection. Defined via CSS variables. |
| LATE reason | Unchanged — only OTHER requires a reason |
| Company column | Blank for now (placeholder); column ships but is never populated |

## User flow

```
06:00 daily  ──► cron triggers `send_tutorial_attendance_emails`
                 (Django management command)
                  │
                  └──► For each TutorialSession starting tomorrow:
                       For each instructor on the session:
                          1. Skip if (session, instructor) already in TutorialAttendanceEmailLog
                          2. Generate Excel roster (xlsx in memory)
                          3. Generate signed link via TimestampSigner
                          4. Queue email via existing EmailQueue (with xlsx attachment)
                          5. Insert TutorialAttendanceEmailLog row
                                                  │
                                                  ▼
                                          process_email_queue
                                                  │
                                                  ▼
                                        Email lands in tutor's inbox
                                                  │
                                                  ▼
                       Tutor clicks "Enter attendance" link
                                                  │
                                                  ▼
                       Browser → /instructor/attendance/<token>
                       1. Backend verifies token (HMAC + max_age 7d)
                       2. Decodes {session_id, instructor_id}
                       3. Returns session info + roster (existing statuses if any)
                                                  │
                                                  ▼
                       Instructor either:
                          (a) Clicks each row's select, then "Save"
                          (b) Uploads filled xlsx → server parses, upserts, returns refreshed roster
                                                  │
                                                  ▼
                       Public API writes TutorialAttendance with recorded_by=instructor.staff.user
                       Audit row written to TutorialAttendanceLinkAccess
```

## Data model

### New: `TutorialAttendanceEmailLog`

Schema: `acted`. Table name: `"acted"."tutorial_attendance_email_log"`.

| Column | Type | Notes |
|---|---|---|
| `id` | BigAutoField | PK |
| `session_id` | FK → `TutorialSessions` | `on_delete=CASCADE`, `related_name='attendance_email_logs'` |
| `instructor_id` | FK → `TutorialInstructor` | `on_delete=CASCADE` |
| `sent_at` | DateTimeField | `auto_now_add=True` |
| `email_queue_id` | FK → `email_system.EmailQueue` | `null=True, blank=True, on_delete=SET_NULL` |
| `token_issued_at` | DateTimeField | The `issued_at` baked into the signed token |
| Constraint | `unique_together = (session, instructor)` | Idempotency guard |

### New: `TutorialAttendanceLinkAccess` (audit log)

Schema: `acted`. Table name: `"acted"."tutorial_attendance_link_access"`. Write-only from app code; never exposed via API.

| Column | Type | Notes |
|---|---|---|
| `id` | BigAutoField | PK |
| `session_id` | FK → `TutorialSessions` | `on_delete=CASCADE` |
| `instructor_id` | FK → `TutorialInstructor` | `on_delete=SET_NULL, null=True` (may have left) |
| `action` | CharField | choices: `view`, `save`, `upload`, `reject` |
| `accessed_at` | DateTimeField | `auto_now_add=True`, indexed `(session, accessed_at)` |
| `ip_address` | GenericIPAddressField | nullable |
| `user_agent` | CharField(512) | nullable, blank |
| `detail` | JSONField | `default=dict, blank=True`; row counts, error summaries |

### Unchanged

- `TutorialAttendance` — no fields added. Existing `clean()` validation (OTHER requires reason) is reused.
- `TutorialSessions`, `TutorialEvents`, `TutorialRegistration`, `Student`, `TutorialInstructor` — read-only consumers.

## Backend architecture

### Module map

```
tutorials/
├── models/
│   ├── tutorial_attendance_email_log.py        ← NEW
│   └── tutorial_attendance_link_access.py      ← NEW (Phase 2)
├── services/
│   ├── attendance_link.py                      ← NEW: signed-URL wrapper
│   ├── attendance_roster_xlsx.py               ← NEW: openpyxl generator
│   └── attendance_xlsx_parser.py               ← NEW: openpyxl reader for upload (Phase 3)
├── management/
│   └── commands/
│       └── send_tutorial_attendance_emails.py  ← NEW: daily 6am cron
├── public_views.py                              ← NEW: 3 AllowAny endpoints
├── public_urls.py                               ← NEW: routed at /api/tutorials/public/
└── tests/
    ├── test_attendance_link.py
    ├── test_attendance_roster_xlsx.py
    ├── test_attendance_xlsx_parser.py
    ├── test_send_tutorial_attendance_emails.py
    └── test_public_attendance_views.py

email_system/migrations/
└── 0NNN_seed_tutorial_attendance_template.py   ← NEW: MJML template fixture
```

### Service contracts

**`attendance_link.AttendanceLinkSigner`**

```python
@dataclass(frozen=True)
class AttendanceLinkPayload:
    session_id: int
    instructor_id: int
    issued_at: datetime

class ExpiredLink(Exception): ...
class InvalidLink(Exception): ...

class AttendanceLinkSigner:
    """Sign and verify (session_id, instructor_id) magic-link tokens."""
    SALT = 'tutorials.attendance_link.v1'
    MAX_AGE = 60 * 60 * 24 * 7  # 7 days

    def sign(self, session_id: int, instructor_id: int) -> tuple[str, datetime]:
        """Return (token, issued_at). issued_at is also persisted in TutorialAttendanceEmailLog."""

    def unsign(self, token: str) -> AttendanceLinkPayload:
        """Verify HMAC + max_age. Raises ExpiredLink / InvalidLink."""
```

Wraps `django.core.signing.TimestampSigner`. Versioned salt allows future rotation by bumping `v1`→`v2`.

**`attendance_roster_xlsx.generate_roster_xlsx(session) -> bytes`**

Returns an in-memory xlsx (BytesIO). Columns:

| Title | First Name | Last Name | Student Ref | Email | Company | Attendance |
|---|---|---|---|---|---|---|

- `Student Ref` is the join key on upload.
- `Company` is blank.
- `Attendance` cells in data rows carry an `openpyxl.worksheet.datavalidation.DataValidation` of `type="list"`, `formula1='"ATTENDED,ABSENT,LATE,OTHER"'`.
- Header row is bold and frozen via `ws.freeze_panes = 'A2'`.
- A second "Meta" sheet stores `session_id`, `event_code`, `session_date`, `generated_at` for tutor reference.

**`attendance_xlsx_parser.parse_attendance_xlsx(file, session) -> ParseResult`**

```python
@dataclass
class ParseRow:
    student_ref: int
    status: AttendanceStatus  # 'ATTENDED' | 'ABSENT' | 'LATE' | 'OTHER'
    reason: str  # may be empty

@dataclass
class ParseResult:
    rows: list[ParseRow]
    skipped_blank: int
    errors: list[str]  # row-number-prefixed messages
```

- Reads sheet 1 only.
- `openpyxl.load_workbook(file, read_only=True, data_only=True)` — disables formula evaluation as a defence against formula injection.
- Validates each `student_ref` belongs to a `TutorialRegistration` for the given session (rejects foreign refs).
- Validates `status` against the enum, case-insensitive.
- Silently skips rows with blank Attendance.
- Returns soft errors per row; the caller (upload view) decides commit-good-rows vs reject.

**`management/commands/send_tutorial_attendance_emails.py`**

Flags:
- `--dry-run` — log only; no DB writes, no queued emails.
- `--for-date YYYY-MM-DD` — override "tomorrow" for ad-hoc testing.
- `--session-id N` — operate on a single session.

Algorithm:

```python
target_date = options['for_date'] or (timezone.localdate() + timedelta(days=1))
sessions = TutorialSessions.objects.filter(
    start_date__date=target_date,
    tutorial_event__cancelled=False,
).prefetch_related(
    'instructors__staff__user',
    'registrations__student__user',
)

for session in sessions:
    for instructor in session.instructors.all():
        if not instructor.staff or not instructor.staff.user.email:
            logger.warning(
                'skip: instructor has no email',
                extra={'session_id': session.id, 'instructor_id': instructor.id},
            )
            continue

        # Pre-check for idempotency (cheap, common case). The unique_together
        # constraint on (session, instructor) is the authoritative backstop
        # for concurrent runs (see except IntegrityError below).
        if TutorialAttendanceEmailLog.objects.filter(
            session=session, instructor=instructor,
        ).exists():
            continue

        xlsx_bytes = generate_roster_xlsx(session)
        token, issued_at = signer.sign(session.id, instructor.id)

        try:
            with transaction.atomic():
                queue_row = email_service.queue_email(
                    template_name='tutorial_attendance_reminder',
                    to_emails=[instructor.staff.user.email],
                    context={
                        'instructor_name': instructor.staff.user.get_full_name(),
                        'session_title': session.title,
                        'session_date': session.start_date,
                        'venue': session.venue.name if session.venue else '',
                        'magic_link': f'{settings.FRONTEND_BASE_URL}/instructor/attendance/{token}',
                    },
                    attachments=[{
                        'filename': f'attendance_{event_code}_{date}.xlsx',
                        'content': xlsx_bytes,
                        'mime_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    }],
                )
                TutorialAttendanceEmailLog.objects.create(
                    session=session, instructor=instructor,
                    email_queue=queue_row, token_issued_at=issued_at,
                )
        except IntegrityError:
            # A concurrent run won the race. Roll back the queued email row
            # along with the failed log insert (transaction.atomic rolls back
            # the queue insert too). Continue with next instructor.
            continue
```

Each (session, instructor) pair runs in its own `transaction.atomic()` so the queue row and log row commit together or not at all. If `queue_email` raises, both roll back. If the log insert raises `IntegrityError` (concurrent duplicate), the queue insert rolls back with it — no orphan emails.

### Public API endpoints

All under `/api/tutorials/public/`, all `AllowAny`, all token-validated.

| Method | Route | Body | Returns |
|---|---|---|---|
| `GET` | `attendance/<token>/` | — | `{session: {...}, instructor: {name}, roster: [...], token_expires_at}` |
| `POST` | `attendance/<token>/` | `{items: [{registration_id, status, reason}]}` | Refreshed roster |
| `POST` | `attendance/<token>/upload-xlsx/` | `multipart` with xlsx | Refreshed roster + `{rows_applied, skipped_blank, errors}` |

All three call `signer.unsign(token)` first.
- On `ExpiredLink` → `410 Gone` body `{code: 'token_expired'}`.
- On `InvalidLink` → `400 Bad Request` body `{code: 'invalid_token'}` (no further diagnostic leak).

Each successful call writes a `TutorialAttendanceLinkAccess` row (view / save / upload). Each rejected call writes one with `action='reject'`.

The save endpoint reuses the existing serializer logic extracted from `AdminTutorialAttendanceView` (`tutorials/admin_views.py:130-193`) — the shared service ensures admin and public flows produce identical results. `recorded_by` is set to `instructor.staff.user` (the human behind the link), not the request user (anonymous).

**Defence in depth (save endpoint):** the view rejects any `registration_id` whose `tutorial_session_id` differs from the token's `session_id`, even though the frontend would not send such an item. This guards against a tampered POST body.

## Frontend architecture

### File map

```
frontend/react-Admin3/src/
├── components/
│   ├── shared/
│   │   └── attendance/                              ← NEW shared module
│   │       ├── AttendanceRosterPanel.tsx            ← extracted from admin modal
│   │       ├── AttendanceStatusSelect.tsx           ← color-coded select
│   │       ├── attendanceStatusTokens.ts            ← color constants
│   │       ├── useAttendanceVM.ts                   ← MOVED from admin/tutorial-events/
│   │       └── types.ts                              ← MOVED + extended
│   ├── admin/tutorial-events/
│   │   ├── AttendanceModal.tsx                       ← thinned: wraps panel in Dialog
│   │   └── AttendanceRosterRow.tsx                   ← DELETED (folded into panel)
│   └── instructor/
│       └── attendance/                                ← NEW public route components
│           ├── InstructorAttendancePage.tsx          ← full-page layout
│           ├── SessionInfoCard.tsx                   ← 3-row header
│           └── XlsxUploadButton.tsx                  ← file picker + toast feedback
├── services/
│   ├── admin/tutorialEventsAdminService.ts          ← unchanged
│   └── instructor/                                    ← NEW
│       └── instructorAttendanceService.ts            ← public endpoint client
└── App.tsx (or router)                               ← add /instructor/attendance/:token
```

### Component contracts

**`AttendanceRosterPanel`** — unit shared by admin modal and instructor page.

```tsx
interface AttendanceRosterPanelProps {
  vm: ReturnType<typeof useAttendanceVM>;
  onUploadXlsx?: (file: File) => Promise<void>;  // optional; admin omits, instructor passes
  disabled?: boolean;
}
```

Renders: optional upload button (top-right), the 2-column roster grid, inline row errors. Does NOT render the Save button or page chrome — admin puts Save in `DialogFooter`, instructor puts it inline.

**`useAttendanceVM`** — accepts a *service interface*, not a session ID:

```ts
interface AttendanceService {
  get(): Promise<AttendancePayload>;
  save(items: AttendanceSaveItem[]): Promise<AttendancePayload>;
}
export default function useAttendanceVM(service: AttendanceService) { ... }
```

This is a small refactor of the existing hook — the state machine stays the same; only the service-call layer is hoisted to a parameter.

**`AttendanceStatusSelect`** — extracted, color-aware:
- Each `<SelectItem>` has a left-edge colour stripe matching its status.
- The `SelectTrigger` gets a tinted background driven by `data-status={value}` and a CSS rule. CSS variables drive the actual hex values (`--attendance-attended-bg`, `--attendance-attended-fg`, etc.) so re-theming is a stylesheet change.

**`attendanceStatusTokens.ts`** — single source of truth for labels + token names:

```ts
export const ATTENDANCE_STATUS_TOKENS = {
  ATTENDED: { label: 'Attended', bg: 'var(--attendance-attended-bg)', fg: 'var(--attendance-attended-fg)' },
  ABSENT:   { label: 'Absent',   bg: 'var(--attendance-absent-bg)',   fg: 'var(--attendance-absent-fg)' },
  LATE:     { label: 'Late',     bg: 'var(--attendance-late-bg)',     fg: 'var(--attendance-late-fg)' },
  OTHER:    { label: 'Other',    bg: 'var(--attendance-other-bg)',    fg: 'var(--attendance-other-fg)' },
} as const;
```

### Public instructor page

```tsx
// Route: /instructor/attendance/:token  (outside <RequireAuth>)
function InstructorAttendancePage() {
  const { token } = useParams();
  const service = useMemo(() => makeInstructorAttendanceService(token), [token]);
  const vm = useAttendanceVM(service);

  if (vm.tokenError === 'expired') return <ExpiredLinkScreen />;
  if (vm.tokenError === 'invalid') return <InvalidLinkScreen />;

  return (
    <PublicShell>
      <SessionInfoCard
        title={vm.session.title}
        date={vm.session.start_date}
        instructor={vm.instructor.name}
        venue={vm.session.venue}
        location={vm.session.location}
      />
      <AttendanceRosterPanel
        vm={vm}
        onUploadXlsx={async (file) => {
          const refreshed = await service.uploadXlsx(file);
          vm.replaceFromServer(refreshed);
          toast.success('Uploaded — review and save');
        }}
      />
      <SaveBar canSave={vm.canSave} onSave={vm.save} />
    </PublicShell>
  );
}
```

`<PublicShell>` is a stripped layout — no main nav, no Redux filter state, no auth checks. Keeps the public bundle small and prevents accidental coupling to admin contexts.

### Admin modal refactor (Phase 2)

After the panel is extracted:

```tsx
const service = useMemo(() => makeAdminAttendanceService(session.id), [session.id]);
const vm = useAttendanceVM(service);
return (
  <Dialog open onOpenChange={...}>
    <DialogContent className="tw:sm:max-w-4xl">
      <DialogHeader>...</DialogHeader>
      <AttendanceRosterPanel vm={vm} />
      <DialogFooter><Cancel/><Save onClick={vm.save} disabled={!canSave}/></DialogFooter>
    </DialogContent>
  </Dialog>
);
```

The two-column grid layout currently in `AttendanceModal.tsx` moves into the panel.

## Security & threat model

### What the signed URL protects against

- **Tampering** — HMAC signature invalidates any modified token. Cannot escalate to a different session or instructor.
- **Replay after expiry** — `max_age=7 days` enforced in `unsign()`. Forged `issued_at` requires the signing secret.
- **Cross-session leak** — Token binds `(session_id, instructor_id)`. Even if exfiltrated, attacker can only see/modify that one session.

### Mitigations for residual risks

| Threat | Mitigation |
|---|---|
| Tutor forwards link to colleague | Accepted (trusted internal). Audit log records IP + UA per save. |
| Link appears in proxy / email-forwarder logs | 7-day expiry; token is path segment (not query), so absent from HTTP `Referer`. Public page emits `Referrer-Policy: no-referrer`. |
| Link leaks to search engines | `X-Robots-Tag: noindex, nofollow` on all public endpoints and the page. `robots.txt` disallow `/instructor/`. |
| Brute-force token guessing | HMAC-SHA256 of ~30-byte payload → ~10^18 valid tokens. Infeasible. DRF throttle: 10 req/min per IP on public endpoints. |
| Stolen xlsx attachment reveals student emails | Same exposure as any existing instructor email; not a new attack surface. |
| Malicious xlsx (zip bomb, formula injection) | `openpyxl.load_workbook(file, read_only=True, data_only=True)`. Hard 2 MB size cap. Reject any cell whose raw value is a formula (`str(cell.value).startswith('=')`). |
| Token reuse after a tutor leaves | Out of scope v1; auto-expires in 7 days. Upgrade path: `revoked_at` field on `TutorialAttendanceEmailLog`. |

## Error handling

| Scenario | Response |
|---|---|
| Token expired | `410 Gone` `{code: 'token_expired'}` → `<ExpiredLinkScreen>` with "Contact admin to request a new link" |
| Token signature invalid / malformed | `400 Bad Request` `{code: 'invalid_token'}` → generic `<InvalidLinkScreen>` |
| GET valid but session cancelled | `200 OK` `{session: {...cancelled: true}, roster: []}` → page shows cancellation banner, read-only roster |
| Save: invalid status | `400` `{errors: {<registration_id>: 'invalid_status'}}` → inline row error (existing admin pattern) |
| Save: OTHER with empty reason | Same — enforced by `TutorialAttendance.clean()` |
| Save: registration_id from a different session | `400` `{errors: {<id>: 'cross_session'}}` (defence in depth) |
| Upload: xlsx > 2 MB | `413 Payload Too Large` |
| Upload: wrong magic bytes | `415 Unsupported Media Type` |
| Upload: mixed valid + invalid rows | `200 OK` `{rows_applied, skipped_blank, errors: [...]}`; toast shows summary, errors listed below upload button |
| Email queue full / send fails | Existing EmailQueue retry behaviour; cron command moves on, logs warning |

## Testing strategy

TDD per project rules (CLAUDE.md). Test files written before the implementation in each phase.

### Phase 1 tests

- `test_attendance_link.py` — sign/unsign roundtrip, tamper detection, `max_age` expiry, custom exception types
- `test_attendance_roster_xlsx.py` — columns, dropdown data validation present, blank Company column, header bold + frozen, Meta sheet content
- `test_send_tutorial_attendance_emails.py`:
  - Sessions starting tomorrow picked up (and only tomorrow)
  - Cancelled sessions skipped
  - Sessions with zero instructors logged but not errored
  - Idempotency: second run on same day → 0 new log rows / queue rows
  - `--dry-run` makes no DB writes
  - `--for-date` and `--session-id` overrides
  - Multi-instructor session produces N email rows
  - Instructor with no `staff.user.email` logged and skipped

### Phase 2 tests

- `test_public_attendance_views.py`:
  - GET with valid token → session + roster
  - GET with expired token → 410
  - GET with tampered token → 400
  - POST save: `recorded_by` is the instructor's user, not anonymous
  - POST save: cross-session `registration_id` rejected
  - All endpoints write `TutorialAttendanceLinkAccess` rows
- `test_attendance_status_select.test.tsx` (RTL) — colors render, CSS-var driven
- `test_instructor_attendance_page.test.tsx` (RTL) — expired/invalid screens, valid token shows roster, save hits public endpoint
- Admin modal regression — existing admin attendance tests must remain green after the panel extraction

### Phase 3 tests

- `test_attendance_xlsx_parser.py`:
  - Skip blank Attendance cells
  - Reject student_refs not in this session
  - Case-insensitive status values
  - Reject formula-bearing cells
- `test_public_attendance_views.py::UploadTests`:
  - All-good upload
  - Mixed valid + invalid rows: valid applied, errors in body
  - Oversized file → 413
  - Wrong mime → 415

## Phase boundaries

### Phase 1 — Backend infrastructure

Deliverables:
- Migration: `TutorialAttendanceEmailLog`
- `attendance_link.py`
- `attendance_roster_xlsx.py`
- Email template seed migration (`tutorial_attendance_reminder`, MJML)
- `send_tutorial_attendance_emails` management command
- Cron docs: `docs/operations/tutorial-attendance-cron.md` (Windows Task Scheduler + Linux crontab)

**Observable result:** Running the command in dev sends an email to the dev mailbox with a correct xlsx attachment and a magic link. The link 404s (no view yet) — that's expected. Confidence built without any frontend changes.

### Phase 2 — Public page + inline save

Deliverables:
- Migration: `TutorialAttendanceLinkAccess`
- `public_views.py` (GET + POST save), `public_urls.py` wired into project URLs
- Refactor `useAttendanceVM` to accept a service interface
- Extract `AttendanceRosterPanel`, `AttendanceStatusSelect`, `attendanceStatusTokens.ts`
- CSS variables added to the existing theme stylesheet
- Refactor admin `AttendanceModal` to consume the panel (existing tests must keep passing)
- New `InstructorAttendancePage`, `SessionInfoCard`, `<PublicShell>`, route registration outside `<RequireAuth>`

**Observable result:** Full end-to-end inline flow. Tutor receives email, clicks link, edits selects, saves. Admin modal continues to behave identically.

### Phase 3 — Excel upload

Deliverables:
- `attendance_xlsx_parser.py`
- Upload endpoint
- `XlsxUploadButton` component, top-right of `AttendanceRosterPanel` (admin gets it too — `onUploadXlsx` prop optional for admin, present for instructor)

**Observable result:** Tutor can upload the filled xlsx as an alternative to inline edits. Feature complete.

## Open questions / follow-ups

None blocking. Items deferred from v1:

- Token revocation (upgrade path documented in threat-model table)
- Real `Company` column data (column ships blank; populate when source field exists)
- Mobile-optimised xlsx upload
- Email-reply parsing (tutor cannot reply with the xlsx; must upload via page)

## References

- Existing admin attendance API: `backend/django_Admin3/tutorials/admin_views.py:130-193`
- `TutorialAttendance` model: `backend/django_Admin3/tutorials/models/tutorial_attendance.py`
- `TutorialSessions` model and `instructors` M2M: `backend/django_Admin3/tutorials/models/tutorial_sessions.py`
- Admin AttendanceModal: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`
- `useAttendanceVM` hook: `frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts`
- EmailQueue with attachment support: `backend/django_Admin3/email_system/models/queue.py`
- Existing openpyxl precedent: `backend/django_Admin3/administrate/management/commands/update_course_template_prices.py:59-97`
