# Attendance Sync to Administrate — Cron Setup

The `sync_attendance_to_administrate` management command pushes locally
recorded tutorial attendance to Administrate via the `recordAttendances`
GraphQL mutation. It drains the `acted.attendance_sync_jobs` queue,
which is populated automatically every time an instructor or admin
saves attendance.

## When to run

**Every 5 minutes** during business hours is the recommended cadence
(the queue grows as instructors record attendance; a 5-minute lag is
acceptable for downstream reporting). The command is idempotent —
already-sent rows are skipped, so over-frequent runs are harmless.

## Linux (crontab)

```cron
# Drain the attendance sync queue every 5 minutes
*/5 * * * *  cd /srv/admin3/backend/django_Admin3 && /srv/admin3/.venv/bin/python manage.py sync_attendance_to_administrate >> /var/log/admin3/attendance-sync.log 2>&1
```

## Windows (Task Scheduler)

Create a Basic Task triggered every 5 minutes with:

| Field | Value |
|---|---|
| Program | `C:\Code\Admin3\.venv\Scripts\python.exe` |
| Arguments | `manage.py sync_attendance_to_administrate` |
| Start in | `C:\Code\Admin3\backend\django_Admin3` |

## Flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Logs which rows would be processed; does not call Administrate. |
| `--limit N` | Caps the number of rows drained per run (default 50). |

## What gets queued

Every successful `save_attendance_items` call writes **one**
`AttendanceSyncJob` row inside the same DB transaction as the
`TutorialAttendance` upserts. The payload is a list of
`{registration_id, student_ref, status}` dicts (one entry per saved
attendance row). Empty save batches do not enqueue.

## Retry policy

Failures stay in the queue and retry with exponential backoff:

| Attempt | Delay before next try |
|---------|----------------------|
| 1 (initial) | — |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 60 minutes |
| 5 | 6 hours |
| ≥ 6 | 24 hours |

After `max_attempts` (default 5) the row transitions to terminal
`failed` and is **not** auto-retried. Inspect it via Django admin:

- **Admin path:** `Tutorials → Attendance Sync Jobs`
- **Filter:** `status = failed`
- **What to look at:** the `administrate_response` JSON field captures
  the most recent raw GraphQL response, and `error_message` carries a
  human-readable summary.

To manually retry a failed row after fixing the cause:

```python
# python manage.py shell
from tutorials.models import AttendanceSyncJob
j = AttendanceSyncJob.objects.get(id=...)
j.attempts = 0
j.status = 'pending'
j.error_message = ''
j.save()
```

## Status mapping

Local TutorialAttendance has 4 states; Administrate's `attended` is a
boolean. The mapping is:

| Local | Administrate `attended` |
|-------|------------------------|
| `ATTENDED` | `true` |
| `LATE` | `true` (showed up, just late) |
| `ABSENT` | `false` |
| `OTHER` | `false` (the `reason` field is captured locally only) |

If you need to change this mapping, edit `STATUS_TO_ATTENDED` in
`administrate/services/attendance_sync_service.py` and update the
sync-service tests.

## Administrate session ID resolution

The sync service needs the Administrate session id to call
`recordAttendances`. It looks up that id via:

1. **Cache:** `adm.Session.external_id` (where `event.tutorial_event ==`
   our tutorial event AND `day_number == tutorial_sessions.sequence`).
2. **Fallback:** `getCurrentEventsBySittingAndLifecycle` GraphQL query
   filtered by event title. On a successful title-match within the
   response, the discovered id is written back to
   `adm.Session.external_id` (write-through cache) so future syncs skip
   the query entirely.

Learner matching uses `students.student_ref` ↔
`contact.personalName.middleName` per the project convention.

## Verification

```bash
# Show what's queued right now
python manage.py shell -c "
from tutorials.models import AttendanceSyncJob
from django.db.models import Count
for r in AttendanceSyncJob.objects.values('status').annotate(n=Count('id')):
    print(r['status'], r['n'])
"
```

Healthy state: `sent` count grows; `pending` / `retry` drain quickly;
`failed` count is zero or small + actively investigated.

## Manual one-shot for debugging

```powershell
# See what would run without touching Administrate
python manage.py sync_attendance_to_administrate --dry-run

# Drain just 5 rows in this run (useful when investigating a stuck batch)
python manage.py sync_attendance_to_administrate --limit 5
```
