# Tutorial Attendance Daily Email — Cron Setup

The `send_tutorial_attendance_emails` management command must run **once per day at 06:00 server-local time**. It picks up sessions starting tomorrow and emails each instructor a reminder with the xlsx roster attached and a signed magic link. It is idempotent (safe to re-run).

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

## Attachment delivery

The xlsx roster is attached to each outbound email via the
`EmailQueueAttachment` table (one row per queue item). The cron
persists raw xlsx bytes through
`EmailQueueService.queue_email(..., attachments=[...])`; the queue
processor merges them into the MIME attachment list when the email is
sent. Recipients receive both the magic link and the xlsx file.
