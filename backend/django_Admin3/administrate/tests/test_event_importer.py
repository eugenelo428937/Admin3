"""
Tests for event importer dual-write functions (Phase 5).

Tests create_tutorial_event(), create_tutorial_session(), and
create_event_bridge_record() which enable the event importer to
write to both tutorial tables and Administrate simultaneously.
"""
from datetime import date, datetime, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from tutorials.models import (
    TutorialCourseTemplate, TutorialLocation, TutorialVenue,
    TutorialInstructor, TutorialEvents, TutorialSessions,
)
from tutorials.models.staff import Staff
from administrate.models import (
    CourseTemplate as AdmCourseTemplate,
    Location as AdmLocation,
    Instructor as AdmInstructor,
    Event as AdmEvent,
)
from administrate.models.venues import Venue as AdmVenue

User = get_user_model()


class EventImporterTestMixin:
    """Shared setUp for event importer tests — builds the full FK chain."""

    def _create_test_fixtures(self):
        """Create the entire model chain needed for event importer tests."""
        from catalog.subject.models import Subject
        from catalog.exam_session.models import ExamSession
        from catalog.models import ExamSessionSubject
        from catalog.products.models.product import Product as CatalogProduct
        from catalog.products.models.product_variation import ProductVariation
        from catalog.products.models.product_product_variation import ProductProductVariation
        from store.models import Product as StoreProduct

        # Catalog chain: Subject → ExamSession → ESS → PPV → store.Product
        self.subject = Subject.objects.create(code='CM2', description='Models')
        self.exam_session = ExamSession.objects.create(
            session_code='2026-04',
            start_date=timezone.make_aware(datetime(2026, 4, 1)),
            end_date=timezone.make_aware(datetime(2026, 9, 30)),
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject,
        )
        self.catalog_product = CatalogProduct.objects.create(
            fullname='CM2 Tutorial', shortname='CM2-TUT', code='TUT01',
        )
        self.product_variation = ProductVariation.objects.create(
            variation_type='Tutorial', name='Tutorial',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.catalog_product,
            product_variation=self.product_variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
            product_code='CM2/TUT01/2026-04',
        )

        # Tutorial models
        self.tutorial_ct = TutorialCourseTemplate.objects.create(
            code='CM2', title='CM2 Models',
        )
        self.tutorial_location = TutorialLocation.objects.create(name='London')
        self.tutorial_venue = TutorialVenue.objects.create(
            name='Room A', location=self.tutorial_location,
        )
        user = User.objects.create_user(
            username='jsmith', first_name='Jane', last_name='Smith',
        )
        self.staff = Staff.objects.create(user=user)
        self.tutorial_instructor = TutorialInstructor.objects.create(
            staff=self.staff, is_active=True,
        )

        # Bridge (adm) models
        self.adm_ct = AdmCourseTemplate.objects.create(
            external_id='ct-1',
            tutorial_course_template=self.tutorial_ct,
        )
        self.adm_location = AdmLocation.objects.create(
            external_id='loc-1',
            tutorial_location=self.tutorial_location,
        )
        self.adm_venue = AdmVenue.objects.create(
            external_id='venue-1',
            tutorial_venue=self.tutorial_venue,
        )
        self.adm_instructor = AdmInstructor.objects.create(
            external_id='instr-1',
            tutorial_instructor=self.tutorial_instructor,
        )

    def _make_event_row_data(self, **overrides):
        """Build a minimal valid event row_data dict."""
        data = {
            'Course template code': 'CM2',
            'Event title': 'CM2 April 2026 London',
            'event_title': 'CM2 April 2026 London',
            'course_template_id': 'ct-1',
            'location_id': 'loc-1',
            'venue_id': 'venue-1',
            'instructor_ids': ['instr-1'],
            'session_instructor_ids': ['instr-1'],
            'administrator_ids': [],
            'sitting': '2026A',
            'Sitting': '2026A',
            'Max places': 30,
            'Web sale': True,
            'event_or_session': 'event',
            'event_mode': 'blended',
            'formatted_classroom_start_datetime': '2026-04-15T09:00:00',
            'formatted_classroom_end_datetime': '2026-04-15T17:00:00',
            'formatted_lms_start_datetime': '2026-04-01T00:00:00',
            'formatted_lms_end_datetime': '2026-09-30T23:59:00',
            'finalisation_datetime': '2026-03-15',
            'row_number': 5,
        }
        data.update(overrides)
        return data

    def _make_session_row_data(self, **overrides):
        """Build a minimal valid session row_data dict."""
        data = {
            'event_or_session': 'session',
            'event_title': 'Day 2 - Online',
            'Session title': 'Day 2 - Online',
            'session_day': 2,
            'session_instructor_ids': ['instr-1'],
            'formatted_classroom_start_datetime': '2026-04-22T09:00:00',
            'formatted_classroom_end_datetime': '2026-04-22T17:00:00',
            'Session_url': '',
            'row_number': 6,
        }
        data.update(overrides)
        return data


class CreateTutorialEventTest(EventImporterTestMixin, TestCase):
    """Tests for create_tutorial_event()."""

    def setUp(self):
        self._create_test_fixtures()

    def test_creates_tutorial_event_with_all_fks(self):
        """T025: FK resolution (store_product, location, venue) and record creation."""
        from administrate.utils.event_dual_write import create_tutorial_event

        row = self._make_event_row_data()
        event = create_tutorial_event(row)

        self.assertIsNotNone(event)
        self.assertIsInstance(event, TutorialEvents)
        self.assertEqual(event.store_product, self.store_product)
        self.assertEqual(event.location, self.tutorial_location)
        self.assertEqual(event.venue, self.tutorial_venue)
        self.assertEqual(event.start_date, date(2026, 4, 1))
        self.assertEqual(event.end_date, date(2026, 9, 30))

    def test_returns_none_when_store_product_unresolvable(self):
        """Should return None if the store product FK chain can't be resolved."""
        from administrate.utils.event_dual_write import create_tutorial_event

        # Use a course template ID with no tutorial_course_template link
        unlinked_ct = AdmCourseTemplate.objects.create(external_id='ct-unlinked')
        row = self._make_event_row_data(course_template_id='ct-unlinked')
        event = create_tutorial_event(row)

        self.assertIsNone(event)

    def test_resolves_location_via_bridge(self):
        """Location resolved through adm.Location → tutorial_location FK."""
        from administrate.utils.event_dual_write import create_tutorial_event

        row = self._make_event_row_data()
        event = create_tutorial_event(row)

        self.assertIsNotNone(event)
        self.assertEqual(event.location_id, self.tutorial_location.pk)

    def test_resolves_venue_via_bridge(self):
        """Venue resolved through adm.Venue → tutorial_venue FK."""
        from administrate.utils.event_dual_write import create_tutorial_event

        row = self._make_event_row_data()
        event = create_tutorial_event(row)

        self.assertIsNotNone(event)
        self.assertEqual(event.venue_id, self.tutorial_venue.pk)

    def test_works_without_venue(self):
        """Should create event even when venue is missing."""
        from administrate.utils.event_dual_write import create_tutorial_event

        row = self._make_event_row_data(venue_id=None)
        event = create_tutorial_event(row)

        self.assertIsNotNone(event)
        self.assertIsNone(event.venue)


class CreateTutorialSessionTest(EventImporterTestMixin, TestCase):
    """Tests for create_tutorial_session()."""

    def setUp(self):
        self._create_test_fixtures()
        # Pre-create a tutorial event for session tests
        self.tutorial_event = TutorialEvents.objects.create(
            code='CM2-TEST-001',
            store_product=self.store_product,
            location=self.tutorial_location,
            venue=self.tutorial_venue,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 9, 30),
        )

    def test_creates_session_linked_to_event(self):
        """T026: Creates TutorialSessions linked to parent event."""
        from administrate.utils.event_dual_write import create_tutorial_session

        row = self._make_session_row_data()
        session = create_tutorial_session(row, self.tutorial_event)

        self.assertIsNotNone(session)
        self.assertIsInstance(session, TutorialSessions)
        self.assertEqual(session.tutorial_event, self.tutorial_event)
        self.assertEqual(session.title, 'Day 2 - Online')
        self.assertEqual(session.sequence, 2)

    def test_links_instructors_via_bridge(self):
        """T026: M2M instructor links resolved through adm.Instructor bridge."""
        from administrate.utils.event_dual_write import create_tutorial_session

        row = self._make_session_row_data()
        session = create_tutorial_session(row, self.tutorial_event)

        self.assertIsNotNone(session)
        self.assertIn(self.tutorial_instructor, session.instructors.all())

    def test_session_inherits_event_location(self):
        """Session should inherit location/venue from parent event."""
        from administrate.utils.event_dual_write import create_tutorial_session

        row = self._make_session_row_data()
        session = create_tutorial_session(row, self.tutorial_event)

        self.assertEqual(session.location, self.tutorial_location)
        self.assertEqual(session.venue, self.tutorial_venue)

    def test_returns_none_when_dates_missing(self):
        """Should return None when session dates cannot be parsed."""
        from administrate.utils.event_dual_write import create_tutorial_session

        row = self._make_session_row_data(
            formatted_classroom_start_datetime=None,
            formatted_classroom_end_datetime=None,
        )
        session = create_tutorial_session(row, self.tutorial_event)

        self.assertIsNone(session)


class CreateEventBridgeRecordTest(EventImporterTestMixin, TestCase):
    """Tests for create_event_bridge_record()."""

    def setUp(self):
        self._create_test_fixtures()
        self.tutorial_event = TutorialEvents.objects.create(
            code='CM2-BRIDGE-001',
            store_product=self.store_product,
            location=self.tutorial_location,
            venue=self.tutorial_venue,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 9, 30),
        )

    def test_creates_bridge_record(self):
        """T027: Creates adm.Event with external_id and tutorial_event FK."""
        from administrate.utils.event_dual_write import create_event_bridge_record

        row = self._make_event_row_data()
        bridge = create_event_bridge_record(
            self.tutorial_event, 'ADM-EVT-123', row,
        )

        self.assertIsNotNone(bridge)
        self.assertIsInstance(bridge, AdmEvent)
        self.assertEqual(bridge.external_id, 'ADM-EVT-123')
        self.assertEqual(bridge.tutorial_event, self.tutorial_event)
        self.assertEqual(bridge.course_template, self.adm_ct)
        self.assertEqual(bridge.location, self.adm_location)
        self.assertEqual(bridge.primary_instructor, self.adm_instructor)

    def test_returns_none_without_api_event_id(self):
        """Should return None when no API event ID is provided."""
        from administrate.utils.event_dual_write import create_event_bridge_record

        row = self._make_event_row_data()
        bridge = create_event_bridge_record(self.tutorial_event, None, row)

        self.assertIsNone(bridge)

    def test_sets_learning_mode_from_event_mode(self):
        """Bridge record should map event_mode to learning_mode correctly."""
        from administrate.utils.event_dual_write import create_event_bridge_record

        for excel_mode, expected_mode in [
            ('blended', 'BLENDED'), ('lms', 'LMS'), ('classroom', 'CLASSROOM'),
        ]:
            row = self._make_event_row_data(event_mode=excel_mode)
            bridge = create_event_bridge_record(
                self.tutorial_event, f'EVT-{excel_mode}', row,
            )
            self.assertEqual(bridge.learning_mode, expected_mode,
                             f'{excel_mode} should map to {expected_mode}')


class APIFailureHandlingTest(EventImporterTestMixin, TestCase):
    """Tests for API failure resilience (T028)."""

    def setUp(self):
        self._create_test_fixtures()

    def test_tutorial_records_survive_api_failure(self):
        """T028: Tutorial records persist even when API call would fail."""
        from administrate.utils.event_dual_write import create_tutorial_event

        row = self._make_event_row_data()
        tutorial_event = create_tutorial_event(row)

        # Verify the tutorial event was created locally
        self.assertIsNotNone(tutorial_event)
        self.assertTrue(
            TutorialEvents.objects.filter(pk=tutorial_event.pk).exists()
        )

        # Simulate: API failed, no bridge record created
        # The tutorial event should still exist
        self.assertEqual(
            AdmEvent.objects.filter(tutorial_event=tutorial_event).count(), 0
        )
        # But the tutorial event is preserved
        self.assertTrue(
            TutorialEvents.objects.filter(pk=tutorial_event.pk).exists()
        )

    def test_bridge_record_failure_preserves_tutorial_event(self):
        """Bridge record creation failure should not affect tutorial records."""
        from administrate.utils.event_dual_write import (
            create_tutorial_event, create_event_bridge_record,
        )

        row = self._make_event_row_data()
        tutorial_event = create_tutorial_event(row)
        self.assertIsNotNone(tutorial_event)

        # Attempt bridge creation with missing data (no instructor)
        bad_row = self._make_event_row_data(instructor_ids=[], session_instructor_ids=[])
        bridge = create_event_bridge_record(tutorial_event, 'EVT-FAIL', bad_row)

        # Bridge failed (no instructor to resolve)
        self.assertIsNone(bridge)
        # But tutorial event still exists
        self.assertTrue(
            TutorialEvents.objects.filter(pk=tutorial_event.pk).exists()
        )
