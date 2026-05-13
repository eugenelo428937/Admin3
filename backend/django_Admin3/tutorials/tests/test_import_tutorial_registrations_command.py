"""Smoke tests for the import_tutorial_registrations management command."""
import os
import tempfile

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from tutorials.models import (
    TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.tests import factories


def _write_csv(session_title, refs):
    refs_field = ', '.join(str(r) for r in refs)
    text = (
        '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
        '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
        '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
        f'"{session_title}","CM2",False,"2024A",0,'
        f'"{refs_field}","","",""\n'
    )
    fd, path = tempfile.mkstemp(suffix='.csv')
    with os.fdopen(fd, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return path


class ImportCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_command_imports_csv(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            call_command(
                'import_tutorial_registrations',
                f'--file={path}',
                f'--user={self.user.username}',
            )
        finally:
            os.remove(path)

        self.assertEqual(TutorialRegistration.objects.count(), 1)
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 1)

    def test_command_dry_run_persists_nothing(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            call_command(
                'import_tutorial_registrations',
                f'--file={path}',
                f'--user={self.user.username}',
                '--dry-run',
            )
        finally:
            os.remove(path)

        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 0)

    def test_command_errors_on_unknown_user(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            with self.assertRaises(CommandError):
                call_command(
                    'import_tutorial_registrations',
                    f'--file={path}',
                    '--user=does_not_exist',
                )
        finally:
            os.remove(path)

    def test_command_errors_when_table_not_empty(self):
        # Pre-existing registration → one-shot guard fires; service raises
        # RuntimeError, command translates it to CommandError.
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    'import_tutorial_registrations',
                    f'--file={path}',
                    f'--user={self.user.username}',
                )
            self.assertIn('non-empty', str(ctx.exception).lower())
        finally:
            os.remove(path)
