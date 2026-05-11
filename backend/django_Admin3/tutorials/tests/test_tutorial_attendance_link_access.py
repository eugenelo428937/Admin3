"""Schema tests for TutorialAttendanceLinkAccess audit table."""
from django.db import connection
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialAttendanceLinkAccess
from tutorials.tests.factories import make_event, make_session


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
        ev = make_event(code='UT-LOG-1')
        sess = make_session(event=ev, title='S')
        row = TutorialAttendanceLinkAccess.objects.create(
            session=sess, action='view', ip_address='192.0.2.1', user_agent='test',
            detail={'note': 'first open'},
        )
        self.assertIsNotNone(row.accessed_at)
        self.assertEqual(row.detail['note'], 'first open')
