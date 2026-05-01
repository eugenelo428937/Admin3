"""Tests for tutorials.services.event_csv_resolver.

Resolves the catalog/store/tutorials dependencies for a ParsedEvent.
Master-data entities (Subject, ProductVariation, location-keyed catalog.Product)
are LOOKUP-ONLY — missing values produce a ResolutionError that the orchestrator
surfaces in the import report. Junction/instance entities (ExamSession,
ExamSessionSubject, ProductProductVariation, store.Product, TutorialLocation,
TutorialVenue, TutorialInstructor + User + Staff) are get_or_create.
"""
from datetime import date, datetime
from django.contrib.auth.models import User
from django.test import TestCase

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject, Product as CatProduct,
    ProductVariation, ProductProductVariation,
)
from staff.models import Staff
from store.models import Product as StoreProduct
from tutorials.models import (
    TutorialLocation, TutorialVenue, TutorialInstructor,
)
from tutorials.services.event_csv_parser import ParsedEvent, ParsedSession
from tutorials.services.event_csv_resolver import (
    resolve_event_dependencies, ResolutionError, LOCATION_TO_CATALOG_CODE,
)


def _make_parsed_event(**overrides) -> ParsedEvent:
    defaults = dict(
        code='CB1_LO_6',
        title='CB1-01-24A',
        subject_code='CB1',
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
        cancelled=False,
        sessions=[],
    )
    defaults.update(overrides)
    return ParsedEvent(**defaults)


class ResolverHappyPathTests(TestCase):
    """All required master data exists; resolver should populate everything."""

    def setUp(self):
        # Master catalog: Subject + ProductVariation + catalog.Product (location)
        self.subject = Subject.objects.create(code='CB1', description='Business Finance', active=True)
        self.variation = ProductVariation.objects.create(
            code='LO_6H', name='6 half days (Live Online)', description='', description_short='LO_6H',
            variation_type='Tutorial',
        )
        self.cat_product = CatProduct.objects.create(
            code='Live', fullname='Tutorial - Live Online', shortname='Tutorial Live',
        )

    def test_resolves_full_chain_when_all_master_data_exists(self):
        # CSV uses 'product variations' value 'LO_6H' which we pass directly.
        parsed = _make_parsed_event()
        resolution = resolve_event_dependencies(
            parsed,
        )
        self.assertEqual(resolution.errors, [])
        self.assertEqual(resolution.subject, self.subject)
        self.assertEqual(resolution.exam_session.session_code, '24')
        self.assertEqual(resolution.product_variation, self.variation)
        self.assertEqual(resolution.catalog_product, self.cat_product)
        self.assertIsNotNone(resolution.store_product)
        self.assertEqual(resolution.store_product.product_code, 'CB1_LO_6')
        self.assertEqual(resolution.tutorial_location.name, 'Live Online')
        self.assertEqual(resolution.tutorial_venue.name, 'Live Online')
        self.assertEqual(len(resolution.instructors), 1)
        self.assertEqual(resolution.instructors[0].staff.user.first_name, 'Lynn')
        self.assertEqual(resolution.instructors[0].staff.user.last_name, 'Birchall')

    def test_creates_exam_session_if_missing(self):
        self.assertFalse(ExamSession.objects.filter(session_code='24').exists())
        resolve_event_dependencies(_make_parsed_event())
        self.assertTrue(ExamSession.objects.filter(session_code='24').exists())

    def test_reuses_existing_user_for_repeated_instructor_name(self):
        parsed1 = _make_parsed_event()
        parsed2 = _make_parsed_event(title='CB1-02-24A', instructor_names=['Lynn Birchall'])
        r1 = resolve_event_dependencies(parsed1)
        r2 = resolve_event_dependencies(parsed2)
        self.assertEqual(r1.instructors[0].pk, r2.instructors[0].pk)
        self.assertEqual(User.objects.filter(first_name='Lynn', last_name='Birchall').count(), 1)

    def test_user_created_with_unusable_password(self):
        resolve_event_dependencies(_make_parsed_event())
        u = User.objects.get(first_name='Lynn', last_name='Birchall')
        self.assertFalse(u.has_usable_password())

    def test_multiple_instructors_resolve_to_separate_records(self):
        parsed = _make_parsed_event(instructor_names=['Lynn Birchall', 'Anna Walklate'])
        resolution = resolve_event_dependencies(parsed)
        names = sorted(f"{i.staff.user.first_name} {i.staff.user.last_name}" for i in resolution.instructors)
        self.assertEqual(names, ['Anna Walklate', 'Lynn Birchall'])


class ResolverErrorPathTests(TestCase):
    """Master data missing → resolver emits errors instead of creating."""

    def setUp(self):
        self.variation = ProductVariation.objects.create(
            code='LO_6H', name='LO_6H', description='', description_short='LO_6H',
            variation_type='Tutorial',
        )
        self.cat_product = CatProduct.objects.create(
            code='Live', fullname='Tutorial - Live Online', shortname='Live',
        )

    def test_missing_subject_records_error_and_returns_no_store_product(self):
        parsed = _make_parsed_event(subject_code='ZZZ')
        resolution = resolve_event_dependencies(parsed)
        self.assertIsNone(resolution.store_product)
        self.assertTrue(any('subject' in e.lower() and 'ZZZ' in e for e in resolution.errors))

    def test_missing_product_variation_records_error(self):
        Subject.objects.create(code='CB1', description='Bus Fin', active=True)
        parsed = _make_parsed_event(product_variation_code='UNKNOWN_VAR')
        resolution = resolve_event_dependencies(parsed)
        self.assertIsNone(resolution.store_product)
        self.assertTrue(any('variation' in e.lower() and 'UNKNOWN_VAR' in e for e in resolution.errors))

    def test_missing_location_catalog_product_records_error(self):
        # 'Reading' has no entry in LOCATION_TO_CATALOG_CODE → error
        Subject.objects.create(code='CB1', description='Bus Fin', active=True)
        parsed = _make_parsed_event(location_name='Reading')
        resolution = resolve_event_dependencies(parsed)
        self.assertIsNone(resolution.store_product)
        self.assertTrue(any('reading' in e.lower() for e in resolution.errors))


class ResolverLocationMappingTests(TestCase):
    """The CSV Location string maps to a catalog.Product code (e.g., London → 'Lon')."""

    def test_location_to_catalog_code_map_covers_known_locations(self):
        for csv_loc in ['Live Online', 'London', 'Edinburgh', 'Manchester',
                        'Birmingham', 'Leeds', 'Glasgow', 'Bristol', 'Dublin']:
            self.assertIn(csv_loc, LOCATION_TO_CATALOG_CODE,
                          msg=f"missing mapping for {csv_loc!r}")
