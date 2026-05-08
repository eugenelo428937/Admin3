"""Tests for tutorials.services.registrations_importer.

This is the one-shot legacy bulk-import service. It refuses to run if
any TutorialRegistration row already exists (active or inactive).
"""
import io

from django.contrib.auth.models import User
from django.test import TestCase

from tutorials.models import TutorialRegistration
from tutorials.services.registrations_importer import import_registrations_csv
from tutorials.tests import factories


def _csv_with_one_row(session_title, student_refs):
    """Build a one-row CSV string matching the real header layout."""
    refs = ', '.join(str(r) for r in student_refs)
    return (
        '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
        '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
        '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
        f'"{session_title}","CM2",False,"2024A",0,'
        f'"{refs}","","",""\n'
    )


class PreflightTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_aborts_when_table_not_empty(self):
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        with self.assertRaises(RuntimeError) as ctx:
            import_registrations_csv(
                io.StringIO(csv), uploaded_by=self.user, filename='x.csv',
            )
        self.assertIn('non-empty', str(ctx.exception).lower())
