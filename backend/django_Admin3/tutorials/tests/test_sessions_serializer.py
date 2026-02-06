"""
Tests for TutorialSessions serialization in unified search API.

Verifies that the sessions array is correctly nested within tutorial
events in the search API response, matching the contract in
contracts/api-response.yaml.
"""
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from tutorials.models import (
    TutorialEvents, TutorialSessions,
    TutorialLocation, TutorialVenue,
)
from tutorials.serializers import TutorialSessionsSerializer
from search.serializers import StoreProductListSerializer


def _create_store_product():
    """Helper to create a store product with all catalog dependencies."""
    from catalog.models import (
        Subject, ExamSession, ExamSessionSubject,
        Product as CatalogProduct, ProductVariation,
        ProductProductVariation,
    )
    from store.models import Product as StoreProduct

    subject = Subject.objects.create(
        code='CM2', description='Economic Modelling', active=True
    )
    exam_session = ExamSession.objects.create(
        session_code='2025-04',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=180)
    )
    ess = ExamSessionSubject.objects.create(
        exam_session=exam_session, subject=subject
    )
    catalog_product = CatalogProduct.objects.create(
        code='DUB', fullname='Tutorial - Dublin', shortname='Dublin',
        description='Dublin'
    )
    variation = ProductVariation.objects.create(
        code='CM2F2F5', name='CM2_f2f_5', variation_type='Tutorial',
        description='CM2 5-day bundle', description_short='5-day bundle'
    )
    ppv = ProductProductVariation.objects.create(
        product=catalog_product, product_variation=variation
    )
    store_product = StoreProduct.objects.create(
        exam_session_subject=ess,
        product_product_variation=ppv,
        product_code='CM2/TLONCM2_f2f_5/2025-04',
    )
    return store_product


class TutorialSessionsSerializerFieldsTest(TestCase):
    """Tests for sessions serialization in the search API."""

    def setUp(self):
        self.store_product = _create_store_product()

        self.tl_dublin = TutorialLocation.objects.create(name='Dublin', code='DUB')
        self.tv_camden = TutorialVenue.objects.create(
            name='Camden Court Hotel', location=self.tl_dublin,
        )

        self.event = TutorialEvents.objects.create(
            code='CM2-55-25S',
            venue=self.tv_camden,
            is_soldout=False,
            remain_space=11,
            start_date=date(2025, 7, 22),
            end_date=date(2025, 8, 21),
            store_product=self.store_product,
        )

        self.session1 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 1 - Introduction',
            location=self.tl_dublin,
            venue=self.tv_camden,
            start_date=timezone.make_aware(timezone.datetime(2025, 7, 22, 9, 0)),
            end_date=timezone.make_aware(timezone.datetime(2025, 7, 22, 17, 0)),
            sequence=1,
            url=None,
        )
        self.session2 = TutorialSessions.objects.create(
            tutorial_event=self.event,
            title='Day 2 - Stochastic Models',
            location=self.tl_dublin,
            venue=self.tv_camden,
            start_date=timezone.make_aware(timezone.datetime(2025, 7, 23, 9, 0)),
            end_date=timezone.make_aware(timezone.datetime(2025, 7, 23, 17, 0)),
            sequence=2,
            url='https://zoom.us/j/123456789',
        )

    def test_serializer_includes_sessions_in_event(self):
        """T026: Verify sessions array is included in tutorial event output."""
        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        self.assertEqual(len(events), 1)
        event_data = events[0]
        self.assertIn('sessions', event_data)
        self.assertIsInstance(event_data['sessions'], list)
        self.assertEqual(len(event_data['sessions']), 2)

    def test_session_fields_match_contract(self):
        """T027: Verify session fields match API contract schema."""
        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        session_data = events[0]['sessions'][0]

        expected_fields = {
            'id', 'title', 'location', 'venue',
            'start_date', 'end_date', 'sequence', 'url'
        }
        self.assertEqual(set(session_data.keys()), expected_fields)

        # Verify field types
        self.assertIsInstance(session_data['id'], int)
        self.assertIsInstance(session_data['title'], str)
        self.assertIsInstance(session_data['location'], str)
        self.assertIsInstance(session_data['venue'], str)
        self.assertIsInstance(session_data['start_date'], str)
        self.assertIsInstance(session_data['end_date'], str)
        self.assertIsInstance(session_data['sequence'], int)

        # Verify values
        self.assertEqual(session_data['title'], 'Day 1 - Introduction')
        self.assertEqual(session_data['location'], 'Dublin')
        self.assertEqual(session_data['venue'], 'Camden Court Hotel')
        self.assertEqual(session_data['sequence'], 1)
        self.assertIsNone(session_data['url'])

    def test_sessions_ordered_by_sequence(self):
        """T028: Verify sessions are ordered by sequence ascending."""
        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        sessions = events[0]['sessions']
        sequences = [s['sequence'] for s in sessions]
        self.assertEqual(sequences, [1, 2])

    def test_empty_sessions_for_event_with_no_sessions(self):
        """T029: Verify empty sessions array for events without sessions."""
        tv_london = TutorialVenue.objects.create(name='London Office')
        event2 = TutorialEvents.objects.create(
            code='CM2-56-25S',
            venue=tv_london,
            is_soldout=False,
            remain_space=5,
            start_date=date(2025, 9, 1),
            end_date=date(2025, 9, 30),
            store_product=self.store_product,
        )

        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        event2_data = next(e for e in events if e['code'] == 'CM2-56-25S')
        self.assertEqual(event2_data['sessions'], [])

    def test_session_url_nullable(self):
        """Verify url field is null when not set, string when set."""
        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        sessions = events[0]['sessions']

        self.assertIsNone(sessions[0]['url'])
        self.assertEqual(sessions[1]['url'], 'https://zoom.us/j/123456789')

    def test_session_dates_iso_format(self):
        """Verify start_date and end_date are ISO 8601 formatted strings."""
        events = StoreProductListSerializer._serialize_tutorial_events(
            self.store_product
        )
        session_data = events[0]['sessions'][0]

        # ISO 8601 datetime format contains T separator
        self.assertIn('T', session_data['start_date'])
        self.assertIn('T', session_data['end_date'])


class TutorialSessionsModelSerializerTest(TestCase):
    """Test TutorialSessionsSerializer (DRF ModelSerializer)."""

    def setUp(self):
        store_product = _create_store_product()

        tl_london = TutorialLocation.objects.create(name='London', code='LON')
        tv_office = TutorialVenue.objects.create(
            name='London Office', location=tl_london,
        )

        event = TutorialEvents.objects.create(
            code='CB1-33-25S',
            venue=tv_office,
            is_soldout=False,
            remain_space=8,
            start_date=date(2025, 8, 1),
            end_date=date(2025, 8, 3),
            store_product=store_product,
        )

        self.session = TutorialSessions.objects.create(
            tutorial_event=event,
            title='Day 1 - Business Finance Basics',
            location=tl_london,
            venue=tv_office,
            start_date=timezone.make_aware(timezone.datetime(2025, 8, 1, 9, 0)),
            end_date=timezone.make_aware(timezone.datetime(2025, 8, 1, 17, 0)),
            sequence=1,
        )

    def test_serializer_output_fields(self):
        """Verify TutorialSessionsSerializer outputs all contract fields."""
        serializer = TutorialSessionsSerializer(self.session)
        data = serializer.data

        expected_fields = {
            'id', 'title', 'instructor', 'venue', 'location',
            'start_date', 'end_date', 'sequence', 'url'
        }
        self.assertEqual(set(data.keys()), expected_fields)
        self.assertEqual(data['title'], 'Day 1 - Business Finance Basics')
        self.assertEqual(data['sequence'], 1)
