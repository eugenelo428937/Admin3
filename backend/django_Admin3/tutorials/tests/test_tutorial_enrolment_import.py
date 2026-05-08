"""Tests for TutorialEnrolmentImport (Task 1.5).

Audit record per CSV import batch — captures who uploaded what, when,
the resulting status, summary counts, and a full JSON report.
"""
from django.contrib.auth.models import User
from django.test import TestCase

from tutorials.models import TutorialEnrolmentImport


class TutorialEnrolmentImportTests(TestCase):
    def test_creates_with_pending_status(self):
        u = User.objects.create_user(username='staff_imp', email='s@t.com')
        imp = TutorialEnrolmentImport.objects.create(
            filename='enrolments.csv', uploaded_by=u,
        )
        self.assertEqual(imp.status, 'PENDING')
        self.assertEqual(imp.report, {})
        self.assertEqual(imp.total_rows, 0)
        self.assertEqual(imp.created_count, 0)
        self.assertEqual(imp.reactivated_count, 0)
        self.assertEqual(imp.deactivated_count, 0)
        self.assertEqual(imp.unmatched_count, 0)
        self.assertIsNone(imp.committed_at)
