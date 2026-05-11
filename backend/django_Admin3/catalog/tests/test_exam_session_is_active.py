"""Schema test: ExamSession has is_active boolean defaulting to False."""
from django.test import TestCase
from datetime import datetime, timezone as dt_timezone

from catalog.exam_session.models import ExamSession


class ExamSessionIsActiveTests(TestCase):
    def test_is_active_defaults_to_false(self):
        es = ExamSession.objects.create(
            session_code='2099-04-test',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
        )
        self.assertFalse(es.is_active)

    def test_is_active_can_be_set_true(self):
        es = ExamSession.objects.create(
            session_code='2099-04-test2',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
            is_active=True,
        )
        self.assertTrue(es.is_active)
