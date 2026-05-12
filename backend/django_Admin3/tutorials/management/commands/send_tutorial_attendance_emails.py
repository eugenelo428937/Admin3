"""``python manage.py send_tutorial_attendance_emails``.

Daily cron job: for each TutorialSession starting tomorrow, queue an
attendance reminder email to each instructor with the generated xlsx
attached and a signed magic link. Idempotent via
``TutorialAttendanceEmailLog`` (one row per (session, instructor) pair).

Run at 06:00 server-local time via cron / Task Scheduler.

Attachment delivery
-------------------
The xlsx is attached via the email system's per-queue dynamic attachment
API (``EmailQueueService.queue_email(..., attachments=[...])``), which
persists each attachment as an ``EmailQueueAttachment`` row and merges it
into ``_send_single_email``'s attachment list at delivery time. Previous
versions of this command base64-encoded the xlsx bytes into
``email_context['xlsx_b64']`` as a workaround; that workaround is gone.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.utils import timezone

from email_system.services import queue_service
from tutorials.models import TutorialAttendanceEmailLog, TutorialSessions
from tutorials.services.attendance_link import AttendanceLinkSigner
from tutorials.services.attendance_roster_xlsx import generate_roster_xlsx


class Command(BaseCommand):
    help = "Send daily tutorial attendance reminder emails for tomorrow's sessions."

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
                        f'skip: instructor has no email '
                        f'(session={session.id}, instructor={instructor.id})'
                    )
                    skipped += 1
                    continue
                if TutorialAttendanceEmailLog.objects.filter(
                    session=session, instructor=instructor,
                ).exists():
                    self.stdout.write(
                        f'skip: already sent '
                        f'(session={session.id}, instructor={instructor.id})'
                    )
                    continue
                if opts['dry_run']:
                    self.stdout.write(
                        f'DRY-RUN would send: session={session.id} '
                        f'instructor={instructor.id} '
                        f'to={instructor.staff.user.email}'
                    )
                    continue
                try:
                    self._send_one(session, instructor, signer)
                    sent += 1
                except IntegrityError:
                    # Lost a race with a concurrent invocation; treat as skipped.
                    self.stdout.write(
                        f'skip: lost race '
                        f'(session={session.id}, instructor={instructor.id})'
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

    def _select_sessions(self, target_date: date, session_id):
        qs = (
            TutorialSessions.objects
            .filter(tutorial_event__cancelled=False)
            .select_related('tutorial_event', 'venue')
            .prefetch_related('instructors__staff__user')
        )
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
        xlsx_filename = self._attachment_filename(session)
        magic_link = self._build_magic_link(token)

        with transaction.atomic():
            queue_row = queue_service.email_queue_service.queue_email(
                template_name='tutorial_attendance_reminder',
                to_emails=[instructor.staff.user.email],
                context={
                    'instructor_name': (
                        instructor.staff.user.get_full_name()
                        or instructor.staff.user.username
                    ),
                    'session_title': session.title,
                    'session_date': session.start_date,
                    'venue': session.venue.name if session.venue_id else '',
                    'magic_link': magic_link,
                },
                attachments=[{
                    'filename': xlsx_filename,
                    'content': xlsx_bytes,
                    'mime_type': (
                        'application/vnd.openxmlformats-officedocument'
                        '.spreadsheetml.sheet'
                    ),
                }],
            )
            TutorialAttendanceEmailLog.objects.create(
                session=session,
                instructor=instructor,
                email_queue=queue_row,
                token_issued_at=issued_at,
            )

    def _attachment_filename(self, session) -> str:
        if hasattr(session.start_date, 'date'):
            date_str = session.start_date.date().isoformat()
        else:
            date_str = str(session.start_date)
        event_code = (
            session.tutorial_event.code
            if session.tutorial_event_id else 'session'
        )
        return f'attendance_{event_code}_{date_str}.xlsx'

    def _build_magic_link(self, token: str) -> str:
        """Compose the public attendance URL from environment-driven settings.

        Host comes from ``SERVER_NAME`` (env var ``SERVER_NAME``); scheme
        from ``SERVER_SCHEME`` (defaults to ``http``); port from
        ``STOREFRONT_PORT`` (omitted when empty, e.g. prod on 80/443).
        Keeping the URL construction in one place means swapping hostname
        for staging/prod is an env-var change, not a code edit.
        """
        host = getattr(settings, 'SERVER_NAME', 'localhost') or 'localhost'
        scheme = getattr(settings, 'SERVER_SCHEME', 'http') or 'http'
        port = (getattr(settings, 'STOREFRONT_PORT', '') or '').strip()
        host_port = f'{host}:{port}' if port else host
        return f'{scheme}://{host_port}/instructor/attendance/{token}'
