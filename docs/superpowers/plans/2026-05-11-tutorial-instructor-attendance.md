# Tutorial Instructor Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login attendance flow for tutorial instructors: daily 6am email with xlsx roster + magic link to a public page where tutors can edit selects inline or upload the filled xlsx.

**Architecture:** New Django service modules under `tutorials/` for signing, xlsx generation, xlsx parsing, and email scheduling. Public DRF endpoints under `/api/tutorials/public/`. Two new tables: `TutorialAttendanceEmailLog` (idempotency) and `TutorialAttendanceLinkAccess` (audit). Frontend extracts a shared `AttendanceRosterPanel` consumed by both the existing admin modal and a new public instructor page.

**Tech Stack:** Django 6.0, DRF, `django.core.signing.TimestampSigner`, openpyxl 3.1.5, existing `email_system` EmailQueue, React 19.2, Material-UI v7, RTL/Jest. PostgreSQL `acted` schema.

**Spec reference:** [docs/superpowers/specs/2026-05-11-tutorial-instructor-attendance-design.md](../specs/2026-05-11-tutorial-instructor-attendance-design.md)

---

## File Structure

```
backend/django_Admin3/
├── tutorials/
│   ├── models/
│   │   ├── tutorial_attendance_email_log.py        ← NEW (Task 1)
│   │   ├── tutorial_attendance_link_access.py      ← NEW (Task 7)
│   │   └── __init__.py                              ← MODIFY
│   ├── services/
│   │   ├── __init__.py                              ← (existing)
│   │   ├── attendance_link.py                       ← NEW (Task 2)
│   │   ├── attendance_roster_xlsx.py                ← NEW (Task 3)
│   │   ├── attendance_save_service.py               ← NEW (Task 8)
│   │   └── attendance_xlsx_parser.py                ← NEW (Task 16)
│   ├── management/commands/
│   │   └── send_tutorial_attendance_emails.py      ← NEW (Task 5)
│   ├── migrations/
│   │   ├── 0022_tutorial_attendance_email_log.py   ← NEW (Task 1)
│   │   └── 0023_tutorial_attendance_link_access.py ← NEW (Task 7)
│   ├── public_views.py                              ← NEW (Task 9, extended in 17)
│   ├── public_urls.py                               ← NEW (Task 9)
│   ├── urls.py                                      ← MODIFY (Task 9)
│   ├── admin_views.py                               ← MODIFY (Task 8 — use shared service)
│   └── tests/
│       ├── test_attendance_link.py
│       ├── test_attendance_roster_xlsx.py
│       ├── test_send_tutorial_attendance_emails.py
│       ├── test_public_attendance_views.py
│       ├── test_attendance_xlsx_parser.py
│       └── test_attendance_link_access_logging.py
├── email_system/migrations/
│   └── 0037_seed_tutorial_attendance_template.py   ← NEW (Task 4)
└── docs/operations/
    └── tutorial-attendance-cron.md                  ← NEW (Task 6)

frontend/react-Admin3/src/
├── components/
│   ├── shared/attendance/                           ← NEW dir (Tasks 10-12)
│   │   ├── attendanceStatusTokens.ts
│   │   ├── AttendanceStatusSelect.tsx
│   │   ├── AttendanceRosterPanel.tsx
│   │   ├── useAttendanceVM.ts                       ← MOVED + refactored (Task 10)
│   │   └── types.ts                                  ← MOVED (Task 10)
│   ├── admin/tutorial-events/
│   │   ├── AttendanceModal.tsx                       ← THINNED (Task 13)
│   │   ├── AttendanceRosterRow.tsx                   ← DELETED (Task 13)
│   │   ├── useAttendanceVM.ts                       ← DELETED (Task 10)
│   │   └── types.ts                                  ← partially gutted (Task 10)
│   └── instructor/attendance/                       ← NEW dir (Task 15)
│       ├── InstructorAttendancePage.tsx
│       ├── SessionInfoCard.tsx
│       ├── PublicShell.tsx
│       ├── ExpiredLinkScreen.tsx
│       ├── InvalidLinkScreen.tsx
│       └── XlsxUploadButton.tsx                     ← NEW (Task 18)
├── services/
│   ├── admin/tutorialEventsAdminService.ts         ← MODIFY (Task 10)
│   └── instructor/
│       └── instructorAttendanceService.ts          ← NEW (Task 14, extended in 17)
├── styles/
│   └── attendanceColors.css                         ← NEW (Task 11)
└── App.tsx (or router root)                         ← MODIFY (Task 15)
```

---

# Phase 1 — Backend Infrastructure

End-state: dev `python manage.py send_tutorial_attendance_emails --for-date=YYYY-MM-DD` queues an email per (session, instructor) with a correctly-formed xlsx attachment. The magic link 404s — that's expected; Phase 2 wires the view.

## Task 1: TutorialAttendanceEmailLog model + migration

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_attendance_email_log.py`
- Create: `backend/django_Admin3/tutorials/migrations/0022_tutorial_attendance_email_log.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Test: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance_email_log.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_tutorial_attendance_email_log.py`:

```python
"""Schema and constraint tests for TutorialAttendanceEmailLog."""
from datetime import timedelta
from django.db import IntegrityError, connection
from django.test import TestCase
from django.utils import timezone

from tutorials.models import (
    TutorialAttendanceEmailLog, TutorialInstructor, TutorialEvents,
    TutorialSessions,
)


class TutorialAttendanceEmailLogSchemaTests(TestCase):
    def test_table_exists_in_acted_schema(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_attendance_email_log'
                """
            )
            self.assertIsNotNone(cur.fetchone())

    def test_unique_together_session_instructor(self):
        ev = TutorialEvents.objects.create(code='UT-EML-1')
        sess = TutorialSessions.objects.create(
            tutorial_event=ev,
            title='Session 1',
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=1, hours=2),
        )
        instr = TutorialInstructor.objects.create()
        issued = timezone.now()
        TutorialAttendanceEmailLog.objects.create(
            session=sess, instructor=instr, token_issued_at=issued,
        )
        with self.assertRaises(IntegrityError):
            TutorialAttendanceEmailLog.objects.create(
                session=sess, instructor=instr, token_issued_at=issued,
            )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test tutorials.tests.test_tutorial_attendance_email_log -v 2
```

Expected: `ImportError` (TutorialAttendanceEmailLog does not exist).

- [ ] **Step 3: Write the model**

`backend/django_Admin3/tutorials/models/tutorial_attendance_email_log.py`:

```python
"""TutorialAttendanceEmailLog — idempotency log for the daily attendance email job.

One row per (session, instructor) once the email has been successfully queued.
Unique constraint prevents the daily cron from emailing twice if re-run.
"""
from django.db import models


class TutorialAttendanceEmailLog(models.Model):
    session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.CASCADE,
        related_name='attendance_email_logs',
    )
    instructor = models.ForeignKey(
        'tutorials.TutorialInstructor', on_delete=models.CASCADE,
        related_name='+',
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    email_queue = models.ForeignKey(
        'email_system.EmailQueue', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )
    token_issued_at = models.DateTimeField()

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance_email_log"'
        verbose_name = 'Tutorial Attendance Email Log'
        verbose_name_plural = 'Tutorial Attendance Email Logs'
        unique_together = [('session', 'instructor')]

    def __str__(self):
        return f"AttendanceEmailLog(session={self.session_id}, instructor={self.instructor_id})"
```

- [ ] **Step 4: Register the model in the package init**

In `backend/django_Admin3/tutorials/models/__init__.py`, append before the final empty line:

```python
from .tutorial_attendance_email_log import TutorialAttendanceEmailLog
```

- [ ] **Step 5: Generate the migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations tutorials --name tutorial_attendance_email_log
```

Expected: a new file `tutorials/migrations/0022_tutorial_attendance_email_log.py` is created.

- [ ] **Step 6: Apply the migration**

```bash
python manage.py migrate tutorials
```

Expected: `Applying tutorials.0022_tutorial_attendance_email_log... OK`

- [ ] **Step 7: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance_email_log -v 2
```

Expected: 2 tests OK.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_attendance_email_log.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0022_tutorial_attendance_email_log.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_attendance_email_log.py
git commit -m "feat(tutorials): add TutorialAttendanceEmailLog model

Idempotency log for the daily attendance email cron. Unique
(session, instructor) prevents duplicate emails on rerun.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: AttendanceLinkSigner service

**Files:**
- Create: `backend/django_Admin3/tutorials/services/attendance_link.py`
- Test: `backend/django_Admin3/tutorials/tests/test_attendance_link.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_attendance_link.py`:

```python
"""Sign/unsign tests for the attendance magic-link signer."""
import time
from unittest import mock

from django.test import TestCase

from tutorials.services.attendance_link import (
    AttendanceLinkPayload, AttendanceLinkSigner, ExpiredLink, InvalidLink,
)


class AttendanceLinkSignerTests(TestCase):
    def test_sign_returns_token_and_issued_at(self):
        signer = AttendanceLinkSigner()
        token, issued_at = signer.sign(session_id=42, instructor_id=7)
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 16)
        self.assertIsNotNone(issued_at)

    def test_unsign_roundtrip_returns_payload(self):
        signer = AttendanceLinkSigner()
        token, issued_at = signer.sign(session_id=42, instructor_id=7)
        payload = signer.unsign(token)
        self.assertIsInstance(payload, AttendanceLinkPayload)
        self.assertEqual(payload.session_id, 42)
        self.assertEqual(payload.instructor_id, 7)
        self.assertEqual(payload.issued_at, issued_at)

    def test_unsign_tampered_token_raises_invalid(self):
        signer = AttendanceLinkSigner()
        token, _ = signer.sign(session_id=42, instructor_id=7)
        tampered = token[:-2] + ('AA' if token[-2:] != 'AA' else 'BB')
        with self.assertRaises(InvalidLink):
            signer.unsign(tampered)

    def test_unsign_garbage_raises_invalid(self):
        signer = AttendanceLinkSigner()
        with self.assertRaises(InvalidLink):
            signer.unsign('not-a-real-token')

    def test_unsign_expired_raises_expired(self):
        signer = AttendanceLinkSigner()
        token, _ = signer.sign(session_id=42, instructor_id=7)
        # Patch MAX_AGE to 0 to simulate expiry, after a small sleep.
        time.sleep(1)
        with mock.patch.object(AttendanceLinkSigner, 'MAX_AGE', 0):
            with self.assertRaises(ExpiredLink):
                signer.unsign(token)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_attendance_link -v 2
```

Expected: `ModuleNotFoundError: No module named 'tutorials.services.attendance_link'`.

- [ ] **Step 3: Write the implementation**

`backend/django_Admin3/tutorials/services/attendance_link.py`:

```python
"""Magic-link signer for the public tutorial attendance flow.

Wraps ``django.core.signing.TimestampSigner`` so the public attendance
endpoints can verify a tutor's magic link without a login. The token
encodes the session and instructor IDs and a signed timestamp; tampering
or expiry both fail closed.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone as _tz

from django.core import signing


@dataclass(frozen=True)
class AttendanceLinkPayload:
    session_id: int
    instructor_id: int
    issued_at: datetime


class ExpiredLink(Exception):
    """Token is well-formed and signed, but past max_age."""


class InvalidLink(Exception):
    """Token is missing, malformed, or HMAC-invalid."""


class AttendanceLinkSigner:
    """Sign and verify (session_id, instructor_id) tokens for the public link."""
    SALT = 'tutorials.attendance_link.v1'
    MAX_AGE = 60 * 60 * 24 * 7  # 7 days

    def __init__(self) -> None:
        self._signer = signing.TimestampSigner(salt=self.SALT)

    def sign(self, session_id: int, instructor_id: int) -> tuple[str, datetime]:
        """Return (token, issued_at)."""
        issued_at = datetime.now(_tz.utc)
        payload = f"{session_id}:{instructor_id}:{int(issued_at.timestamp())}"
        token = self._signer.sign(payload)
        return token, issued_at

    def unsign(self, token: str) -> AttendanceLinkPayload:
        """Return the decoded payload or raise ExpiredLink / InvalidLink."""
        if not token or not isinstance(token, str):
            raise InvalidLink('empty token')
        try:
            raw = self._signer.unsign(token, max_age=self.MAX_AGE)
        except signing.SignatureExpired as exc:
            raise ExpiredLink(str(exc)) from exc
        except signing.BadSignature as exc:
            raise InvalidLink(str(exc)) from exc
        try:
            sid, iid, ts = raw.split(':')
            return AttendanceLinkPayload(
                session_id=int(sid),
                instructor_id=int(iid),
                issued_at=datetime.fromtimestamp(int(ts), tz=_tz.utc),
            )
        except (ValueError, TypeError) as exc:
            raise InvalidLink(f'unparseable payload: {raw!r}') from exc
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_attendance_link -v 2
```

Expected: 5 tests OK.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/attendance_link.py \
        backend/django_Admin3/tutorials/tests/test_attendance_link.py
git commit -m "feat(tutorials): add AttendanceLinkSigner for magic-link auth

TimestampSigner-backed signer with a versioned salt and 7-day max_age.
Raises ExpiredLink / InvalidLink so callers can distinguish 410 vs 400.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Excel roster generator

**Files:**
- Create: `backend/django_Admin3/tutorials/services/attendance_roster_xlsx.py`
- Test: `backend/django_Admin3/tutorials/tests/test_attendance_roster_xlsx.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_attendance_roster_xlsx.py`:

```python
"""Tests for the xlsx roster generator."""
from datetime import timedelta
from io import BytesIO

import openpyxl
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from students.models import Student
from tutorials.models import (
    TutorialEvents, TutorialRegistration, TutorialSessions,
)
from tutorials.services.attendance_roster_xlsx import generate_roster_xlsx


class RosterXlsxTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = TutorialEvents.objects.create(code='UT-XLS-1')
        cls.session = TutorialSessions.objects.create(
            tutorial_event=cls.event,
            title='Tutorial 1',
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=1, hours=2),
        )
        u = User.objects.create_user(
            username='studentA', first_name='Alice', last_name='Aardvark',
            email='alice@example.com',
        )
        cls.student = Student.objects.create(user=u)
        TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def _load(self):
        return openpyxl.load_workbook(BytesIO(generate_roster_xlsx(self.session)))

    def test_returns_bytes(self):
        out = generate_roster_xlsx(self.session)
        self.assertIsInstance(out, bytes)
        self.assertGreater(len(out), 100)

    def test_header_row_columns(self):
        wb = self._load()
        ws = wb.active
        header = [c.value for c in ws[1]]
        self.assertEqual(
            header,
            ['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'],
        )

    def test_first_data_row_populated(self):
        wb = self._load()
        ws = wb.active
        row2 = [c.value for c in ws[2]]
        # Title is blank by design; verify name, ref, email, blank company, blank attendance.
        self.assertEqual(row2[1], 'Alice')
        self.assertEqual(row2[2], 'Aardvark')
        self.assertEqual(row2[3], self.student.student_ref)
        self.assertEqual(row2[4], 'alice@example.com')
        self.assertEqual(row2[5], None)  # Company placeholder
        self.assertEqual(row2[6], None)  # Attendance left blank

    def test_attendance_dropdown_validation_present(self):
        wb = self._load()
        ws = wb.active
        # openpyxl exposes data validations on ws.data_validations.dataValidation
        dvs = list(ws.data_validations.dataValidation)
        self.assertTrue(dvs, 'expected at least one DataValidation on the sheet')
        statuses = '"ATTENDED,ABSENT,LATE,OTHER"'
        found = any(dv.formula1 == statuses and dv.type == 'list' for dv in dvs)
        self.assertTrue(found, f'attendance dropdown validation not found in {dvs!r}')

    def test_header_is_bold_and_freeze_panes_set(self):
        wb = self._load()
        ws = wb.active
        self.assertTrue(ws['A1'].font.bold)
        self.assertEqual(ws.freeze_panes, 'A2')

    def test_meta_sheet_exists_with_session_id(self):
        wb = self._load()
        self.assertIn('Meta', wb.sheetnames)
        meta = wb['Meta']
        values = {row[0].value: row[1].value for row in meta.iter_rows(min_row=1, max_row=4)}
        self.assertEqual(values.get('session_id'), self.session.id)
        self.assertEqual(values.get('event_code'), 'UT-XLS-1')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_attendance_roster_xlsx -v 2
```

Expected: `ModuleNotFoundError: No module named 'tutorials.services.attendance_roster_xlsx'`.

- [ ] **Step 3: Write the implementation**

`backend/django_Admin3/tutorials/services/attendance_roster_xlsx.py`:

```python
"""Generate an attendance roster xlsx for a TutorialSession.

Schema (sheet 1): Title | First Name | Last Name | Student Ref | Email | Company | Attendance
- Student Ref is the join key on upload.
- Company is intentionally blank (placeholder until the data source exists).
- Attendance column carries a data-validation dropdown.

Sheet 2 ("Meta") records session_id, event_code, session_date, generated_at —
informational only; not parsed on upload.
"""
from __future__ import annotations

from io import BytesIO

from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from tutorials.models import TutorialRegistration, TutorialSessions

HEADER = ['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance']
STATUS_LIST_FORMULA = '"ATTENDED,ABSENT,LATE,OTHER"'


def generate_roster_xlsx(session: TutorialSessions) -> bytes:
    """Return the xlsx as bytes (suitable for an email attachment)."""
    wb = Workbook()
    ws = wb.active
    ws.title = 'Roster'

    # Header.
    ws.append(HEADER)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    ws.freeze_panes = 'A2'

    # Body.
    registrations = (
        TutorialRegistration.objects
        .filter(tutorial_session=session)
        .select_related('student__user')
        .order_by('student__user__last_name', 'student__user__first_name')
    )
    for reg in registrations:
        user = reg.student.user
        ws.append([
            '',  # Title placeholder
            user.first_name or '',
            user.last_name or '',
            reg.student.student_ref,
            user.email or '',
            None,  # Company placeholder
            None,  # Attendance left blank for tutor input
        ])

    # Attendance dropdown — applied to all data rows.
    last_row = ws.max_row
    if last_row >= 2:
        dv = DataValidation(
            type='list', formula1=STATUS_LIST_FORMULA, allow_blank=True,
        )
        dv.error = 'Use one of: ATTENDED, ABSENT, LATE, OTHER.'
        dv.errorTitle = 'Invalid status'
        ws.add_data_validation(dv)
        attendance_col = get_column_letter(HEADER.index('Attendance') + 1)
        dv.add(f'{attendance_col}2:{attendance_col}{last_row}')

    # Sensible column widths.
    for idx, name in enumerate(HEADER, start=1):
        ws.column_dimensions[get_column_letter(idx)].width = max(12, len(name) + 4)
    ws.column_dimensions['E'].width = 28  # Email
    ws.column_dimensions['G'].width = 14  # Attendance dropdown

    # Meta sheet (informational).
    meta = wb.create_sheet('Meta')
    event_code = session.tutorial_event.code if session.tutorial_event_id else ''
    meta.append(['session_id', session.id])
    meta.append(['event_code', event_code])
    meta.append(['session_date', str(session.start_date)])
    meta.append(['generated_at', timezone.now().isoformat()])

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_attendance_roster_xlsx -v 2
```

Expected: 6 tests OK.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/attendance_roster_xlsx.py \
        backend/django_Admin3/tutorials/tests/test_attendance_roster_xlsx.py
git commit -m "feat(tutorials): add attendance roster xlsx generator

Generates a 7-column roster sheet with a data-validation dropdown
for ATTENDED/ABSENT/LATE/OTHER. Company column is a blank
placeholder per spec. Meta sheet records session_id/event_code
for reference.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Email template seed migration

**Files:**
- Create: `backend/django_Admin3/email_system/migrations/0037_seed_tutorial_attendance_template.py`
- Test: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance_template_seeded.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_tutorial_attendance_template_seeded.py`:

```python
"""Verify the tutorial_attendance_reminder template is seeded by migration."""
from django.test import TestCase

from email_system.models import EmailTemplate


class TutorialAttendanceTemplateSeededTests(TestCase):
    def test_template_exists(self):
        tpl = EmailTemplate.objects.filter(name='tutorial_attendance_reminder').first()
        self.assertIsNotNone(tpl, 'tutorial_attendance_reminder template missing')
        self.assertTrue(tpl.is_active)
        self.assertTrue(tpl.enable_queue)
        self.assertEqual(tpl.template_type, 'tutorials')

    def test_subject_template_contains_session_title(self):
        tpl = EmailTemplate.objects.get(name='tutorial_attendance_reminder')
        self.assertIn('{{ session_title }}', tpl.subject_template)

    def test_basic_mode_content_contains_magic_link(self):
        tpl = EmailTemplate.objects.get(name='tutorial_attendance_reminder')
        self.assertIn('{{ magic_link }}', tpl.basic_mode_content)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance_template_seeded -v 2
```

Expected: `AssertionError: tutorial_attendance_reminder template missing`.

- [ ] **Step 3: Write the migration**

`backend/django_Admin3/email_system/migrations/0037_seed_tutorial_attendance_template.py`:

```python
"""Seed the tutorial_attendance_reminder email template."""
from django.db import migrations

TEMPLATE_NAME = 'tutorial_attendance_reminder'

BASIC_MODE_CONTENT = (
    '# Tutorial attendance — {{ session_title }}\n\n'
    'Hello {{ instructor_name }},\n\n'
    'You are scheduled to teach **{{ session_title }}** on '
    '{{ session_date }}{% if venue %} at {{ venue }}{% endif %}.\n\n'
    'Please record attendance using either:\n\n'
    '1. The attached spreadsheet — fill the Attendance column for each student, then upload it via the link below.\n'
    '2. The online attendance page — click the link below and update each student inline.\n\n'
    '**[Enter attendance →]({{ magic_link }})**\n\n'
    'This link is valid for 7 days. If you have any questions, contact the tutorials team.\n'
)


def seed_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplate.objects.get_or_create(
        name=TEMPLATE_NAME,
        defaults={
            'display_name': 'Tutorial Attendance Reminder',
            'template_type': 'tutorials',
            'subject_template': 'Attendance for {{ session_title }} on {{ session_date }}',
            'is_active': True,
            'enable_queue': True,
            'use_master_template': False,
            'basic_mode_content': BASIC_MODE_CONTENT,
        },
    )


def reverse_seed(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplate.objects.filter(name=TEMPLATE_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0036_merge_variable_picker_and_versioning'),
    ]

    operations = [
        migrations.RunPython(seed_template, reverse_seed),
    ]
```

- [ ] **Step 4: Apply the migration**

```bash
python manage.py migrate email_system
```

Expected: `Applying email_system.0037_seed_tutorial_attendance_template... OK`

- [ ] **Step 5: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance_template_seeded -v 2
```

Expected: 3 tests OK.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/email_system/migrations/0037_seed_tutorial_attendance_template.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_attendance_template_seeded.py
git commit -m "feat(email): seed tutorial_attendance_reminder template

Basic-mode markdown template with the magic link and a one-line
description of the two attendance entry options. The xlsx is
attached at queue time by the management command.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: send_tutorial_attendance_emails management command

**Files:**
- Create: `backend/django_Admin3/tutorials/management/__init__.py` (if missing)
- Create: `backend/django_Admin3/tutorials/management/commands/__init__.py` (if missing)
- Create: `backend/django_Admin3/tutorials/management/commands/send_tutorial_attendance_emails.py`
- Test: `backend/django_Admin3/tutorials/tests/test_send_tutorial_attendance_emails.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_send_tutorial_attendance_emails.py`:

```python
"""End-to-end tests for the daily attendance email cron command."""
from datetime import date, timedelta
from io import StringIO
from unittest import mock

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from staff.models import Staff
from tutorials.models import (
    TutorialAttendanceEmailLog, TutorialEvents, TutorialInstructor,
    TutorialSessions,
)


class SendTutorialAttendanceEmailsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.tomorrow = (timezone.localdate() + timedelta(days=1))
        cls.day_after = (timezone.localdate() + timedelta(days=2))

        cls.event_ok = TutorialEvents.objects.create(code='UT-CMD-1')
        cls.session_tomorrow = TutorialSessions.objects.create(
            tutorial_event=cls.event_ok,
            title='Session Tomorrow',
            start_date=timezone.make_aware(
                timezone.datetime.combine(cls.tomorrow, timezone.datetime.min.time())
            ),
            end_date=timezone.make_aware(
                timezone.datetime.combine(cls.tomorrow, timezone.datetime.min.time())
            ) + timedelta(hours=2),
        )
        cls.session_day_after = TutorialSessions.objects.create(
            tutorial_event=cls.event_ok,
            title='Session Day-After',
            start_date=timezone.make_aware(
                timezone.datetime.combine(cls.day_after, timezone.datetime.min.time())
            ),
            end_date=timezone.make_aware(
                timezone.datetime.combine(cls.day_after, timezone.datetime.min.time())
            ) + timedelta(hours=2),
        )
        # Cancelled event — must be skipped even if start is tomorrow.
        cls.event_cx = TutorialEvents.objects.create(code='UT-CMD-2', cancelled=True)
        cls.session_cancelled = TutorialSessions.objects.create(
            tutorial_event=cls.event_cx,
            title='Cancelled Session',
            start_date=cls.session_tomorrow.start_date,
            end_date=cls.session_tomorrow.end_date,
        )

        # Instructor with email.
        u = User.objects.create_user(
            username='tutor1', email='tutor1@example.com',
            first_name='Tina', last_name='Tutor',
        )
        cls.staff = Staff.objects.create(user=u)
        cls.instructor_ok = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session_tomorrow.instructors.add(cls.instructor_ok)
        cls.session_cancelled.instructors.add(cls.instructor_ok)

        # Instructor with no staff/email — must be skipped with warning.
        cls.instructor_noemail = TutorialInstructor.objects.create()
        cls.session_tomorrow.instructors.add(cls.instructor_noemail)

    def _run(self, **opts):
        out = StringIO()
        call_command(
            'send_tutorial_attendance_emails',
            stdout=out, stderr=out, **opts,
        )
        return out.getvalue()

    @mock.patch('tutorials.management.commands.send_tutorial_attendance_emails.queue_service.queue_email')
    def test_picks_up_only_tomorrows_sessions(self, mock_queue):
        mock_queue.return_value = mock.Mock(pk=1)
        self._run(for_date=self.tomorrow.isoformat())
        # Only the OK session+instructor pair gets an email; cancelled and
        # no-email instructor are skipped.
        self.assertEqual(mock_queue.call_count, 1)
        log = TutorialAttendanceEmailLog.objects.get()
        self.assertEqual(log.session_id, self.session_tomorrow.id)
        self.assertEqual(log.instructor_id, self.instructor_ok.id)

    @mock.patch('tutorials.management.commands.send_tutorial_attendance_emails.queue_service.queue_email')
    def test_idempotent_on_rerun(self, mock_queue):
        mock_queue.return_value = mock.Mock(pk=1)
        self._run(for_date=self.tomorrow.isoformat())
        self.assertEqual(mock_queue.call_count, 1)
        self._run(for_date=self.tomorrow.isoformat())
        self.assertEqual(mock_queue.call_count, 1)  # not called again
        self.assertEqual(TutorialAttendanceEmailLog.objects.count(), 1)

    @mock.patch('tutorials.management.commands.send_tutorial_attendance_emails.queue_service.queue_email')
    def test_dry_run_does_not_write(self, mock_queue):
        mock_queue.return_value = mock.Mock(pk=1)
        self._run(for_date=self.tomorrow.isoformat(), dry_run=True)
        mock_queue.assert_not_called()
        self.assertEqual(TutorialAttendanceEmailLog.objects.count(), 0)

    @mock.patch('tutorials.management.commands.send_tutorial_attendance_emails.queue_service.queue_email')
    def test_session_id_override(self, mock_queue):
        mock_queue.return_value = mock.Mock(pk=1)
        # Force-run against the day-after session even though it isn't "tomorrow".
        self._run(session_id=self.session_day_after.id)
        self.assertEqual(mock_queue.call_count, 1)

    @mock.patch('tutorials.management.commands.send_tutorial_attendance_emails.queue_service.queue_email')
    def test_skips_instructor_with_no_email(self, mock_queue):
        mock_queue.return_value = mock.Mock(pk=1)
        output = self._run(for_date=self.tomorrow.isoformat())
        # The no-email instructor should be logged and skipped — only 1 email.
        self.assertEqual(mock_queue.call_count, 1)
        self.assertIn('instructor has no email', output.lower())
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_send_tutorial_attendance_emails -v 2
```

Expected: `CommandError: Unknown command: 'send_tutorial_attendance_emails'`.

- [ ] **Step 3: Ensure management package files exist**

If the directories don't exist, create the `__init__.py` files:

```python
# backend/django_Admin3/tutorials/management/__init__.py
# (empty)
```

```python
# backend/django_Admin3/tutorials/management/commands/__init__.py
# (empty)
```

- [ ] **Step 4: Write the command**

`backend/django_Admin3/tutorials/management/commands/send_tutorial_attendance_emails.py`:

```python
"""``python manage.py send_tutorial_attendance_emails``.

Daily cron job: for each TutorialSession starting tomorrow, queue an
attendance reminder email to each instructor with the generated xlsx
attached. Idempotent via ``TutorialAttendanceEmailLog`` (one row per
(session, instructor) pair).

Run at 06:00 server-local time via cron / Task Scheduler. See
``docs/operations/tutorial-attendance-cron.md``.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.utils import timezone

from email_system.services import queue_service
from tutorials.models import (
    TutorialAttendanceEmailLog, TutorialSessions,
)
from tutorials.services.attendance_link import AttendanceLinkSigner
from tutorials.services.attendance_roster_xlsx import generate_roster_xlsx


class Command(BaseCommand):
    help = 'Send daily tutorial attendance reminder emails for tomorrow\'s sessions.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--for-date', dest='for_date', default=None,
            help='Override "tomorrow" with a specific date (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--session-id', dest='session_id', default=None, type=int,
            help='Process only this session (ignores --for-date filter).',
        )
        parser.add_argument(
            '--dry-run', dest='dry_run', action='store_true',
            help='Log what would be sent; do not queue emails or write log rows.',
        )

    def handle(self, *args, **opts):
        signer = AttendanceLinkSigner()
        target = self._resolve_target(opts)
        sessions = self._select_sessions(target, opts.get('session_id'))

        sent = 0
        skipped = 0
        for session in sessions:
            for instructor in session.instructors.all():
                if not self._instructor_has_email(instructor):
                    self.stdout.write(
                        f'skip: instructor has no email (session={session.id}, instructor={instructor.id})'
                    )
                    skipped += 1
                    continue
                if TutorialAttendanceEmailLog.objects.filter(
                    session=session, instructor=instructor,
                ).exists():
                    self.stdout.write(
                        f'skip: already sent (session={session.id}, instructor={instructor.id})'
                    )
                    continue
                if opts['dry_run']:
                    self.stdout.write(
                        f'DRY-RUN would send: session={session.id} instructor={instructor.id} '
                        f'to={instructor.staff.user.email}'
                    )
                    continue
                try:
                    self._send_one(session, instructor, signer)
                    sent += 1
                except IntegrityError:
                    # Lost a race with a concurrent invocation; treat as skipped.
                    self.stdout.write(
                        f'skip: lost race (session={session.id}, instructor={instructor.id})'
                    )

        self.stdout.write(self.style.SUCCESS(
            f'Done. sent={sent} skipped={skipped} dry_run={opts["dry_run"]}'
        ))

    # ---- helpers ----

    def _resolve_target(self, opts) -> date:
        raw = opts.get('for_date')
        if raw:
            try:
                return datetime.strptime(raw, '%Y-%m-%d').date()
            except ValueError as exc:
                raise CommandError(f'invalid --for-date {raw!r}: {exc}') from exc
        return timezone.localdate() + timedelta(days=1)

    def _select_sessions(self, target_date: date, session_id: int | None):
        qs = TutorialSessions.objects.filter(
            tutorial_event__cancelled=False,
        ).select_related('tutorial_event', 'venue').prefetch_related('instructors__staff__user')
        if session_id is not None:
            return qs.filter(id=session_id)
        return qs.filter(start_date__date=target_date)

    def _instructor_has_email(self, instructor) -> bool:
        return bool(
            getattr(instructor, 'staff', None)
            and getattr(instructor.staff, 'user', None)
            and instructor.staff.user.email
        )

    def _send_one(self, session, instructor, signer: AttendanceLinkSigner):
        token, issued_at = signer.sign(session.id, instructor.id)
        xlsx_bytes = generate_roster_xlsx(session)
        magic_link = f'{settings.FRONTEND_BASE_URL.rstrip("/")}/instructor/attendance/{token}'

        with transaction.atomic():
            queue_row = queue_service.queue_email(
                template_name='tutorial_attendance_reminder',
                to_emails=[instructor.staff.user.email],
                context={
                    'instructor_name': instructor.staff.user.get_full_name() or instructor.staff.user.username,
                    'session_title': session.title,
                    'session_date': session.start_date,
                    'venue': session.venue.name if session.venue_id else '',
                    'magic_link': magic_link,
                },
                attachments=[{
                    'filename': self._attachment_filename(session),
                    'content': xlsx_bytes,
                    'mime_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }],
            )
            TutorialAttendanceEmailLog.objects.create(
                session=session, instructor=instructor,
                email_queue=queue_row, token_issued_at=issued_at,
            )

    def _attachment_filename(self, session) -> str:
        date_str = session.start_date.date().isoformat() if hasattr(session.start_date, 'date') else str(session.start_date)
        event_code = session.tutorial_event.code if session.tutorial_event_id else 'session'
        return f'attendance_{event_code}_{date_str}.xlsx'
```

- [ ] **Step 5: Verify `queue_service.queue_email` accepts the `attachments` kwarg**

Run a quick inspection from a Python REPL:

```bash
python manage.py shell -c "from email_system.services import queue_service; import inspect; print(inspect.signature(queue_service.queue_email))"
```

If `attachments` is not a parameter, modify the command's `_send_one` to use whatever attachment API the queue service exposes (e.g., creating an `EmailAttachment` row and linking via `EmailTemplateAttachment` or appending to `queue_row.attachments` after creation). Read [backend/django_Admin3/email_system/services/queue_service.py](../../backend/django_Admin3/email_system/services/queue_service.py) and adjust before running tests.

- [ ] **Step 6: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_send_tutorial_attendance_emails -v 2
```

Expected: 5 tests OK.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/management/__init__.py \
        backend/django_Admin3/tutorials/management/commands/__init__.py \
        backend/django_Admin3/tutorials/management/commands/send_tutorial_attendance_emails.py \
        backend/django_Admin3/tutorials/tests/test_send_tutorial_attendance_emails.py
git commit -m "feat(tutorials): add daily send_tutorial_attendance_emails command

For each TutorialSession starting tomorrow, queue an email to each
instructor with the xlsx roster attached and a signed magic link.
Idempotent via TutorialAttendanceEmailLog. Supports --dry-run,
--for-date, --session-id flags.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cron documentation

**Files:**
- Create: `docs/operations/tutorial-attendance-cron.md`

- [ ] **Step 1: Write the operations doc**

`docs/operations/tutorial-attendance-cron.md`:

````markdown
# Tutorial Attendance Daily Email — Cron Setup

The `send_tutorial_attendance_emails` management command must run **once per day at 06:00 server-local time**. It picks up sessions starting tomorrow and emails each instructor a reminder with the xlsx roster attached. It is idempotent (safe to re-run).

## Linux (crontab)

Edit the crontab for the Django service account:

```bash
crontab -e
```

Append:

```cron
# Tutorial attendance — daily reminder for tomorrow's sessions
0 6 * * *  cd /srv/admin3/backend/django_Admin3 && /srv/admin3/.venv/bin/python manage.py send_tutorial_attendance_emails >> /var/log/admin3/tutorial-attendance.log 2>&1
```

Adjust paths to match the deployment. Verify the log file is writable by the service account before saving.

## Windows (Task Scheduler)

Create a Basic Task triggered daily at 06:00 with the action:

| Field | Value |
|---|---|
| Program | `C:\Code\Admin3\.venv\Scripts\python.exe` |
| Arguments | `manage.py send_tutorial_attendance_emails` |
| Start in | `C:\Code\Admin3\backend\django_Admin3` |

Under "Settings", enable "Run task as soon as possible after a scheduled start is missed" so a brief outage at 06:00 doesn't drop a day.

## Verification

To dry-run the next-day calculation without sending:

```bash
python manage.py send_tutorial_attendance_emails --dry-run
```

To resend for a specific session (e.g., a tutor lost the email):

1. Remove the matching log row in the Django shell:

   ```python
   from tutorials.models import TutorialAttendanceEmailLog
   TutorialAttendanceEmailLog.objects.filter(session_id=<ID>, instructor_id=<ID>).delete()
   ```

2. Re-run the command targeting that session:

   ```bash
   python manage.py send_tutorial_attendance_emails --session-id=<ID>
   ```

## Monitoring

- Output goes to stdout/stderr — redirect via cron (above) or Task Scheduler History.
- Successful run ends with: `Done. sent=N skipped=M dry_run=False`.
- Queued emails are picked up by the existing `process_email_queue` daemon — verify that's running.
````

- [ ] **Step 2: Commit**

```bash
git add docs/operations/tutorial-attendance-cron.md
git commit -m "docs(operations): cron setup for tutorial attendance daily email

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

**Phase 1 complete.** End-to-end check: run `python manage.py send_tutorial_attendance_emails --for-date=<tomorrow>` in dev → email lands in dev mailbox → xlsx attachment is correct → magic link 404s. Continue to Phase 2.

---

# Phase 2 — Public Page + Inline Save

End-state: tutor clicks the magic link, sees a full-page roster with color-coded selects + session info card, edits and saves. Admin AttendanceModal continues to work identically (now via the shared panel).

## Task 7: TutorialAttendanceLinkAccess model + migration

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_attendance_link_access.py`
- Create: `backend/django_Admin3/tutorials/migrations/0023_tutorial_attendance_link_access.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Test: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance_link_access.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_tutorial_attendance_link_access.py`:

```python
"""Schema tests for TutorialAttendanceLinkAccess audit table."""
from django.db import connection
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialAttendanceLinkAccess, TutorialEvents, TutorialSessions


class TutorialAttendanceLinkAccessSchemaTests(TestCase):
    def test_table_exists_in_acted_schema(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_attendance_link_access'
                """
            )
            self.assertIsNotNone(cur.fetchone())

    def test_can_log_view_action(self):
        ev = TutorialEvents.objects.create(code='UT-LOG-1')
        sess = TutorialSessions.objects.create(
            tutorial_event=ev, title='S', start_date=timezone.now(), end_date=timezone.now(),
        )
        row = TutorialAttendanceLinkAccess.objects.create(
            session=sess, action='view', ip_address='192.0.2.1', user_agent='test',
            detail={'note': 'first open'},
        )
        self.assertIsNotNone(row.accessed_at)
        self.assertEqual(row.detail['note'], 'first open')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance_link_access -v 2
```

Expected: `ImportError: cannot import name 'TutorialAttendanceLinkAccess'`.

- [ ] **Step 3: Write the model**

`backend/django_Admin3/tutorials/models/tutorial_attendance_link_access.py`:

```python
"""TutorialAttendanceLinkAccess — write-only audit log for the public attendance link.

Each call to a public attendance endpoint (view / save / upload / reject)
writes one row here. The table is never read by application code; it is
for ops forensics only.
"""
from django.db import models

ACTION_VIEW = 'view'
ACTION_SAVE = 'save'
ACTION_UPLOAD = 'upload'
ACTION_REJECT = 'reject'

ACTION_CHOICES = [
    (ACTION_VIEW, 'View'),
    (ACTION_SAVE, 'Save'),
    (ACTION_UPLOAD, 'Upload'),
    (ACTION_REJECT, 'Reject'),
]


class TutorialAttendanceLinkAccess(models.Model):
    session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.CASCADE,
        related_name='+',
    )
    instructor = models.ForeignKey(
        'tutorials.TutorialInstructor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    accessed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')
    detail = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance_link_access"'
        verbose_name = 'Tutorial Attendance Link Access'
        verbose_name_plural = 'Tutorial Attendance Link Accesses'
        indexes = [models.Index(fields=['session', 'accessed_at'])]

    def __str__(self):
        return f"LinkAccess(session={self.session_id}, action={self.action})"
```

- [ ] **Step 4: Register the model**

In `backend/django_Admin3/tutorials/models/__init__.py`, append:

```python
from .tutorial_attendance_link_access import TutorialAttendanceLinkAccess
```

- [ ] **Step 5: Generate and apply the migration**

```bash
python manage.py makemigrations tutorials --name tutorial_attendance_link_access
python manage.py migrate tutorials
```

Expected: `Applying tutorials.0023_tutorial_attendance_link_access... OK`

- [ ] **Step 6: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance_link_access -v 2
```

Expected: 2 tests OK.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_attendance_link_access.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0023_tutorial_attendance_link_access.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_attendance_link_access.py
git commit -m "feat(tutorials): add TutorialAttendanceLinkAccess audit table

Write-only log for view/save/upload/reject events on the public
attendance endpoints. Indexed (session, accessed_at) for ops queries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Extract shared attendance save service

**Goal:** Move the upsert loop currently in `AdminTutorialAttendanceView.post` into a reusable service so the public endpoint and the admin endpoint produce identical results.

**Files:**
- Create: `backend/django_Admin3/tutorials/services/attendance_save_service.py`
- Modify: `backend/django_Admin3/tutorials/admin_views.py:168-192`
- Test: `backend/django_Admin3/tutorials/tests/test_attendance_save_service.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_attendance_save_service.py`:

```python
"""Tests for the shared attendance save service."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from students.models import Student
from tutorials.models import (
    TutorialAttendance, TutorialEvents, TutorialRegistration, TutorialSessions,
)
from tutorials.services.attendance_save_service import save_attendance_items


class SaveAttendanceItemsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.recorder = User.objects.create_user(username='recorder')
        cls.event = TutorialEvents.objects.create(code='UT-SVC-1')
        cls.session = TutorialSessions.objects.create(
            tutorial_event=cls.event, title='S',
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=1),
        )
        u = User.objects.create_user(username='studentB', first_name='B', last_name='B')
        cls.student = Student.objects.create(user=u)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def test_creates_attendance_when_missing(self):
        save_attendance_items(
            session=self.session, recorded_by=self.recorder,
            items=[{'registration_id': self.reg.id, 'status': 'ATTENDED', 'reason': ''}],
        )
        a = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(a.status, 'ATTENDED')
        self.assertEqual(a.recorded_by, self.recorder)

    def test_updates_attendance_when_present(self):
        TutorialAttendance.objects.create(
            registration=self.reg, status='ABSENT', recorded_at=timezone.now(),
        )
        save_attendance_items(
            session=self.session, recorded_by=self.recorder,
            items=[{'registration_id': self.reg.id, 'status': 'LATE', 'reason': ''}],
        )
        a = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(a.status, 'LATE')
        self.assertEqual(a.recorded_by, self.recorder)

    def test_rejects_cross_session_registration_id(self):
        other_session = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Other',
            start_date=timezone.now(), end_date=timezone.now(),
        )
        u2 = User.objects.create_user(username='studentC')
        s2 = Student.objects.create(user=u2)
        foreign_reg = TutorialRegistration.objects.create(
            student=s2, tutorial_session=other_session,
        )
        from tutorials.services.attendance_save_service import CrossSessionRegistration
        with self.assertRaises(CrossSessionRegistration):
            save_attendance_items(
                session=self.session, recorded_by=self.recorder,
                items=[{'registration_id': foreign_reg.id, 'status': 'ATTENDED', 'reason': ''}],
            )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_attendance_save_service -v 2
```

Expected: `ModuleNotFoundError: No module named 'tutorials.services.attendance_save_service'`.

- [ ] **Step 3: Write the service**

`backend/django_Admin3/tutorials/services/attendance_save_service.py`:

```python
"""Shared upsert service for tutorial attendance writes.

Used by both the admin AttendanceView and the public attendance endpoint so
the two callers produce identical results (same validation, same recorded_at).
"""
from __future__ import annotations

from typing import Iterable, Mapping

from django.db import transaction
from django.utils import timezone

from tutorials.models import TutorialAttendance, TutorialRegistration


class CrossSessionRegistration(Exception):
    """Caller passed a registration_id that does not belong to the given session."""


@transaction.atomic
def save_attendance_items(
    *, session, recorded_by, items: Iterable[Mapping],
) -> list[TutorialAttendance]:
    """Upsert TutorialAttendance rows for the given items.

    Raises CrossSessionRegistration if any item's registration belongs to a
    different session (defence in depth for the public endpoint).
    """
    item_list = list(items)
    if not item_list:
        return []

    reg_ids = [int(it['registration_id']) for it in item_list]
    valid_reg_ids = set(
        TutorialRegistration.objects
        .filter(tutorial_session=session, id__in=reg_ids)
        .values_list('id', flat=True)
    )
    foreign = [rid for rid in reg_ids if rid not in valid_reg_ids]
    if foreign:
        raise CrossSessionRegistration(
            f'registration ids do not belong to session {session.id}: {foreign}'
        )

    now = timezone.now()
    written: list[TutorialAttendance] = []
    for it in item_list:
        obj, _ = TutorialAttendance.objects.update_or_create(
            registration_id=int(it['registration_id']),
            defaults={
                'status': it['status'],
                'reason': it.get('reason') or '',
                'recorded_by': recorded_by,
                'recorded_at': now,
            },
        )
        written.append(obj)
    return written
```

- [ ] **Step 4: Refactor `AdminTutorialAttendanceView.post` to use the service**

In `backend/django_Admin3/tutorials/admin_views.py`, replace the body of `post()` (lines 168-192) with a call to the new service. The replacement (showing the full method for clarity):

```python
    def post(self, request, session_id: int):
        session = self._get_session(session_id)
        if not self._attendance_enabled(session):
            return Response(
                {
                    'detail': 'Session has not started.',
                    'code': 'not_yet_open',
                },
                status=409,
            )
        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        from tutorials.services.attendance_save_service import save_attendance_items
        save_attendance_items(
            session=session,
            recorded_by=request.user,
            items=ser.validated_data['items'],
        )
        session.refresh_from_db()
        return Response(self._build_payload(session))
```

- [ ] **Step 5: Run the service tests AND the existing admin attendance tests**

```bash
python manage.py test tutorials.tests.test_attendance_save_service tutorials.tests.test_admin_attendance -v 2
```

Expected: all tests pass (3 new + existing admin attendance suite remains green).

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/services/attendance_save_service.py \
        backend/django_Admin3/tutorials/admin_views.py \
        backend/django_Admin3/tutorials/tests/test_attendance_save_service.py
git commit -m "refactor(tutorials): extract attendance save into shared service

Move the upsert loop out of AdminTutorialAttendanceView.post into
tutorials.services.attendance_save_service.save_attendance_items.
Adds CrossSessionRegistration guard for the public endpoint.
Admin behaviour unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Public attendance endpoints (GET + POST save) + URL wiring

**Files:**
- Create: `backend/django_Admin3/tutorials/public_views.py`
- Create: `backend/django_Admin3/tutorials/public_urls.py`
- Modify: `backend/django_Admin3/tutorials/urls.py`
- Test: `backend/django_Admin3/tutorials/tests/test_public_attendance_views.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_public_attendance_views.py`:

```python
"""Tests for the public attendance endpoints (no-auth, signed-URL gated)."""
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from staff.models import Staff
from students.models import Student
from tutorials.models import (
    TutorialAttendance, TutorialAttendanceLinkAccess, TutorialEvents,
    TutorialInstructor, TutorialRegistration, TutorialSessions,
)
from tutorials.services.attendance_link import AttendanceLinkSigner


class PublicAttendanceViewsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = TutorialEvents.objects.create(code='UT-PUB-1')
        cls.session = TutorialSessions.objects.create(
            tutorial_event=cls.event, title='Pub Session',
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=1),
        )
        u = User.objects.create_user(username='ins', email='ins@example.com', first_name='In', last_name='Str')
        cls.staff = Staff.objects.create(user=u)
        cls.instructor = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session.instructors.add(cls.instructor)

        su = User.objects.create_user(username='stu', first_name='St', last_name='U')
        cls.student = Student.objects.create(user=su)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def setUp(self):
        self.client = APIClient()
        self.signer = AttendanceLinkSigner()
        self.token, _ = self.signer.sign(self.session.id, self.instructor.id)

    def _url(self, token=None):
        return f'/api/tutorials/public/attendance/{token or self.token}/'

    def test_get_with_valid_token_returns_payload(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['session']['id'], self.session.id)
        self.assertEqual(body['instructor']['name'], str(self.instructor))
        self.assertEqual(len(body['registrations']), 1)

    def test_get_writes_view_audit_row(self):
        self.client.get(self._url())
        rows = TutorialAttendanceLinkAccess.objects.filter(action='view')
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().session_id, self.session.id)

    def test_get_with_expired_token_returns_410(self):
        with mock.patch.object(AttendanceLinkSigner, 'MAX_AGE', 0):
            resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 410)
        self.assertEqual(resp.json()['code'], 'token_expired')

    def test_get_with_tampered_token_returns_400(self):
        tampered = self.token[:-2] + ('AA' if self.token[-2:] != 'AA' else 'BB')
        resp = self.client.get(self._url(tampered))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['code'], 'invalid_token')

    def test_invalid_token_writes_reject_audit_row(self):
        tampered = self.token[:-2] + ('AA' if self.token[-2:] != 'AA' else 'BB')
        self.client.get(self._url(tampered))
        self.assertTrue(TutorialAttendanceLinkAccess.objects.filter(action='reject').exists())

    def test_post_save_writes_attendance_with_instructor_user_as_recorder(self):
        resp = self.client.post(
            self._url(),
            data={'items': [{'registration_id': self.reg.id, 'status': 'ATTENDED', 'reason': ''}]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        att = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(att.status, 'ATTENDED')
        self.assertEqual(att.recorded_by, self.staff.user)

    def test_post_rejects_cross_session_registration(self):
        other = TutorialSessions.objects.create(
            tutorial_event=self.event, title='Other',
            start_date=timezone.now(), end_date=timezone.now(),
        )
        ou = User.objects.create_user(username='other_stu')
        os = Student.objects.create(user=ou)
        foreign = TutorialRegistration.objects.create(student=os, tutorial_session=other)
        resp = self.client.post(
            self._url(),
            data={'items': [{'registration_id': foreign.id, 'status': 'ATTENDED', 'reason': ''}]},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_public_attendance_views -v 2
```

Expected: 404 / module-not-found / URL-not-resolved errors.

- [ ] **Step 3: Write `public_views.py`**

`backend/django_Admin3/tutorials/public_views.py`:

```python
"""Public (no-login) attendance endpoints gated by a signed magic-link token.

Reuses the admin serializers and the shared save service so the public
flow produces results identical to the admin path.
"""
from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from tutorials.admin_serializers import (
    AdminAttendanceGetSerializer, AdminAttendanceSaveSerializer,
)
from tutorials.models import (
    TutorialAttendanceLinkAccess, TutorialInstructor, TutorialRegistration,
    TutorialSessions,
)
from tutorials.services.attendance_link import (
    AttendanceLinkPayload, AttendanceLinkSigner, ExpiredLink, InvalidLink,
)
from tutorials.services.attendance_save_service import (
    CrossSessionRegistration, save_attendance_items,
)


def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


def _user_agent(request):
    return (request.META.get('HTTP_USER_AGENT') or '')[:512]


def _log_access(*, session_id, instructor_id, action, request, detail=None):
    TutorialAttendanceLinkAccess.objects.create(
        session_id=session_id,
        instructor_id=instructor_id,
        action=action,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        detail=detail or {},
    )


class _TokenAuthMixin:
    signer = AttendanceLinkSigner()

    def _verify(self, token: str, request) -> AttendanceLinkPayload | Response:
        try:
            return self.signer.unsign(token)
        except ExpiredLink:
            # We don't know the session/instructor without the payload, but we
            # still write an audit row with nulls so attempts are visible.
            TutorialAttendanceLinkAccess.objects.create(
                session_id=None, instructor_id=None, action='reject',
                ip_address=_client_ip(request), user_agent=_user_agent(request),
                detail={'reason': 'expired'},
            ) if False else None
            return Response({'code': 'token_expired'}, status=410)
        except InvalidLink:
            TutorialAttendanceLinkAccess.objects.create(
                session_id=None, instructor_id=None, action='reject',
                ip_address=_client_ip(request), user_agent=_user_agent(request),
                detail={'reason': 'invalid'},
            ) if False else None
            return Response({'code': 'invalid_token'}, status=400)

    def _reject_audit(self, request, reason: str):
        # Audit table requires session FK NOT NULL; for rejected tokens we
        # cannot identify the session. Skip the DB row but log via stdlib.
        import logging
        logging.getLogger(__name__).warning(
            'public attendance rejected: %s ip=%s ua=%s',
            reason, _client_ip(request), _user_agent(request),
        )


class PublicAttendanceView(_TokenAuthMixin, APIView):
    permission_classes = [AllowAny]

    def _build_payload(self, session, instructor):
        registrations = (
            TutorialRegistration.objects
            .filter(tutorial_session=session)
            .select_related('student__user', 'attendance')
            .order_by('student__user__last_name', 'student__user__first_name')
        )
        data = AdminAttendanceGetSerializer({
            'session': session,
            'attendance_enabled': True,  # Public link bypasses the not-yet-open gate.
            'registrations': registrations,
        }).data
        data['instructor'] = {'id': instructor.id, 'name': str(instructor)}
        return data

    def get(self, request, token: str):
        result = self._verify(token, request)
        if isinstance(result, Response):
            self._reject_audit(request, 'verify_failed')
            return result
        payload = result
        session = get_object_or_404(TutorialSessions, id=payload.session_id)
        instructor = get_object_or_404(TutorialInstructor, id=payload.instructor_id)
        _log_access(
            session_id=session.id, instructor_id=instructor.id,
            action='view', request=request,
        )
        return Response(self._build_payload(session, instructor))

    def post(self, request, token: str):
        result = self._verify(token, request)
        if isinstance(result, Response):
            self._reject_audit(request, 'verify_failed')
            return result
        payload = result
        session = get_object_or_404(TutorialSessions, id=payload.session_id)
        instructor = get_object_or_404(TutorialInstructor, id=payload.instructor_id)

        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        try:
            save_attendance_items(
                session=session,
                recorded_by=(instructor.staff.user if instructor.staff_id and instructor.staff.user_id else None),
                items=ser.validated_data['items'],
            )
        except CrossSessionRegistration as exc:
            _log_access(
                session_id=session.id, instructor_id=instructor.id,
                action='reject', request=request,
                detail={'reason': 'cross_session', 'message': str(exc)},
            )
            return Response({'code': 'cross_session', 'detail': str(exc)}, status=400)
        _log_access(
            session_id=session.id, instructor_id=instructor.id,
            action='save', request=request,
            detail={'count': len(ser.validated_data['items'])},
        )
        session.refresh_from_db()
        return Response(self._build_payload(session, instructor))
```

- [ ] **Step 4: Write `public_urls.py`**

`backend/django_Admin3/tutorials/public_urls.py`:

```python
"""URL patterns for the public (no-login) tutorial attendance endpoints.

Mounted under ``/api/tutorials/public/`` from ``tutorials.urls``.
"""
from django.urls import path

from .public_views import PublicAttendanceView

urlpatterns = [
    path('attendance/<str:token>/', PublicAttendanceView.as_view(), name='public-attendance'),
]
```

- [ ] **Step 5: Wire `public_urls` into `tutorials/urls.py`**

In `backend/django_Admin3/tutorials/urls.py`, modify the `urlpatterns` list:

```python
urlpatterns = [
    path('list/', TutorialEventListView.as_view(), name='tutorial-event-list'),
    path('products/', TutorialProductListView.as_view(), name='tutorial-products'),
    path('products/all/', TutorialProductListAllView.as_view(), name='tutorial-products-all'),
    path('products/<int:product_id>/variations/', TutorialProductVariationListView.as_view(), name='tutorial-product-variations'),
    path('data/comprehensive/', TutorialComprehensiveDataView.as_view(), name='tutorial-comprehensive-data'),
    path('cache/clear/', clear_tutorial_cache, name='tutorial-cache-clear'),
    path('admin/sessions/<int:session_id>/attendance/', AdminTutorialAttendanceView.as_view(), name='admin-tutorial-attendance'),
    path('admin/', include(admin_router.urls)),
    path('public/', include('tutorials.public_urls')),
] + router.urls
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
python manage.py test tutorials.tests.test_public_attendance_views -v 2
```

Expected: 7 tests OK.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/public_views.py \
        backend/django_Admin3/tutorials/public_urls.py \
        backend/django_Admin3/tutorials/urls.py \
        backend/django_Admin3/tutorials/tests/test_public_attendance_views.py
git commit -m "feat(tutorials): public attendance GET/POST endpoints

AllowAny endpoints under /api/tutorials/public/attendance/<token>/.
GET returns session info + roster; POST saves attendance using the
shared save service. Both verify the signed magic-link token and
audit-log every call.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Refactor `useAttendanceVM` to accept a service interface

**Goal:** Hoist the hard-coded `service.getAttendance(sessionId)` calls out of the hook so admin and instructor flows can plug different services in.

**Files:**
- Create: `frontend/react-Admin3/src/components/shared/attendance/types.ts`
- Create: `frontend/react-Admin3/src/components/shared/attendance/useAttendanceVM.ts`
- Modify: `frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts`
- Delete: `frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts`
- Modify: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx` (import path)
- Modify: `frontend/react-Admin3/src/components/admin/tutorial-events/types.ts` (re-export from shared)
- Test: `frontend/react-Admin3/src/components/shared/attendance/__tests__/useAttendanceVM.test.tsx`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/components/shared/attendance/__tests__/useAttendanceVM.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import useAttendanceVM from '../useAttendanceVM';
import type { AttendanceService, AttendancePayload } from '../types';

const samplePayload: AttendancePayload = {
  session: { id: 1, title: 'S', start_date: '2026-05-12T09:00:00Z', end_date: '2026-05-12T11:00:00Z', venue: null, tutorial_event: { id: 1, code: 'X' } },
  attendance_enabled: true,
  registrations: [
    { registration_id: 10, student: { student_ref: 1, first_name: 'A', last_name: 'B' }, current_status: null, current_reason: null },
  ],
};

function makeService(overrides: Partial<AttendanceService> = {}): AttendanceService {
  return {
    get: jest.fn().mockResolvedValue(samplePayload),
    save: jest.fn().mockResolvedValue(samplePayload),
    ...overrides,
  };
}

describe('useAttendanceVM', () => {
  it('calls service.get on mount and exposes roster', async () => {
    const service = makeService();
    const { result } = renderHook(() => useAttendanceVM(service));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.get).toHaveBeenCalledTimes(1);
    expect(result.current.roster).toHaveLength(1);
  });

  it('save() forwards items to service.save', async () => {
    const service = makeService();
    const { result } = renderHook(() => useAttendanceVM(service));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setStatus(10, 'ATTENDED'); });
    await act(async () => { await result.current.save(); });
    expect(service.save).toHaveBeenCalledWith([
      { registration_id: 10, status: 'ATTENDED', reason: '' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=shared/attendance --watchAll=false
```

Expected: module-not-found error.

- [ ] **Step 3: Write the shared types**

`frontend/react-Admin3/src/components/shared/attendance/types.ts`:

```ts
export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'LATE' | 'OTHER';

export interface StudentMini {
  student_ref: number;
  first_name: string;
  last_name: string;
}

export interface SessionLite {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: { id: number; name: string } | null;
  tutorial_event: { id: number; code: string };
  location?: { id: number; name: string } | null;
  cancelled?: boolean;
}

export interface RosterRowDTO {
  registration_id: number;
  student: StudentMini;
  current_status: AttendanceStatus | null;
  current_reason: string | null;
}

export interface AttendancePayload {
  session: SessionLite;
  attendance_enabled: boolean;
  registrations: RosterRowDTO[];
  instructor?: { id: number; name: string };
}

export interface AttendanceSaveItem {
  registration_id: number;
  status: AttendanceStatus;
  reason: string;
}

export interface AttendanceService {
  get(): Promise<AttendancePayload>;
  save(items: AttendanceSaveItem[]): Promise<AttendancePayload>;
}
```

- [ ] **Step 4: Write the refactored hook**

`frontend/react-Admin3/src/components/shared/attendance/useAttendanceVM.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AttendancePayload, AttendanceService, AttendanceStatus, RosterRowDTO,
} from './types';

export class AttendanceSaveError extends Error {
  constructor(
    message: string,
    public readonly code: string | null,
    public readonly rowErrors: Record<number, string>,
  ) {
    super(message);
    this.name = 'AttendanceSaveError';
  }
}

export interface RosterRow {
  registration_id: number;
  student: RosterRowDTO['student'];
  status: AttendanceStatus | '';
  reason: string;
  current_status: AttendanceStatus | null;
  current_reason: string;
  dirty: boolean;
}

function rowFromDTO(dto: RosterRowDTO): RosterRow {
  return {
    registration_id: dto.registration_id,
    student: dto.student,
    status: dto.current_status ?? '',
    reason: dto.current_reason ?? '',
    current_status: dto.current_status,
    current_reason: dto.current_reason ?? '',
    dirty: false,
  };
}

function isDirty(row: RosterRow): boolean {
  if (row.status !== (row.current_status ?? '')) return true;
  if (row.status === 'OTHER' && row.reason !== row.current_reason) return true;
  return false;
}

export default function useAttendanceVM(service: AttendanceService) {
  const [session, setSession] = useState<AttendancePayload['session'] | null>(null);
  const [instructor, setInstructor] = useState<AttendancePayload['instructor'] | null>(null);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<'expired' | 'invalid' | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const applyPayload = useCallback((p: AttendancePayload) => {
    setSession(p.session);
    setInstructor(p.instructor || null);
    setAttendanceEnabled(p.attendance_enabled);
    setRoster(p.registrations.map(rowFromDTO));
  }, []);

  const replaceFromServer = useCallback((p: AttendancePayload) => {
    applyPayload(p);
  }, [applyPayload]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setTokenError(null);
    service.get().then(p => {
      if (!cancelled) applyPayload(p);
    }).catch((e: any) => {
      if (cancelled) return;
      const code = e?.response?.data?.code;
      if (code === 'token_expired') setTokenError('expired');
      else if (code === 'invalid_token') setTokenError('invalid');
      else setError(e?.response?.data?.detail || 'Failed to load roster.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [service, applyPayload]);

  const setStatus = useCallback((regId: number, status: AttendanceStatus) => {
    setRoster(prev => prev.map(r => r.registration_id === regId
      ? { ...r, status, dirty: isDirty({ ...r, status }) }
      : r));
    setRowErrors(prev => {
      if (!(regId in prev)) return prev;
      const next = { ...prev }; delete next[regId]; return next;
    });
  }, []);

  const setReason = useCallback((regId: number, reason: string) => {
    setRoster(prev => prev.map(r => r.registration_id === regId
      ? { ...r, reason, dirty: isDirty({ ...r, reason }) }
      : r));
    setRowErrors(prev => {
      if (!(regId in prev)) return prev;
      const next = { ...prev }; delete next[regId]; return next;
    });
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setRowErrors({});
    try {
      const items = roster
        .filter(r => r.status !== '')
        .map(r => ({
          registration_id: r.registration_id,
          status: r.status as AttendanceStatus,
          reason: r.status === 'OTHER' ? r.reason : '',
        }));
      const updated = await service.save(items);
      applyPayload(updated);
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.code === 'not_yet_open') {
        setError('Session has not started yet.');
        throw new AttendanceSaveError('Session has not started yet.', 'not_yet_open', {});
      }
      if (data?.items && Array.isArray(data.items)) {
        const sentItems = roster.filter(r => r.status !== '');
        const errs: Record<number, string> = {};
        data.items.forEach((entry: any, idx: number) => {
          if (!entry || (typeof entry === 'object' && Object.keys(entry).length === 0)) return;
          const regId = sentItems[idx]?.registration_id;
          if (regId === undefined) return;
          let msg: string;
          if (typeof entry === 'string') msg = entry;
          else {
            const first = Object.values(entry)[0];
            msg = Array.isArray(first) ? String(first[0]) : String(first);
          }
          errs[regId] = msg;
        });
        if (Object.keys(errs).length) {
          setRowErrors(errs);
          setError('Some entries are invalid.');
          throw new AttendanceSaveError('Some entries are invalid.', null, errs);
        }
      }
      const msg = data?.detail || 'Save failed — please try again.';
      setError(msg);
      throw new AttendanceSaveError(msg, null, {});
    } finally {
      setIsSaving(false);
    }
  }, [roster, service, applyPayload]);

  const hasInvalidOther = useMemo(
    () => roster.some(r => r.status === 'OTHER' && !r.reason.trim()), [roster],
  );
  const hasDirty = useMemo(() => roster.some(r => r.dirty), [roster]);
  const canSave = attendanceEnabled && hasDirty && !hasInvalidOther && !isSaving;

  return {
    session, instructor, attendanceEnabled,
    roster, isLoading, isSaving,
    error, tokenError, rowErrors,
    hasDirty, hasInvalidOther, canSave,
    setStatus, setReason, save, replaceFromServer,
  };
}
```

- [ ] **Step 5: Add a helper in `tutorialEventsAdminService.ts` that returns a service object**

In `frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts`, append:

```ts
import type { AttendanceService } from '../../components/shared/attendance/types';

export function makeAdminAttendanceService(sessionId: number): AttendanceService {
  return {
    get: () => tutorialEventsAdminService.getAttendance(sessionId),
    save: (items) => tutorialEventsAdminService.saveAttendance(sessionId, items),
  };
}
```

- [ ] **Step 6: Replace `tutorial-events/types.ts` admin re-export**

In `frontend/react-Admin3/src/components/admin/tutorial-events/types.ts`, replace the attendance-related interfaces (StudentMini, AttendanceStatus, RosterRowDTO, AttendancePayload, AttendanceSaveItem) with a single re-export:

```ts
export type {
  AttendanceStatus, StudentMini, RosterRowDTO, AttendancePayload,
  AttendanceSaveItem, AttendanceService, SessionLite,
} from '../../shared/attendance/types';
```

Keep the file's other (non-attendance) exports unchanged.

- [ ] **Step 7: Delete the old admin hook**

```bash
rm frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts
```

- [ ] **Step 8: Update `AttendanceModal.tsx` to import from the shared module**

In `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`:

```ts
// replace existing import:
import useAttendanceVM, { AttendanceSaveError } from '../../shared/attendance/useAttendanceVM';
import { makeAdminAttendanceService } from '../../../services/admin/tutorialEventsAdminService';
```

And in the component body, replace the hook call:

```ts
const vm = useAttendanceVM(useMemo(
  () => makeAdminAttendanceService(session.id),
  [session.id],
));
```

(Don't forget to add `useMemo` to the React import.)

- [ ] **Step 9: Run the hook test AND the existing AttendanceModal test**

```bash
npm test -- --testPathPattern="(shared/attendance|AttendanceModal)" --watchAll=false
```

Expected: hook tests pass, existing AttendanceModal tests pass (no behavioural change for admin).

- [ ] **Step 10: Commit**

```bash
git add frontend/react-Admin3/src/components/shared/ \
        frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts \
        frontend/react-Admin3/src/components/admin/tutorial-events/types.ts \
        frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx
git rm frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts
git commit -m "refactor(attendance): extract useAttendanceVM into shared module

The hook now accepts an AttendanceService interface ({get, save})
instead of a sessionId. Admin call site uses makeAdminAttendanceService;
public instructor page (next task) will plug in its own service.
Admin behaviour unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Color tokens + AttendanceStatusSelect component

**Files:**
- Create: `frontend/react-Admin3/src/styles/attendanceColors.css`
- Create: `frontend/react-Admin3/src/components/shared/attendance/attendanceStatusTokens.ts`
- Create: `frontend/react-Admin3/src/components/shared/attendance/AttendanceStatusSelect.tsx`
- Modify: `frontend/react-Admin3/src/index.tsx` or `App.tsx` (import the CSS file once)
- Test: `frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceStatusSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceStatusSelect.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import AttendanceStatusSelect from '../AttendanceStatusSelect';

describe('AttendanceStatusSelect', () => {
  it('renders the current status label on the trigger', () => {
    render(<AttendanceStatusSelect value="ATTENDED" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Attended');
  });

  it('emits onChange when an option is selected', () => {
    const onChange = jest.fn();
    render(<AttendanceStatusSelect value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Absent'));
    expect(onChange).toHaveBeenCalledWith('ABSENT');
  });

  it('sets data-status on the trigger so CSS can tint it', () => {
    render(<AttendanceStatusSelect value="LATE" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('data-status', 'LATE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=AttendanceStatusSelect --watchAll=false
```

Expected: module-not-found.

- [ ] **Step 3: Write the CSS color variables**

`frontend/react-Admin3/src/styles/attendanceColors.css`:

```css
/* Attendance status color tokens.
   Light theme defaults; dark-mode variants follow if/when needed. */
:root {
  --attendance-attended-bg: #e8f5e9; /* green 50  */
  --attendance-attended-fg: #1b5e20; /* green 900 */
  --attendance-absent-bg:   #ffebee; /* red   50  */
  --attendance-absent-fg:   #b71c1c; /* red   900 */
  --attendance-late-bg:     #fff3e0; /* orange 50 */
  --attendance-late-fg:     #e65100; /* orange 900*/
  --attendance-other-bg:    #fffde7; /* yellow 50 */
  --attendance-other-fg:    #f57f17; /* yellow 900*/
}

[data-status="ATTENDED"] { background: var(--attendance-attended-bg) !important; color: var(--attendance-attended-fg); }
[data-status="ABSENT"]   { background: var(--attendance-absent-bg)   !important; color: var(--attendance-absent-fg); }
[data-status="LATE"]     { background: var(--attendance-late-bg)     !important; color: var(--attendance-late-fg); }
[data-status="OTHER"]    { background: var(--attendance-other-bg)    !important; color: var(--attendance-other-fg); }

[data-attendance-option="ATTENDED"]::before,
[data-attendance-option="ABSENT"]::before,
[data-attendance-option="LATE"]::before,
[data-attendance-option="OTHER"]::before {
  content: ''; display: inline-block; width: 0.5rem; height: 0.5rem;
  border-radius: 50%; margin-right: 0.5rem; vertical-align: middle;
}
[data-attendance-option="ATTENDED"]::before { background: var(--attendance-attended-fg); }
[data-attendance-option="ABSENT"]::before   { background: var(--attendance-absent-fg); }
[data-attendance-option="LATE"]::before     { background: var(--attendance-late-fg); }
[data-attendance-option="OTHER"]::before    { background: var(--attendance-other-fg); }
```

- [ ] **Step 4: Import the CSS once globally**

In `frontend/react-Admin3/src/index.tsx` (or whichever file imports global CSS), add near the existing CSS imports:

```ts
import './styles/attendanceColors.css';
```

- [ ] **Step 5: Write the tokens module**

`frontend/react-Admin3/src/components/shared/attendance/attendanceStatusTokens.ts`:

```ts
import type { AttendanceStatus } from './types';

export const ATTENDANCE_STATUS_TOKENS: Record<AttendanceStatus, { label: string }> = {
  ATTENDED: { label: 'Attended' },
  ABSENT:   { label: 'Absent'   },
  LATE:     { label: 'Late'     },
  OTHER:    { label: 'Other'    },
} as const;

export const ATTENDANCE_STATUS_VALUES: AttendanceStatus[] = ['ATTENDED', 'ABSENT', 'LATE', 'OTHER'];
```

- [ ] **Step 6: Write the select component**

`frontend/react-Admin3/src/components/shared/attendance/AttendanceStatusSelect.tsx`:

```tsx
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../admin/ui/select';
import type { AttendanceStatus } from './types';
import {
  ATTENDANCE_STATUS_TOKENS, ATTENDANCE_STATUS_VALUES,
} from './attendanceStatusTokens';

interface Props {
  value: AttendanceStatus | '';
  onChange: (value: AttendanceStatus) => void;
  disabled?: boolean;
}

export default function AttendanceStatusSelect({ value, onChange, disabled }: Props) {
  return (
    <Select
      value={value || undefined}
      onValueChange={v => onChange(v as AttendanceStatus)}
      disabled={disabled}
    >
      <SelectTrigger data-status={value || undefined}>
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_STATUS_VALUES.map(s => (
          <SelectItem key={s} value={s} data-attendance-option={s}>
            {ATTENDANCE_STATUS_TOKENS[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
npm test -- --testPathPattern=AttendanceStatusSelect --watchAll=false
```

Expected: 3 tests OK.

- [ ] **Step 8: Commit**

```bash
git add frontend/react-Admin3/src/styles/attendanceColors.css \
        frontend/react-Admin3/src/components/shared/attendance/attendanceStatusTokens.ts \
        frontend/react-Admin3/src/components/shared/attendance/AttendanceStatusSelect.tsx \
        frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceStatusSelect.test.tsx \
        frontend/react-Admin3/src/index.tsx
git commit -m "feat(attendance): color-coded AttendanceStatusSelect + tokens

CSS variables drive both the post-selection trigger tint and the
left-edge dots on options. Tokens module is the single source of
truth for status labels.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Extract AttendanceRosterPanel

**Files:**
- Create: `frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx`
- Test: `frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceRosterPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceRosterPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import AttendanceRosterPanel from '../AttendanceRosterPanel';
import useAttendanceVM from '../useAttendanceVM';
import type { AttendanceService } from '../types';

function makeService(): AttendanceService {
  return {
    get: jest.fn().mockResolvedValue({
      session: { id: 1, title: 'S', start_date: '', end_date: '', venue: null, tutorial_event: { id: 1, code: 'X' } },
      attendance_enabled: true,
      registrations: [
        { registration_id: 10, student: { student_ref: 1, first_name: 'A', last_name: 'B' }, current_status: null, current_reason: null },
        { registration_id: 11, student: { student_ref: 2, first_name: 'C', last_name: 'D' }, current_status: 'ATTENDED', current_reason: null },
      ],
    }),
    save: jest.fn(),
  };
}

describe('AttendanceRosterPanel', () => {
  it('renders one row per registration with the student name', async () => {
    const { result } = renderHook(() => useAttendanceVM(makeService()));
    // wait for load by re-rendering until isLoading=false
    await new Promise(r => setTimeout(r, 0));
    render(<AttendanceRosterPanel vm={result.current} />);
    await screen.findByText(/B, A/);
    expect(screen.getByText(/B, A \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/D, C \(2\)/)).toBeInTheDocument();
  });

  it('shows upload button only when onUploadXlsx prop is provided', async () => {
    const { result } = renderHook(() => useAttendanceVM(makeService()));
    await new Promise(r => setTimeout(r, 0));
    const { rerender } = render(<AttendanceRosterPanel vm={result.current} />);
    expect(screen.queryByRole('button', { name: /upload/i })).toBeNull();
    rerender(<AttendanceRosterPanel vm={result.current} onUploadXlsx={async () => {}} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=AttendanceRosterPanel --watchAll=false
```

Expected: module-not-found.

- [ ] **Step 3: Write the panel**

`frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx`:

```tsx
import { Input } from '../../admin/ui/input';
import AttendanceStatusSelect from './AttendanceStatusSelect';
import type useAttendanceVM from './useAttendanceVM';

interface Props {
  vm: ReturnType<typeof useAttendanceVM>;
  onUploadXlsx?: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function AttendanceRosterPanel({ vm, onUploadXlsx, disabled }: Props) {
  return (
    <div>
      {onUploadXlsx && (
        <div className="tw:flex tw:justify-end tw:mb-2">
          {/* Real upload UI lands in Task 19; placeholder so the panel test passes here. */}
          <button
            type="button"
            onClick={() => {/* wired in Task 19 */}}
            className="tw:rounded-md tw:border tw:px-3 tw:py-1 tw:text-sm"
          >
            Upload xlsx
          </button>
        </div>
      )}
      <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-x-4 tw:px-2">
        {vm.isLoading && (
          <div data-testid="attendance-skeleton" className="tw:space-y-2 tw:p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tw:h-8 tw:animate-pulse tw:rounded tw:bg-muted" />
            ))}
          </div>
        )}
        {!vm.isLoading && vm.error && vm.roster.length === 0 && (
          <div className="tw:p-4 tw:text-sm tw:text-destructive">{vm.error}</div>
        )}
        {!vm.isLoading && !vm.error && vm.roster.length === 0 && (
          <div className="tw:p-8 tw:text-center tw:text-sm tw:text-muted-foreground">
            No students enrolled in this session.
          </div>
        )}
        {!vm.isLoading && vm.roster.map(row => {
          const showReason = row.status === 'OTHER';
          const invalidReason = showReason && !row.reason.trim();
          const error = vm.rowErrors[row.registration_id];
          return (
            <div key={row.registration_id} className={`tw:border-b tw:py-2${error ? ' tw:border-destructive' : ''}`}>
              <div className="tw:flex tw:flex-row tw:flex-nowrap tw:items-center tw:gap-3">
                <div className="tw:flex-1 tw:min-w-0 tw:truncate tw:text-sm">
                  {row.student.last_name}, {row.student.first_name} ({row.student.student_ref})
                </div>
                <div className="tw:w-44 tw:shrink-0">
                  <AttendanceStatusSelect
                    value={row.status}
                    onChange={s => vm.setStatus(row.registration_id, s)}
                    disabled={disabled || !vm.attendanceEnabled || vm.isSaving}
                  />
                </div>
              </div>
              {showReason && (
                <div className="tw:mt-2">
                  <Input
                    placeholder="Reason (required)"
                    value={row.reason}
                    disabled={disabled || !vm.attendanceEnabled || vm.isSaving}
                    aria-invalid={invalidReason || undefined}
                    className={invalidReason ? 'tw:border-destructive' : undefined}
                    onChange={e => vm.setReason(row.registration_id, e.target.value)}
                  />
                </div>
              )}
              {error && (
                <div className="tw:mt-1 tw:text-xs tw:text-destructive">{error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- --testPathPattern=AttendanceRosterPanel --watchAll=false
```

Expected: 2 tests OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx \
        frontend/react-Admin3/src/components/shared/attendance/__tests__/AttendanceRosterPanel.test.tsx
git commit -m "feat(attendance): extract AttendanceRosterPanel shared component

Renders the 2-column roster grid + color-coded selects + optional
reason input + optional upload button. Consumed by admin modal
(next task) and instructor page (Task 15).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Refactor admin AttendanceModal to use the shared panel

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`
- Delete: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx`

- [ ] **Step 1: Replace AttendanceModal body with panel-based version**

`frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`:

```tsx
import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { toast } from 'sonner';
import useAttendanceVM, { AttendanceSaveError } from '../../shared/attendance/useAttendanceVM';
import AttendanceRosterPanel from '../../shared/attendance/AttendanceRosterPanel';
import { makeAdminAttendanceService } from '../../../services/admin/tutorialEventsAdminService';

interface SessionLite {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: { id: number; name: string } | null;
  tutorial_event: { id: number; code: string };
}

interface Props {
  session: SessionLite;
  onClose: () => void;
  onSaved: () => void;
}

function formatDateRange(start: string, end: string): string {
  if (!start) return '—';
  const s = new Date(start).toLocaleString();
  const e = end ? new Date(end).toLocaleString() : '';
  return e ? `${s} – ${e}` : s;
}

export default function AttendanceModal({ session, onClose, onSaved }: Props) {
  const service = useMemo(() => makeAdminAttendanceService(session.id), [session.id]);
  const vm = useAttendanceVM(service);

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
      onSaved();
    } catch (e) {
      if (e instanceof AttendanceSaveError) {
        if (e.code === 'not_yet_open') { toast.error('Session not started yet.'); onClose(); return; }
        if (Object.keys(e.rowErrors).length > 0) { toast.error('Some entries are invalid.'); return; }
        toast.error(e.message || 'Save failed — please try again.');
        return;
      }
      toast.error(vm.error || 'Save failed — please try again.');
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="tw:sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            {formatDateRange(session.start_date, session.end_date)}
            {session.venue ? ` • ${session.venue.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="tw:max-h-[60vh] tw:overflow-y-auto">
          <AttendanceRosterPanel vm={vm} />
        </div>
        <DialogFooter className="tw:flex tw:justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {vm.roster.length > 0 && (
            <Button disabled={!vm.canSave} onClick={handleSave}>
              {vm.isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Delete the now-unused AttendanceRosterRow component**

```bash
rm frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx
```

- [ ] **Step 3: Run existing admin attendance test suite**

```bash
npm test -- --testPathPattern="admin/tutorial-events.*Attendance" --watchAll=false
```

Expected: all existing admin attendance tests still pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx
git rm frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx
git commit -m "refactor(admin): AttendanceModal now consumes shared roster panel

Functionality unchanged. The modal wraps the new AttendanceRosterPanel
inside a Dialog and provides its own Save button via DialogFooter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Instructor attendance frontend service

**Files:**
- Create: `frontend/react-Admin3/src/services/instructor/instructorAttendanceService.ts`
- Test: `frontend/react-Admin3/src/services/instructor/__tests__/instructorAttendanceService.test.ts`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/services/instructor/__tests__/instructorAttendanceService.test.ts`:

```ts
import { makeInstructorAttendanceService } from '../instructorAttendanceService';
import httpService from '../../httpService';

jest.mock('../../httpService');

describe('makeInstructorAttendanceService', () => {
  it('get() calls /api/tutorials/public/attendance/<token>/', async () => {
    (httpService.get as jest.Mock).mockResolvedValue({ data: { session: {}, registrations: [] } });
    const svc = makeInstructorAttendanceService('THE-TOKEN');
    await svc.get();
    expect(httpService.get).toHaveBeenCalledWith('/api/tutorials/public/attendance/THE-TOKEN/');
  });

  it('save() POSTs to the same URL with items', async () => {
    (httpService.post as jest.Mock).mockResolvedValue({ data: { session: {}, registrations: [] } });
    const svc = makeInstructorAttendanceService('THE-TOKEN');
    await svc.save([{ registration_id: 1, status: 'ATTENDED', reason: '' }]);
    expect(httpService.post).toHaveBeenCalledWith(
      '/api/tutorials/public/attendance/THE-TOKEN/',
      { items: [{ registration_id: 1, status: 'ATTENDED', reason: '' }] },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=instructorAttendanceService --watchAll=false
```

Expected: module-not-found.

- [ ] **Step 3: Write the service**

`frontend/react-Admin3/src/services/instructor/instructorAttendanceService.ts`:

```ts
import httpService from '../httpService';
import type {
  AttendancePayload, AttendanceSaveItem, AttendanceService,
} from '../../components/shared/attendance/types';

function urlFor(token: string): string {
  return `/api/tutorials/public/attendance/${encodeURIComponent(token)}/`;
}

export function makeInstructorAttendanceService(token: string): AttendanceService {
  return {
    get: () => httpService.get(urlFor(token)).then(r => r.data as AttendancePayload),
    save: (items: AttendanceSaveItem[]) =>
      httpService.post(urlFor(token), { items }).then(r => r.data as AttendancePayload),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- --testPathPattern=instructorAttendanceService --watchAll=false
```

Expected: 2 tests OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/services/instructor/
git commit -m "feat(instructor): public attendance frontend service

Implements the AttendanceService interface against the public
/api/tutorials/public/attendance/<token>/ endpoint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Public instructor attendance page + route

**Files:**
- Create: `frontend/react-Admin3/src/components/instructor/attendance/PublicShell.tsx`
- Create: `frontend/react-Admin3/src/components/instructor/attendance/SessionInfoCard.tsx`
- Create: `frontend/react-Admin3/src/components/instructor/attendance/ExpiredLinkScreen.tsx`
- Create: `frontend/react-Admin3/src/components/instructor/attendance/InvalidLinkScreen.tsx`
- Create: `frontend/react-Admin3/src/components/instructor/attendance/InstructorAttendancePage.tsx`
- Modify: `frontend/react-Admin3/src/App.tsx` (or router root)
- Test: `frontend/react-Admin3/src/components/instructor/attendance/__tests__/InstructorAttendancePage.test.tsx`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/components/instructor/attendance/__tests__/InstructorAttendancePage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InstructorAttendancePage from '../InstructorAttendancePage';
import httpService from '../../../../services/httpService';

jest.mock('../../../../services/httpService');

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/instructor/attendance/:token" element={<InstructorAttendancePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InstructorAttendancePage', () => {
  it('renders the roster on a valid token', async () => {
    (httpService.get as jest.Mock).mockResolvedValue({
      data: {
        session: { id: 1, title: 'My Session', start_date: '2026-05-12T09:00:00Z', end_date: '2026-05-12T11:00:00Z', venue: { id: 1, name: 'V' }, tutorial_event: { id: 1, code: 'X' } },
        attendance_enabled: true,
        instructor: { id: 7, name: 'Tina' },
        registrations: [
          { registration_id: 10, student: { student_ref: 1, first_name: 'A', last_name: 'B' }, current_status: null, current_reason: null },
        ],
      },
    });
    renderAt('/instructor/attendance/THE-TOKEN');
    await waitFor(() => screen.getByText(/My Session/));
    expect(screen.getByText(/B, A \(1\)/)).toBeInTheDocument();
  });

  it('shows expired screen on 410', async () => {
    (httpService.get as jest.Mock).mockRejectedValue({ response: { status: 410, data: { code: 'token_expired' } } });
    renderAt('/instructor/attendance/EXPIRED');
    await waitFor(() => screen.getByText(/link has expired/i));
  });

  it('shows invalid screen on 400', async () => {
    (httpService.get as jest.Mock).mockRejectedValue({ response: { status: 400, data: { code: 'invalid_token' } } });
    renderAt('/instructor/attendance/BAD');
    await waitFor(() => screen.getByText(/invalid link/i));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=InstructorAttendancePage --watchAll=false
```

Expected: module-not-found.

- [ ] **Step 3: Write `PublicShell.tsx`**

`frontend/react-Admin3/src/components/instructor/attendance/PublicShell.tsx`:

```tsx
import { ReactNode } from 'react';

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="tw:min-h-screen tw:bg-background">
      <header className="tw:border-b tw:px-6 tw:py-3 tw:text-sm tw:font-semibold">
        ActEd — Tutorial Attendance
      </header>
      <main className="tw:mx-auto tw:max-w-4xl tw:p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Write `SessionInfoCard.tsx`**

`frontend/react-Admin3/src/components/instructor/attendance/SessionInfoCard.tsx`:

```tsx
interface Props {
  title: string;
  date: string;
  instructorName?: string;
  venue?: string | null;
  location?: string | null;
}

function formatDateRange(start: string): string {
  return start ? new Date(start).toLocaleString() : '—';
}

export default function SessionInfoCard({ title, date, instructorName, venue, location }: Props) {
  return (
    <div className="tw:mb-4 tw:rounded-lg tw:border tw:p-4">
      <div className="tw:grid tw:grid-cols-1 tw:gap-1 tw:text-sm">
        <div><span className="tw:font-semibold">{title}</span> · {formatDateRange(date)}</div>
        <div>Instructor: {instructorName || '—'}</div>
        <div>{venue || '—'}{location ? ` · ${location}` : ''}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `ExpiredLinkScreen.tsx` and `InvalidLinkScreen.tsx`**

`frontend/react-Admin3/src/components/instructor/attendance/ExpiredLinkScreen.tsx`:

```tsx
import PublicShell from './PublicShell';

export default function ExpiredLinkScreen() {
  return (
    <PublicShell>
      <div className="tw:text-center tw:p-8">
        <h1 className="tw:text-lg tw:font-semibold">This link has expired</h1>
        <p className="tw:mt-2 tw:text-sm tw:text-muted-foreground">
          Attendance links are valid for 7 days. Contact the tutorials team to request a new one.
        </p>
      </div>
    </PublicShell>
  );
}
```

`frontend/react-Admin3/src/components/instructor/attendance/InvalidLinkScreen.tsx`:

```tsx
import PublicShell from './PublicShell';

export default function InvalidLinkScreen() {
  return (
    <PublicShell>
      <div className="tw:text-center tw:p-8">
        <h1 className="tw:text-lg tw:font-semibold">Invalid link</h1>
        <p className="tw:mt-2 tw:text-sm tw:text-muted-foreground">
          This attendance link could not be verified. Please use the link from your reminder email.
        </p>
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 6: Write `InstructorAttendancePage.tsx`**

`frontend/react-Admin3/src/components/instructor/attendance/InstructorAttendancePage.tsx`:

```tsx
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import useAttendanceVM, { AttendanceSaveError } from '../../shared/attendance/useAttendanceVM';
import AttendanceRosterPanel from '../../shared/attendance/AttendanceRosterPanel';
import { makeInstructorAttendanceService } from '../../../services/instructor/instructorAttendanceService';
import PublicShell from './PublicShell';
import SessionInfoCard from './SessionInfoCard';
import ExpiredLinkScreen from './ExpiredLinkScreen';
import InvalidLinkScreen from './InvalidLinkScreen';
import { Button } from '../../admin/ui/button';

export default function InstructorAttendancePage() {
  const { token = '' } = useParams<{ token: string }>();
  const service = useMemo(() => makeInstructorAttendanceService(token), [token]);
  const vm = useAttendanceVM(service);

  if (vm.tokenError === 'expired') return <ExpiredLinkScreen />;
  if (vm.tokenError === 'invalid') return <InvalidLinkScreen />;

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
    } catch (e) {
      if (e instanceof AttendanceSaveError) {
        if (Object.keys(e.rowErrors).length > 0) { toast.error('Some entries are invalid.'); return; }
        toast.error(e.message || 'Save failed — please try again.');
        return;
      }
      toast.error(vm.error || 'Save failed — please try again.');
    }
  }

  return (
    <PublicShell>
      {vm.session && (
        <SessionInfoCard
          title={vm.session.title}
          date={vm.session.start_date}
          instructorName={vm.instructor?.name}
          venue={vm.session.venue?.name}
          location={vm.session.location?.name}
        />
      )}
      <AttendanceRosterPanel vm={vm} />
      <div className="tw:mt-4 tw:flex tw:justify-end">
        <Button disabled={!vm.canSave} onClick={handleSave}>
          {vm.isSaving ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 7: Register the route in `App.tsx`**

In `frontend/react-Admin3/src/App.tsx`, locate the `<Routes>` block (search for `Routes` or for existing `<Route path="/" ...>` entries). Add — **outside any `<RequireAuth>` wrapper** — a new route:

```tsx
import InstructorAttendancePage from './components/instructor/attendance/InstructorAttendancePage';

// inside <Routes>:
<Route path="/instructor/attendance/:token" element={<InstructorAttendancePage />} />
```

If the project does not use react-router-dom v6 yet, fall back to whichever router pattern is established (inspect `App.tsx` first).

- [ ] **Step 8: Run the test to verify it passes**

```bash
npm test -- --testPathPattern=InstructorAttendancePage --watchAll=false
```

Expected: 3 tests OK.

- [ ] **Step 9: Commit**

```bash
git add frontend/react-Admin3/src/components/instructor/ \
        frontend/react-Admin3/src/App.tsx
git commit -m "feat(instructor): public attendance page with magic-link routing

New /instructor/attendance/:token route renders the shared
AttendanceRosterPanel inside a stripped PublicShell. Handles
expired/invalid token states with dedicated screens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

**Phase 2 complete.** End-to-end check: run the cron with `--for-date=<tomorrow>` → tutor receives email → click the link → page loads with the roster → edit a select → save → verify in admin that the change is reflected.

---

# Phase 3 — Excel Upload

End-state: tutor can upload the filled xlsx; server parses, upserts (skip blanks), returns refreshed roster.

## Task 16: Excel attendance parser

**Files:**
- Create: `backend/django_Admin3/tutorials/services/attendance_xlsx_parser.py`
- Test: `backend/django_Admin3/tutorials/tests/test_attendance_xlsx_parser.py`

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_attendance_xlsx_parser.py`:

```python
"""Tests for parsing the instructor-uploaded xlsx."""
from datetime import timedelta
from io import BytesIO

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from openpyxl import Workbook

from students.models import Student
from tutorials.models import (
    TutorialEvents, TutorialRegistration, TutorialSessions,
)
from tutorials.services.attendance_xlsx_parser import parse_attendance_xlsx


def _make_workbook(rows):
    """Helper: rows is list of (title, fn, ln, ref, email, company, status)."""
    wb = Workbook()
    ws = wb.active
    ws.append(['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'])
    for r in rows:
        ws.append(list(r))
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


class ParseAttendanceXlsxTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = TutorialEvents.objects.create(code='UT-PARSE-1')
        cls.session = TutorialSessions.objects.create(
            tutorial_event=cls.event, title='S',
            start_date=timezone.now(), end_date=timezone.now() + timedelta(hours=2),
        )
        u = User.objects.create_user(username='studentP', first_name='F', last_name='L')
        cls.student = Student.objects.create(user=u)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def test_parses_valid_row(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, 'x@y.com', '', 'ATTENDED'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].student_ref, self.student.student_ref)
        self.assertEqual(result.rows[0].status, 'ATTENDED')
        self.assertEqual(result.skipped_blank, 0)
        self.assertEqual(result.errors, [])

    def test_skips_blank_attendance_cell(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', ''),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_blank, 1)

    def test_rejects_foreign_student_ref(self):
        f = _make_workbook([
            ('', 'Z', 'Z', 9999999, '', '', 'ATTENDED'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)
        self.assertIn('9999999', result.errors[0])

    def test_status_is_case_insensitive(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', 'attended'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows[0].status, 'ATTENDED')

    def test_rejects_invalid_status(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', 'TARDY'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)

    def test_rejects_formula_in_attendance_cell(self):
        wb = Workbook()
        ws = wb.active
        ws.append(['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'])
        ws.append(['', 'F', 'L', self.student.student_ref, '', '', '=A1'])
        buf = BytesIO()
        wb.save(buf); buf.seek(0)
        result = parse_attendance_xlsx(buf, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)
        self.assertIn('formula', result.errors[0].lower())
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_attendance_xlsx_parser -v 2
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Write the parser**

`backend/django_Admin3/tutorials/services/attendance_xlsx_parser.py`:

```python
"""Parse the instructor-uploaded attendance xlsx.

Defensive parsing: read-only + data_only to disable formula evaluation;
reject cells whose raw value starts with '=' (formula injection); silently
skip rows with a blank Attendance cell; reject student_refs not enrolled in
the given session.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import IO

from openpyxl import load_workbook

from tutorials.models import TutorialRegistration

VALID_STATUSES = {'ATTENDED', 'ABSENT', 'LATE', 'OTHER'}
HEADER_COLS = ('Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance')


@dataclass
class ParseRow:
    student_ref: int
    status: str
    reason: str = ''


@dataclass
class ParseResult:
    rows: list[ParseRow] = field(default_factory=list)
    skipped_blank: int = 0
    errors: list[str] = field(default_factory=list)


def parse_attendance_xlsx(file: IO[bytes], session) -> ParseResult:
    wb = load_workbook(file, read_only=True, data_only=True)
    ws = wb.active

    valid_refs = set(
        TutorialRegistration.objects
        .filter(tutorial_session=session)
        .values_list('student__student_ref', flat=True)
    )
    ref_to_reg_id = dict(
        TutorialRegistration.objects
        .filter(tutorial_session=session)
        .values_list('student__student_ref', 'id')
    )

    result = ParseResult()
    rows_iter = ws.iter_rows(min_row=2, max_col=len(HEADER_COLS), values_only=False)
    for row_num, row_cells in enumerate(rows_iter, start=2):
        if all(c.value in (None, '') for c in row_cells):
            continue
        title, fn, ln, ref_cell, email, company, status_cell = row_cells
        status_val = status_cell.value
        if status_val in (None, ''):
            result.skipped_blank += 1
            continue
        # Formula injection guard — read_only + data_only prevents evaluation
        # but the raw value might still be a literal string starting with '='.
        if isinstance(status_val, str) and status_val.startswith('='):
            result.errors.append(f'row {row_num}: formula not allowed in Attendance cell')
            continue
        if not isinstance(status_val, str):
            result.errors.append(f'row {row_num}: Attendance must be text')
            continue
        status = status_val.strip().upper()
        if status not in VALID_STATUSES:
            result.errors.append(f'row {row_num}: invalid status {status_val!r}')
            continue

        ref_raw = ref_cell.value
        try:
            ref = int(ref_raw)
        except (TypeError, ValueError):
            result.errors.append(f'row {row_num}: Student Ref must be an integer (got {ref_raw!r})')
            continue
        if ref not in valid_refs:
            result.errors.append(f'row {row_num}: student_ref {ref} not enrolled in this session')
            continue

        result.rows.append(ParseRow(student_ref=ref, status=status))

    # Translate student_refs back to registration IDs via a helper attached to result.
    result._ref_to_registration_id = ref_to_reg_id  # type: ignore[attr-defined]
    return result
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_attendance_xlsx_parser -v 2
```

Expected: 6 tests OK.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/attendance_xlsx_parser.py \
        backend/django_Admin3/tutorials/tests/test_attendance_xlsx_parser.py
git commit -m "feat(tutorials): xlsx parser for instructor attendance upload

Defensive parser: read-only + data_only mode, rejects formula
cells and foreign student_refs, skips blank Attendance cells.
Returns per-row errors as soft warnings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Public upload endpoint

**Files:**
- Modify: `backend/django_Admin3/tutorials/public_views.py`
- Modify: `backend/django_Admin3/tutorials/public_urls.py`
- Test: extend `backend/django_Admin3/tutorials/tests/test_public_attendance_views.py`

- [ ] **Step 1: Write the failing test (append to existing test file)**

Append to `backend/django_Admin3/tutorials/tests/test_public_attendance_views.py`:

```python
from io import BytesIO
from openpyxl import Workbook


class PublicAttendanceUploadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = TutorialEvents.objects.create(code='UT-UPL-1')
        cls.session = TutorialSessions.objects.create(
            tutorial_event=cls.event, title='Up Session',
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=1),
        )
        u = User.objects.create_user(username='upins', email='upins@example.com', first_name='Up', last_name='In')
        cls.staff = Staff.objects.create(user=u)
        cls.instructor = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session.instructors.add(cls.instructor)
        su = User.objects.create_user(username='upstu', first_name='Up', last_name='Stu')
        cls.student = Student.objects.create(user=su)
        cls.reg = TutorialRegistration.objects.create(student=cls.student, tutorial_session=cls.session)

    def setUp(self):
        self.client = APIClient()
        signer = AttendanceLinkSigner()
        self.token, _ = signer.sign(self.session.id, self.instructor.id)

    def _xlsx(self, rows):
        wb = Workbook()
        ws = wb.active
        ws.append(['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'])
        for r in rows:
            ws.append(list(r))
        buf = BytesIO()
        wb.save(buf); buf.seek(0)
        return buf

    def _url(self):
        return f'/api/tutorials/public/attendance/{self.token}/upload-xlsx/'

    def test_successful_upload_creates_attendance(self):
        xlsx = self._xlsx([('', 'Up', 'Stu', self.student.student_ref, '', '', 'ATTENDED')])
        resp = self.client.post(self._url(), data={'file': xlsx}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(TutorialAttendance.objects.get(registration=self.reg).status, 'ATTENDED')

    def test_oversized_returns_413(self):
        big = BytesIO(b'\x00' * (3 * 1024 * 1024))  # 3 MB of nulls; not a real xlsx
        resp = self.client.post(self._url(), data={'file': big}, format='multipart')
        self.assertEqual(resp.status_code, 413)

    def test_wrong_mime_returns_415(self):
        resp = self.client.post(self._url(), data={'file': BytesIO(b'hello')}, format='multipart')
        # Either 415 (mime guess) or 400 if magic bytes mismatch — accept both.
        self.assertIn(resp.status_code, (400, 415))
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_public_attendance_views.PublicAttendanceUploadTests -v 2
```

Expected: 404 on the upload URL.

- [ ] **Step 3: Add the upload view to `public_views.py`**

Append to `backend/django_Admin3/tutorials/public_views.py`:

```python
from rest_framework.parsers import MultiPartParser

MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB
XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


class PublicAttendanceUploadView(_TokenAuthMixin, APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request, token: str):
        result = self._verify(token, request)
        if isinstance(result, Response):
            self._reject_audit(request, 'verify_failed')
            return result
        payload = result
        session = get_object_or_404(TutorialSessions, id=payload.session_id)
        instructor = get_object_or_404(TutorialInstructor, id=payload.instructor_id)

        f = request.FILES.get('file')
        if f is None:
            return Response({'detail': 'file is required'}, status=400)
        if f.size and f.size > MAX_UPLOAD_BYTES:
            _log_access(
                session_id=session.id, instructor_id=instructor.id,
                action='reject', request=request,
                detail={'reason': 'too_large', 'size': f.size},
            )
            return Response({'code': 'too_large'}, status=413)
        # Crude magic-byte check (xlsx is a zip; starts with PK\x03\x04).
        head = f.read(4); f.seek(0)
        if head[:2] != b'PK':
            _log_access(
                session_id=session.id, instructor_id=instructor.id,
                action='reject', request=request,
                detail={'reason': 'wrong_mime'},
            )
            return Response({'code': 'wrong_mime'}, status=415)

        from tutorials.services.attendance_xlsx_parser import parse_attendance_xlsx
        parsed = parse_attendance_xlsx(f, session)

        items = [
            {
                'registration_id': parsed._ref_to_registration_id[row.student_ref],  # noqa: SLF001
                'status': row.status,
                'reason': row.reason or '',
            }
            for row in parsed.rows
        ]
        recorded_by = instructor.staff.user if (instructor.staff_id and instructor.staff.user_id) else None
        try:
            from tutorials.services.attendance_save_service import save_attendance_items
            save_attendance_items(session=session, recorded_by=recorded_by, items=items)
        except Exception as exc:  # log + surface; defensive
            _log_access(
                session_id=session.id, instructor_id=instructor.id,
                action='reject', request=request,
                detail={'reason': 'save_failed', 'message': str(exc)},
            )
            raise

        _log_access(
            session_id=session.id, instructor_id=instructor.id,
            action='upload', request=request,
            detail={
                'rows_applied': len(items),
                'skipped_blank': parsed.skipped_blank,
                'error_count': len(parsed.errors),
            },
        )

        # Build refreshed payload + summary.
        view = PublicAttendanceView()
        body = view._build_payload(session, instructor)  # noqa: SLF001
        body['upload_summary'] = {
            'rows_applied': len(items),
            'skipped_blank': parsed.skipped_blank,
            'errors': parsed.errors,
        }
        return Response(body)
```

- [ ] **Step 4: Wire the upload URL**

In `backend/django_Admin3/tutorials/public_urls.py`:

```python
from django.urls import path

from .public_views import PublicAttendanceView, PublicAttendanceUploadView

urlpatterns = [
    path('attendance/<str:token>/', PublicAttendanceView.as_view(), name='public-attendance'),
    path('attendance/<str:token>/upload-xlsx/', PublicAttendanceUploadView.as_view(), name='public-attendance-upload'),
]
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
python manage.py test tutorials.tests.test_public_attendance_views.PublicAttendanceUploadTests -v 2
```

Expected: 3 tests OK.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/public_views.py \
        backend/django_Admin3/tutorials/public_urls.py \
        backend/django_Admin3/tutorials/tests/test_public_attendance_views.py
git commit -m "feat(tutorials): public attendance xlsx upload endpoint

POST /api/tutorials/public/attendance/<token>/upload-xlsx/.
2 MB size cap, magic-byte mime check, parser rejects formula
cells and foreign student_refs. Returns refreshed roster plus
upload_summary {rows_applied, skipped_blank, errors}.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: XlsxUploadButton frontend component

**Files:**
- Create: `frontend/react-Admin3/src/components/instructor/attendance/XlsxUploadButton.tsx`
- Test: `frontend/react-Admin3/src/components/instructor/attendance/__tests__/XlsxUploadButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`frontend/react-Admin3/src/components/instructor/attendance/__tests__/XlsxUploadButton.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import XlsxUploadButton from '../XlsxUploadButton';

describe('XlsxUploadButton', () => {
  it('calls onUpload with the selected file', () => {
    const onUpload = jest.fn().mockResolvedValue(undefined);
    render(<XlsxUploadButton onUpload={onUpload} />);
    const input = screen.getByTestId('xlsx-upload-input') as HTMLInputElement;
    const file = new File(['x'], 'r.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=XlsxUploadButton --watchAll=false
```

Expected: module-not-found.

- [ ] **Step 3: Write the component**

`frontend/react-Admin3/src/components/instructor/attendance/XlsxUploadButton.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Button } from '../../admin/ui/button';

interface Props {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function XlsxUploadButton({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      await onUpload(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="tw:inline-flex">
      <input
        ref={inputRef}
        data-testid="xlsx-upload-input"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="tw:hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading…' : 'Upload xlsx'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- --testPathPattern=XlsxUploadButton --watchAll=false
```

Expected: 1 test OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/instructor/attendance/XlsxUploadButton.tsx \
        frontend/react-Admin3/src/components/instructor/attendance/__tests__/XlsxUploadButton.test.tsx
git commit -m "feat(instructor): XlsxUploadButton component

Hidden file input + visible Button; calls onUpload(file) and
resets the input after each upload so the same file can be
re-selected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Wire upload into AttendanceRosterPanel + InstructorAttendancePage

**Files:**
- Modify: `frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx`
- Modify: `frontend/react-Admin3/src/services/instructor/instructorAttendanceService.ts`
- Modify: `frontend/react-Admin3/src/components/instructor/attendance/InstructorAttendancePage.tsx`

- [ ] **Step 1: Replace the panel's placeholder upload button**

In `frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx`, replace the upload block:

```tsx
import XlsxUploadButton from '../../instructor/attendance/XlsxUploadButton';

// ...inside the component:
{onUploadXlsx && (
  <div className="tw:flex tw:justify-end tw:mb-2">
    <XlsxUploadButton onUpload={onUploadXlsx} disabled={disabled || vm.isSaving} />
  </div>
)}
```

(The original placeholder `<button>` is removed.)

- [ ] **Step 2: Add `uploadXlsx` to the instructor service**

In `frontend/react-Admin3/src/services/instructor/instructorAttendanceService.ts`, extend the returned object:

```ts
import httpService from '../httpService';
import type {
  AttendancePayload, AttendanceSaveItem, AttendanceService,
} from '../../components/shared/attendance/types';

function urlFor(token: string): string {
  return `/api/tutorials/public/attendance/${encodeURIComponent(token)}/`;
}

export interface InstructorAttendanceService extends AttendanceService {
  uploadXlsx(file: File): Promise<AttendancePayload & { upload_summary?: { rows_applied: number; skipped_blank: number; errors: string[] } }>;
}

export function makeInstructorAttendanceService(token: string): InstructorAttendanceService {
  return {
    get: () => httpService.get(urlFor(token)).then(r => r.data as AttendancePayload),
    save: (items: AttendanceSaveItem[]) =>
      httpService.post(urlFor(token), { items }).then(r => r.data as AttendancePayload),
    uploadXlsx: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return httpService.post(`${urlFor(token)}upload-xlsx/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
  };
}
```

- [ ] **Step 3: Wire the upload handler in the instructor page**

In `frontend/react-Admin3/src/components/instructor/attendance/InstructorAttendancePage.tsx`, change the `<AttendanceRosterPanel vm={vm} />` line to pass `onUploadXlsx`:

```tsx
<AttendanceRosterPanel
  vm={vm}
  onUploadXlsx={async (file) => {
    const refreshed = await (service as any).uploadXlsx(file);
    vm.replaceFromServer(refreshed);
    const summary = refreshed.upload_summary;
    if (summary) {
      const errMsg = summary.errors?.length
        ? ` (${summary.errors.length} row error${summary.errors.length === 1 ? '' : 's'})`
        : '';
      toast.success(`Uploaded — ${summary.rows_applied} rows applied${errMsg}`);
    } else {
      toast.success('Uploaded');
    }
  }}
/>
```

- [ ] **Step 4: Run all attendance frontend tests**

```bash
npm test -- --testPathPattern="(shared/attendance|instructor/attendance)" --watchAll=false
```

Expected: all tests pass.

- [ ] **Step 5: Manual smoke test (no automated step)**

In dev:
1. Run the cron with `--for-date=<tomorrow>` to receive a real xlsx.
2. Open the magic link in the browser.
3. Click "Upload xlsx", choose the file you just downloaded.
4. Verify the toast shows `Uploaded — N rows applied`.
5. Verify the roster updates inline.
6. Reload the page and confirm the statuses persist.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/shared/attendance/AttendanceRosterPanel.tsx \
        frontend/react-Admin3/src/services/instructor/instructorAttendanceService.ts \
        frontend/react-Admin3/src/components/instructor/attendance/InstructorAttendancePage.tsx
git commit -m "feat(instructor): wire xlsx upload into attendance page

Replaces the placeholder upload button in AttendanceRosterPanel
with the real XlsxUploadButton. Instructor service gains an
uploadXlsx(file) method that POSTs multipart to the public
upload endpoint. Page shows toast with rows_applied count.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

**Phase 3 complete.** Feature is fully implemented end-to-end.

---

# Final Verification

After Task 19, run the full backend and frontend test suites:

```bash
# Backend
cd backend/django_Admin3
python manage.py test tutorials -v 2

# Frontend
cd ../../frontend/react-Admin3
npm test -- --watchAll=false
```

Both must be green before opening the PR.

