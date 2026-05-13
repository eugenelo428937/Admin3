"""Schema and constraint tests for TutorialAttendanceEmailLog."""
from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialAttendanceEmailLog
from tutorials.tests.factories import make_event, make_session, make_instructor


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
        ev = make_event(code='UT-EML-1')
        sess = make_session(event=ev, title='Session 1')
        instr = make_instructor()
        issued = timezone.now()
        TutorialAttendanceEmailLog.objects.create(
            session=sess, instructor=instr, token_issued_at=issued,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialAttendanceEmailLog.objects.create(
                    session=sess, instructor=instr, token_issued_at=issued,
                )
        self.assertEqual(
            TutorialAttendanceEmailLog.objects.filter(
                session=sess, instructor=instr,
            ).count(),
            1,
        )

    def test_distinct_pairs_allowed(self):
        ev = make_event(code='UT-EML-2')
        sess = make_session(event=ev, title='Session 1')
        instr_a = make_instructor()
        instr_b = make_instructor()
        now = timezone.now()
        TutorialAttendanceEmailLog.objects.create(
            session=sess, instructor=instr_a, token_issued_at=now,
        )
        TutorialAttendanceEmailLog.objects.create(
            session=sess, instructor=instr_b, token_issued_at=now,
        )
        self.assertEqual(
            TutorialAttendanceEmailLog.objects.filter(session=sess).count(),
            2,
        )
