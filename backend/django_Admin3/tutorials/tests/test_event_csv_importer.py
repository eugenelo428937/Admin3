"""Tests for tutorials.services.event_csv_importer (the orchestrator).

The orchestrator:
- truncates tutorial_session_instructors / tutorial_sessions / tutorial_events
- iterates ParsedEvents (skipping cancelled per Decision 2026-05-01 Q1=B)
- calls the resolver per event; on resolution errors, records the event in
  the report and skips
- otherwise creates TutorialEvents + TutorialSessions + session-instructor M2M
- returns an ImportReport with per-event outcomes and aggregate counts
- supports dry_run=True (no DB writes — used by the management command)
"""
from datetime import date, datetime, time, timezone as tz
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    Subject, ProductVariation, Product as CatProduct,
)
from tutorials.models import (
    TutorialEvents, TutorialSessions, TutorialInstructor, TutorialLocation,
)
from tutorials.services.event_csv_parser import (
    ParsedEvent, ParsedSession, ParseResult,
)
from tutorials.services.event_csv_importer import (
    import_parsed_events, ImportReport,
)


def _make_session(seq=1, title=None, base='CB1-01-24A') -> ParsedSession:
    return ParsedSession(
        title=title or f'{base}-{seq}',
        sequence=seq,
        start_dt=datetime(2023, 11, 30, 9, 0),
        end_dt=datetime(2023, 11, 30, 12, 30),
        venue_name='Live Online',
        location_name='Live Online',
        is_soldout=True,
        instructor_names=['Lynn Birchall'],
        cancelled=False,
    )


def _make_event(title='CB1-01-24A', subject_code='CB1', cancelled=False, sessions=None) -> ParsedEvent:
    return ParsedEvent(
        code='CB1_LO_6',
        title=title,
        subject_code=subject_code,
        product_variation_code='LO_6H',
        sitting_short='24A',
        session_code='24',
        start_date=date(2023, 11, 30),
        end_date=date(2024, 2, 23),
        venue_name='Live Online',
        location_name='Live Online',
        is_soldout=True,
        finalisation_date=date(2023, 10, 30),
        remain_space=0,
        main_instructor_name='Lynn Birchall',
        instructor_names=['Lynn Birchall'],
        cancelled=cancelled,
        sessions=sessions or [_make_session(1, base=title), _make_session(2, base=title)],
    )


class OrchestratorTests(TestCase):
    """End-to-end tests for the orchestrator with the resolver hitting real DB."""

    def setUp(self):
        # Master catalog data so the resolver succeeds.
        Subject.objects.create(code='CB1', description='Business Finance', active=True)
        ProductVariation.objects.create(
            code='LO_6H', name='LO_6H', description='', description_short='LO_6H',
            variation_type='Tutorial',
        )
        CatProduct.objects.create(
            code='Live', fullname='Tutorial - Live Online', shortname='Live',
        )

    def test_dry_run_makes_no_db_writes(self):
        parsed = ParseResult(events=[_make_event()])
        report = import_parsed_events(parsed, dry_run=True)
        self.assertEqual(TutorialEvents.objects.count(), 0)
        self.assertEqual(TutorialSessions.objects.count(), 0)
        self.assertTrue(report.dry_run)
        self.assertEqual(report.events_created, 1)
        self.assertEqual(report.sessions_created, 2)

    def test_commit_creates_event_and_sessions(self):
        parsed = ParseResult(events=[_make_event()])
        report = import_parsed_events(parsed, dry_run=False)
        self.assertEqual(TutorialEvents.objects.count(), 1)
        self.assertEqual(TutorialSessions.objects.count(), 2)
        ev = TutorialEvents.objects.get()
        self.assertEqual(ev.code, 'CB1-01-24A')
        self.assertEqual(ev.start_date, date(2023, 11, 30))
        self.assertTrue(ev.is_soldout)
        self.assertEqual(ev.remain_space, 0)
        self.assertIsNotNone(ev.store_product)
        self.assertEqual(ev.location.name, 'Live Online')
        self.assertEqual(ev.venue.name, 'Live Online')
        self.assertIsNotNone(ev.main_instructor)
        seqs = sorted(s.sequence for s in ev.sessions.all())
        self.assertEqual(seqs, [1, 2])
        # Session instructors via M2M
        s1 = ev.sessions.get(sequence=1)
        self.assertEqual(list(s1.instructors.values_list('staff__user__first_name', flat=True)),
                         ['Lynn'])

    def test_truncates_existing_events_sessions_session_instructors_before_insert(self):
        # Pre-existing event from a "previous import"
        loc = TutorialLocation.objects.create(name='Old Location', code='Old')
        # Create via raw save — needs FK to store_product, so just create one
        # using the same setUp data.
        from store.models import TutorialProduct
        from catalog.models import ExamSession, ExamSessionSubject, ProductProductVariation
        es_old = ExamSession.objects.create(
            session_code='OLD',
            start_date=timezone.now(),
            end_date=timezone.now(),
        )
        ess_old = ExamSessionSubject.objects.create(
            exam_session=es_old, subject=Subject.objects.get(code='CB1'),
        )
        ppv_old = ProductProductVariation.objects.create(
            product=CatProduct.objects.get(code='Live'),
            product_variation=ProductVariation.objects.get(code='LO_6H'),
        )
        sp_old = TutorialProduct(
            exam_session_subject=ess_old, product_product_variation=ppv_old,
            product_code='OLD_PRODUCT_CODE',
            format='LO_6H',
        )
        sp_old.save()
        ev_old = TutorialEvents.objects.create(
            code='OLD-01-24A', store_product=sp_old,
            start_date=date(2023, 1, 1), end_date=date(2023, 1, 2),
        )
        TutorialSessions.objects.create(
            tutorial_event=ev_old, title='OLD-01-24A-1', sequence=1,
            start_date=timezone.now(), end_date=timezone.now(),
        )
        self.assertEqual(TutorialEvents.objects.count(), 1)
        self.assertEqual(TutorialSessions.objects.count(), 1)

        parsed = ParseResult(events=[_make_event()])
        import_parsed_events(parsed, dry_run=False)

        # Old event is gone, new one is in.
        self.assertEqual(TutorialEvents.objects.count(), 1)
        self.assertEqual(TutorialEvents.objects.get().code, 'CB1-01-24A')
        self.assertEqual(TutorialSessions.objects.count(), 2)
        # TutorialLocation survives across imports.
        self.assertTrue(TutorialLocation.objects.filter(name='Old Location').exists())

    def test_skips_cancelled_events_and_records_in_report(self):
        ev = _make_event(cancelled=True)
        parsed = ParseResult(events=[ev])
        report = import_parsed_events(parsed, dry_run=False)
        self.assertEqual(TutorialEvents.objects.count(), 0)
        self.assertEqual(report.events_skipped_cancelled, 1)

    def test_records_resolution_errors_and_skips_event(self):
        # Subject 'ZZZ' doesn't exist → resolver errors → event skipped.
        bad = _make_event(subject_code='ZZZ')
        parsed = ParseResult(events=[bad])
        report = import_parsed_events(parsed, dry_run=False)
        self.assertEqual(TutorialEvents.objects.count(), 0)
        self.assertEqual(report.events_skipped_errors, 1)
        self.assertEqual(len(report.event_errors), 1)
        self.assertEqual(report.event_errors[0]['title'], 'CB1-01-24A')
        self.assertTrue(any('ZZZ' in e for e in report.event_errors[0]['errors']))

    def test_dedups_sessions_with_duplicate_sequence_per_event(self):
        sessions = [
            _make_session(1, base='CB1-01-24A'),
            _make_session(1, base='CB1-01-24A'),  # duplicate sequence
            _make_session(2, base='CB1-01-24A'),
        ]
        ev = _make_event(sessions=sessions)
        parsed = ParseResult(events=[ev])
        report = import_parsed_events(parsed, dry_run=False)
        # First-occurrence-wins → 2 unique sessions kept, 1 dropped.
        self.assertEqual(report.sessions_created, 2)
        self.assertEqual(report.sessions_skipped_duplicate_sequence, 1)
        self.assertEqual(TutorialSessions.objects.count(), 2)

    def test_partial_success_some_events_imported_others_skipped(self):
        good = _make_event(title='CB1-01-24A')
        bad = _make_event(title='ZZZ-99-24A', subject_code='ZZZ')
        cancelled = _make_event(title='CB1-02-24A', cancelled=True)
        parsed = ParseResult(events=[good, bad, cancelled])
        report = import_parsed_events(parsed, dry_run=False)
        self.assertEqual(TutorialEvents.objects.count(), 1)
        self.assertEqual(TutorialEvents.objects.get().code, 'CB1-01-24A')
        self.assertEqual(report.events_created, 1)
        self.assertEqual(report.events_skipped_cancelled, 1)
        self.assertEqual(report.events_skipped_errors, 1)
