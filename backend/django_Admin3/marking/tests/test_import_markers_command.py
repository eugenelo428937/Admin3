import os
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.test import TestCase

from marking.models import Marker
from students.models import Student


def _seed_student(username: str, student_ref: int) -> Student:
    user = User.objects.create_user(username=username)
    return Student.objects.create(student_ref=student_ref, user=user)


class ImportMarkersCommandTests(TestCase):
    def setUp(self):
        self.student_alice = _seed_student('alice', student_ref=38)
        self.student_bob = _seed_student('bob', student_ref=62)

    def _write_csv(self, content):
        f = tempfile.NamedTemporaryFile(
            mode='w', suffix='.csv', delete=False, newline='',
        )
        f.write(content)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_imports_valid_rows(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '38,Alice,Allen,AA\n'
            '62,Bob,Brown,BB\n'
        )
        out = StringIO()
        call_command('import_markers', '--csv-path', path, stdout=out)
        self.assertEqual(Marker.objects.count(), 2)
        self.assertEqual(
            Marker.objects.get(legacy_id=38).user_id,
            self.student_alice.user_id,
        )

    def test_aborts_when_marker_table_non_empty(self):
        Marker.objects.create(user=self.student_alice.user, initial='AA', legacy_id=1)
        path = self._write_csv('mkref,firstname,lastname,initials\n38,Bob,Brown,BB\n')
        with self.assertRaises(CommandError) as ctx:
            call_command('import_markers', '--csv-path', path, stderr=StringIO())
        self.assertIn('not empty', str(ctx.exception).lower())

    def test_writes_error_report_and_does_not_import(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '99999,Nobody,Here,XX\n'
        )
        errors_path = path + '.errors.csv'
        with self.assertRaises(CommandError):
            call_command(
                'import_markers',
                '--csv-path', path,
                '--errors-path', errors_path,
                stderr=StringIO(),
            )
        self.assertEqual(Marker.objects.count(), 0)
        with open(errors_path) as f:
            text = f.read()
        self.assertIn('No Student with student_ref=99999', text)
        os.unlink(errors_path)

    def test_dry_run_does_not_import(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '38,Alice,Allen,AA\n'
        )
        out = StringIO()
        call_command('import_markers', '--csv-path', path, '--dry-run', stdout=out)
        self.assertEqual(Marker.objects.count(), 0)
