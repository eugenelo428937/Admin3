"""Tests for the import_tutorial_events_csv management command."""
import io
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from catalog.models import (
    Subject, ProductVariation, Product as CatProduct,
)
from tutorials.models import TutorialEvents


HEADER = (
    "Subject,product variations,Code,Title,Start Date,Start Time,End Date,End Time,"
    "Venue,Sold Out,Finalisation date,remain_space,Location,main instructor,Instructors,Sequence\n"
)


class ImportTutorialEventsCommandTests(TestCase):
    def setUp(self):
        Subject.objects.create(code='CB1', description='Business Finance', active=True)
        ProductVariation.objects.create(
            code='LO_6H', name='LO_6H', description='', description_short='LO_6H',
            variation_type='Tutorial',
        )
        CatProduct.objects.create(
            code='Live', fullname='Tutorial - Live Online', shortname='Live',
        )

    def _write_csv(self, body: str) -> Path:
        f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8')
        f.write(HEADER + body)
        f.close()
        return Path(f.name)

    def test_dry_run_default_no_writes(self):
        body = (
            'CB1,LO_6H,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            'CB1,LO_6H,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        path = self._write_csv(body)
        out = io.StringIO()
        call_command('import_tutorial_events_csv', str(path), stdout=out)
        self.assertEqual(TutorialEvents.objects.count(), 0)
        text = out.getvalue()
        self.assertIn('DRY RUN', text)
        self.assertIn('events_created=1', text)

    def test_commit_writes_events(self):
        body = (
            'CB1,LO_6H,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            'CB1,LO_6H,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        path = self._write_csv(body)
        out = io.StringIO()
        call_command('import_tutorial_events_csv', str(path), '--commit', stdout=out)
        self.assertEqual(TutorialEvents.objects.count(), 1)
        text = out.getvalue()
        self.assertIn('COMMITTED', text)
        self.assertIn('events_created=1', text)

    def test_missing_file_errors_cleanly(self):
        out = io.StringIO()
        err = io.StringIO()
        with self.assertRaises(Exception) as ctx:
            call_command('import_tutorial_events_csv', '/nonexistent/path.csv', stdout=out, stderr=err)
        self.assertIn('not exist', str(ctx.exception).lower())
