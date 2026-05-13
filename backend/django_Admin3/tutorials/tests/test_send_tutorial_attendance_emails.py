"""End-to-end tests for the daily attendance email cron command."""
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from staff.models import Staff
from tutorials.models import (
    TutorialAttendanceEmailLog, TutorialEvents, TutorialInstructor,
    TutorialSessions,
)
from tutorials.tests.factories import make_event, make_session, make_instructor, make_store_product


class SendTutorialAttendanceEmailsTests(TestCase):
    """
    Tests for ``send_tutorial_attendance_emails`` management command.

    Adaptations from spec:
    - ``make_event`` does not accept ``cancelled=`` kwarg; we set it manually
      after creation.
    - ``make_session`` does not accept ``start_date=`` kwarg; we override
      ``start_date`` on the returned instance and call ``.save()``.
    - The mock target uses ``email_queue_service.queue_email`` (the singleton
      instance method) rather than a bare module-level ``queue_email`` function,
      because no such function exists in ``queue_service.py``.
    - ``make_store_product`` uses a deterministic product code that clashes across
      test classes; we pass unique ``variation_code`` / ``cat_product_code`` values
      to avoid the ``purchasables_code_key`` unique constraint violation.
    """

    _MOCK_TARGET = (
        'tutorials.management.commands.send_tutorial_attendance_emails'
        '.queue_service.email_queue_service.queue_email'
    )

    @classmethod
    def setUpTestData(cls):
        cls.tomorrow = timezone.localdate() + timedelta(days=1)
        cls.day_after = timezone.localdate() + timedelta(days=2)

        # Use a unique variation_code to avoid product-code clashes with other tests.
        sp_ok = make_store_product(variation_code='CMDOK', cat_product_code='CmdLive')
        sp_cx = make_store_product(variation_code='CMDCX', cat_product_code='CmdCxLive')

        # Session starting tomorrow — event NOT cancelled.
        cls.event_ok = make_event(code='UT-CMD-1', store_product=sp_ok)
        cls.session_tomorrow = make_session(event=cls.event_ok, title='Session Tomorrow')
        # Override start_date to tomorrow (factory sets it to now()).
        cls.session_tomorrow.start_date = timezone.make_aware(
            timezone.datetime.combine(cls.tomorrow, timezone.datetime.min.time())
        )
        cls.session_tomorrow.save(update_fields=['start_date'])

        # Session day-after — used by --session-id override test.
        cls.session_day_after = make_session(
            event=cls.event_ok, title='Session Day-After', sequence=2,
        )
        cls.session_day_after.start_date = timezone.make_aware(
            timezone.datetime.combine(cls.day_after, timezone.datetime.min.time())
        )
        cls.session_day_after.save(update_fields=['start_date'])

        # Cancelled event — must be skipped even if start is tomorrow.
        cls.event_cx = make_event(code='UT-CMD-2', store_product=sp_cx)
        cls.event_cx.cancelled = True
        cls.event_cx.save(update_fields=['cancelled'])
        cls.session_cancelled = make_session(
            event=cls.event_cx, title='Cancelled Session',
        )
        cls.session_cancelled.start_date = cls.session_tomorrow.start_date
        cls.session_cancelled.save(update_fields=['start_date'])

        # Instructor with a valid email (via Staff → User).
        u = User.objects.create_user(
            username='tutor1', email='tutor1@example.com',
            first_name='Tina', last_name='Tutor',
        )
        cls.staff = Staff.objects.create(user=u)
        cls.instructor_ok = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session_tomorrow.instructors.add(cls.instructor_ok)
        cls.session_day_after.instructors.add(cls.instructor_ok)
        cls.session_cancelled.instructors.add(cls.instructor_ok)

        # Instructor with no staff/email — must be skipped with a warning.
        cls.instructor_noemail = TutorialInstructor.objects.create()  # no staff FK
        cls.session_tomorrow.instructors.add(cls.instructor_noemail)

    def _run(self, **opts):
        out = StringIO()
        call_command('send_tutorial_attendance_emails', stdout=out, stderr=out, **opts)
        return out.getvalue()

    @mock.patch(_MOCK_TARGET)
    def test_picks_up_only_tomorrows_sessions(self, mock_queue):
        mock_queue.return_value = None  # email_queue FK is nullable; None is valid in tests
        self._run(for_date=self.tomorrow.isoformat())
        # Only the OK session+instructor pair gets an email;
        # cancelled event and no-email instructor are skipped.
        self.assertEqual(mock_queue.call_count, 1)
        log = TutorialAttendanceEmailLog.objects.get()
        self.assertEqual(log.session_id, self.session_tomorrow.id)
        self.assertEqual(log.instructor_id, self.instructor_ok.id)

    @mock.patch(_MOCK_TARGET)
    def test_idempotent_on_rerun(self, mock_queue):
        mock_queue.return_value = None  # email_queue FK is nullable; None is valid in tests
        self._run(for_date=self.tomorrow.isoformat())
        self.assertEqual(mock_queue.call_count, 1)
        self._run(for_date=self.tomorrow.isoformat())
        # Second run must not call queue_email again.
        self.assertEqual(mock_queue.call_count, 1)
        self.assertEqual(TutorialAttendanceEmailLog.objects.count(), 1)

    @mock.patch(_MOCK_TARGET)
    def test_dry_run_does_not_write(self, mock_queue):
        mock_queue.return_value = None  # email_queue FK is nullable; None is valid in tests
        self._run(for_date=self.tomorrow.isoformat(), dry_run=True)
        mock_queue.assert_not_called()
        self.assertEqual(TutorialAttendanceEmailLog.objects.count(), 0)

    @mock.patch(_MOCK_TARGET)
    def test_session_id_override(self, mock_queue):
        mock_queue.return_value = None  # email_queue FK is nullable; None is valid in tests
        # Force-run against the day-after session even though it's not "tomorrow".
        self._run(session_id=self.session_day_after.id)
        self.assertEqual(mock_queue.call_count, 1)

    @mock.patch(_MOCK_TARGET)
    def test_skips_instructor_with_no_email(self, mock_queue):
        mock_queue.return_value = None  # email_queue FK is nullable; None is valid in tests
        output = self._run(for_date=self.tomorrow.isoformat())
        # The no-email instructor should be logged and skipped — only 1 email.
        self.assertEqual(mock_queue.call_count, 1)
        self.assertIn('instructor has no email', output.lower())

    @mock.patch(_MOCK_TARGET)
    @override_settings(
        SERVER_NAME='attendance.example.com',
        STOREFRONT_PORT='3000',
        SERVER_SCHEME='http',
    )
    def test_magic_link_uses_server_name_and_storefront_port(self, mock_queue):
        """The magic link host must come from ``settings.SERVER_NAME``, not
        a hardcoded ``localhost``. Port comes from ``STOREFRONT_PORT``;
        scheme from ``SERVER_SCHEME`` (defaults to http).
        """
        mock_queue.return_value = None
        self._run(for_date=self.tomorrow.isoformat())

        self.assertEqual(mock_queue.call_count, 1)
        _, kwargs = mock_queue.call_args
        link = kwargs['context']['magic_link']
        self.assertTrue(
            link.startswith('http://attendance.example.com:3000/'),
            f'expected scheme://server_name:port prefix, got {link!r}',
        )
        # Path segment must still embed the signed token.
        self.assertIn('/instructor/attendance/', link)
        # And must NOT contain the historical localhost hardcode.
        self.assertNotIn('localhost', link)

    @mock.patch(_MOCK_TARGET)
    @override_settings(
        SERVER_NAME='attendance.example.com',
        STOREFRONT_PORT='',  # production — no port (80/443 implied)
        SERVER_SCHEME='https',
    )
    def test_magic_link_no_port_when_storefront_port_empty(self, mock_queue):
        """Production-shape config: empty STOREFRONT_PORT → no ``:port`` in URL.
        Lets ops point at ``https://host/...`` without juggling default-port
        formatting.
        """
        mock_queue.return_value = None
        self._run(for_date=self.tomorrow.isoformat())
        link = mock_queue.call_args.kwargs['context']['magic_link']
        self.assertTrue(
            link.startswith('https://attendance.example.com/instructor/'),
            f'expected scheme://host/path with no port, got {link!r}',
        )

    @mock.patch(_MOCK_TARGET)
    def test_passes_xlsx_as_attachment_not_context_blob(self, mock_queue):
        """The cron must use the new ``attachments=`` kwarg with raw xlsx
        bytes, and MUST NOT smuggle the bytes through ``email_context`` as
        ``xlsx_b64`` (the v1 stub workaround).
        """
        mock_queue.return_value = None
        self._run(for_date=self.tomorrow.isoformat())

        self.assertEqual(mock_queue.call_count, 1)
        _, kwargs = mock_queue.call_args
        attachments = kwargs.get('attachments') or []
        self.assertEqual(len(attachments), 1, attachments)
        att = attachments[0]
        # xlsx filename should embed the event code + tomorrow's date.
        self.assertTrue(att['filename'].startswith('attendance_'))
        self.assertTrue(att['filename'].endswith('.xlsx'))
        self.assertIn(self.tomorrow.isoformat(), att['filename'])
        # Real xlsx bytes start with the ZIP magic PK\x03\x04.
        self.assertIsInstance(att['content'], (bytes, bytearray))
        self.assertTrue(bytes(att['content']).startswith(b'PK\x03\x04'))
        self.assertEqual(
            att['mime_type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        # Defence-in-depth: the legacy base64 keys must NOT leak into context.
        context = kwargs.get('context') or {}
        self.assertNotIn('xlsx_b64', context)
        self.assertNotIn('xlsx_filename', context)
