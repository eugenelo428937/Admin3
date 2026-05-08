"""Tests for tutorials.services.registrations_importer.

This is the one-shot legacy bulk-import service. It refuses to run if
any TutorialRegistration row already exists (active or inactive).
"""
import io

from django.contrib.auth.models import User
from django.test import TestCase

from tutorials.models import (
    TutorialChoice, TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.services.registrations_importer import import_registrations_csv
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


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


class HappyPathTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_creates_registration_with_matched_choice(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.total_csv_rows, 1)
        self.assertEqual(result.created, 1)
        self.assertEqual(result.linked_to_choice, 1)
        self.assertEqual(result.unlinked, 0)
        self.assertEqual(result.warnings, [])
        self.assertEqual(result.multi_match_warnings, 0)
        self.assertEqual(result.skipped_cancelled, 0)
        self.assertEqual(result.skipped_unknown_session, 0)
        self.assertEqual(result.skipped_unknown_student, 0)

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertEqual(reg.tutorial_choice, choice)
        self.assertEqual(reg.import_batch_id, result.batch_id)

        batch = TutorialEnrolmentImport.objects.get(pk=result.batch_id)
        self.assertEqual(batch.status, TutorialEnrolmentImport.STATUS_COMMITTED)
        self.assertEqual(batch.filename, 'legacy.csv')
        self.assertEqual(batch.total_rows, 1)
        self.assertEqual(batch.created_count, 1)
        self.assertIsNotNone(batch.committed_at)
        self.assertEqual(batch.unmatched_count, 0)
        self.assertEqual(batch.report['warnings'], [])


class NullChoiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_creates_registration_with_null_choice_when_no_match(self):
        # No TutorialChoice exists for this student/event.
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.created, 1)
        self.assertEqual(result.unlinked, 1)
        self.assertEqual(result.linked_to_choice, 0)
        self.assertEqual(result.multi_match_warnings, 0)
        self.assertEqual(result.warnings, [])

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertIsNone(reg.tutorial_choice)

    def test_creates_registration_with_null_choice_on_multi_match_and_warns(self):
        oi1 = _make_order_item(self.student, self.sp)
        oi2 = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi1, student=self.student,
            tutorial_event=self.event, choice_rank=2,
        )
        TutorialChoice.objects.create(
            order_item=oi2, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.created, 1)
        self.assertEqual(result.unlinked, 1)
        self.assertEqual(result.multi_match_warnings, 1)
        self.assertEqual(len(result.warnings), 1)
        self.assertIn('multiple', result.warnings[0].lower())

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertIsNone(reg.tutorial_choice)

        batch = TutorialEnrolmentImport.objects.get(pk=result.batch_id)
        self.assertEqual(len(batch.report['warnings']), 1)


class SkipCategoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_skips_cancelled_csv_rows(self):
        # Build a CSV row with Is Cancelled=True directly (helper assumes False).
        csv = (
            '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
            '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
            '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
            f'"{self.session.title}","CM2",True,"2024A",0,'
            f'"{self.student.student_ref}","","",""\n'
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 0)
        self.assertEqual(result.skipped_cancelled, 1)
        self.assertEqual(TutorialRegistration.objects.count(), 0)

    def test_skips_unknown_students_and_records_unmatched(self):
        # Refs include one valid + one nonexistent.
        csv = _csv_with_one_row(
            self.session.title,
            [self.student.student_ref, 999999],
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 1)  # The valid ref imported.
        self.assertEqual(result.skipped_unknown_student, 1)

    def test_links_import_batch_on_every_created_row(self):
        s2 = factories.make_student()
        csv = _csv_with_one_row(
            self.session.title,
            [self.student.student_ref, s2.student_ref],
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 2)
        regs = TutorialRegistration.objects.filter(
            tutorial_session=self.session,
        )
        for reg in regs:
            self.assertEqual(reg.import_batch_id, result.batch_id)
