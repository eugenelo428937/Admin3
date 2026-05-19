"""Polymorphic search behavior across material / tutorial / marking kinds.

These tests pin the post-Phase-5 contract that the search endpoint surfaces
all three store-product kinds — not just Material. Today the serializer
silently drops Tutorial/Marking rows (`get_material_ppv()` returns None →
`continue` in serialize_grouped_products), and `_build_searchable_text`
falls back to subject_code + product_code so a tutorial in London is
unfindable by the name "London".

The contract these tests lock in:
  - Tutorial rows appear in the serialized output with kind='tutorial',
    type='Tutorial', and identifying fields (location name, format display).
  - Marking rows appear with kind='marking', type='Markings', and
    marking_template name/code.
  - Material rows keep their existing grouped shape (no regression).
  - Searchable text for tutorial includes location name + format display
    so 'London' fuzzy-matches the London tutorial row.
  - Searchable text for marking includes marking_template name so
    'mock marking' matches.
"""
from decimal import Decimal

from django.test import TestCase

from search.serializers import StoreProductListSerializer
from search.services.search_service import SearchService
from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
    create_tutorial_location,
    create_tutorial_product,
    create_marking_template,
    create_marking_product,
)
from store.models import Price


class TestSerializerSurfacesTutorialMarking(TestCase):
    """The serializer must emit Tutorial/Marking rows alongside Material."""

    def setUp(self):
        self.subject = create_subject('CM2')
        self.session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.session, self.subject)

        # Material fixture
        self.catalog_product = create_catalog_product(
            fullname='CM2 Combined Materials',
            shortname='CM2 Materials',
            code='PCM2',
        )
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')
        self.material_sp = create_store_product(
            self.ess, self.catalog_product, self.printed,
            product_code='CM2/PPCM2/2025-04',
        )

        # Tutorial fixture — London, Live Online 6 half days
        self.london = create_tutorial_location(name='London', code='LON')
        self.tutorial_sp = create_tutorial_product(
            self.ess, location=self.london, fmt='LO_6H',
        )
        Price.objects.create(
            product=self.tutorial_sp, price_type='standard',
            amount=Decimal('150.00'), currency='GBP',
        )

        # Marking fixture
        self.mm_template = create_marking_template(code='MM1', name='Mock Marking 1')
        self.marking_sp = create_marking_product(
            self.ess, template=self.mm_template,
        )
        Price.objects.create(
            product=self.marking_sp, price_type='standard',
            amount=Decimal('40.00'), currency='GBP',
        )

    def test_tutorial_row_present_with_kind(self):
        """Tutorial rows must appear in the serialized output."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.material_sp, self.tutorial_sp, self.marking_sp]
        )

        kinds = [row.get('kind') for row in result]
        self.assertIn('tutorial', kinds,
            "Tutorial rows must not be silently dropped — they should appear "
            "with kind='tutorial' so the frontend can render them.")

    def test_marking_row_present_with_kind(self):
        """Marking rows must appear in the serialized output."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.material_sp, self.tutorial_sp, self.marking_sp]
        )

        kinds = [row.get('kind') for row in result]
        self.assertIn('marking', kinds,
            "Marking rows must not be silently dropped — they should appear "
            "with kind='marking'.")

    def test_material_row_keeps_kind_material(self):
        """Material rows get kind='material' explicitly — no inference."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.material_sp]
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].get('kind'), 'material')

    def test_tutorial_row_carries_location_and_format(self):
        """Tutorial row exposes location name + format display so the
        frontend can show 'London — Live Online 6 half days' without
        another API call."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.tutorial_sp]
        )

        self.assertEqual(len(result), 1)
        row = result[0]
        self.assertEqual(row['kind'], 'tutorial')
        self.assertEqual(row['type'], 'Tutorial')
        self.assertEqual(row['tutorial_location_name'], 'London')
        self.assertEqual(row['tutorial_location_code'], 'LON')
        self.assertEqual(row['format'], 'LO_6H')
        # format_display is the human-readable form from Format.choices
        self.assertEqual(row['format_display'], 'Live Online 6 half days')

    def test_tutorial_row_carries_subject_and_session(self):
        """Tutorial row carries subject + session identifiers — same shape
        as material rows for the fields the frontend grid uses."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.tutorial_sp]
        )
        row = result[0]
        self.assertEqual(row['subject_code'], 'CM2')
        self.assertEqual(row['exam_session_code'], '2025-04')

    def test_tutorial_row_carries_prices(self):
        """Tutorial row exposes prices array so the search grid can show
        a price without a follow-up call."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.tutorial_sp]
        )
        row = result[0]
        self.assertIn('prices', row)
        self.assertEqual(len(row['prices']), 1)
        self.assertEqual(row['prices'][0]['price_type'], 'standard')
        self.assertEqual(row['prices'][0]['amount'], '150.00')

    def test_marking_row_carries_template_fields(self):
        """Marking row exposes template name + code so the frontend can
        render 'CM2 — Mock Marking 1' without joining."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.marking_sp]
        )

        self.assertEqual(len(result), 1)
        row = result[0]
        self.assertEqual(row['kind'], 'marking')
        self.assertEqual(row['type'], 'Markings')
        self.assertEqual(row['marking_template_name'], 'Mock Marking 1')
        self.assertEqual(row['marking_template_code'], 'MM1')
        self.assertEqual(row['subject_code'], 'CM2')

    def test_marking_row_carries_prices(self):
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.marking_sp]
        )
        row = result[0]
        self.assertIn('prices', row)
        self.assertEqual(len(row['prices']), 1)
        self.assertEqual(row['prices'][0]['amount'], '40.00')

    def test_material_row_keeps_grouped_shape(self):
        """Material rows MUST keep their existing 'group by catalog product'
        shape — no regression on the response contract. Two variations of
        the same catalog product collapse to one row with `variations[]`."""
        ebook = create_product_variation('eBook', 'Standard eBook', code='E')
        ebook_sp = create_store_product(
            self.ess, self.catalog_product, ebook,
            product_code='CM2/EPCM2/2025-04',
        )

        result = StoreProductListSerializer.serialize_grouped_products(
            [self.material_sp, ebook_sp]
        )

        material_rows = [r for r in result if r.get('kind') == 'material']
        self.assertEqual(len(material_rows), 1,
            "Two variations of the same catalog product must group into one "
            "material row — that's the existing contract.")
        self.assertEqual(len(material_rows[0]['variations']), 2)

    def test_all_three_kinds_in_one_response(self):
        """All three kinds coexist in a mixed response — the acceptance
        criterion from the to-do ('Listings show Tutorial/Marking rows
        alongside Material rows')."""
        result = StoreProductListSerializer.serialize_grouped_products(
            [self.material_sp, self.tutorial_sp, self.marking_sp]
        )

        kinds = sorted({row['kind'] for row in result})
        self.assertEqual(kinds, ['marking', 'material', 'tutorial'])


class TestFuzzySearchFindabilityForTutorialMarking(TestCase):
    """Tutorial 'London' and 'mock marking' rows must be findable by name.

    Phase 5 left _build_searchable_text producing only `{subject} {code}`
    for non-material rows, so the actual identifying noun ('London',
    'Mock Marking') never enters the search corpus.
    """

    def setUp(self):
        self.subject = create_subject('CM2')
        self.session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.session, self.subject)

        self.london = create_tutorial_location(name='London', code='LON')
        self.tutorial_sp = create_tutorial_product(
            self.ess, location=self.london, fmt='LO_6H',
        )

        self.mm_template = create_marking_template(code='MM1', name='Mock Marking 1')
        self.marking_sp = create_marking_product(
            self.ess, template=self.mm_template,
        )

        self.service = SearchService()

    def test_tutorial_searchable_text_includes_location_name(self):
        """Searchable text for a tutorial row must contain the location
        name so 'London' is matchable."""
        text = self.service._build_searchable_text(self.tutorial_sp)
        self.assertIn('london', text.lower())

    def test_tutorial_searchable_text_includes_format_display(self):
        """Searchable text for a tutorial row must contain the format's
        human-readable display so 'live online' is matchable."""
        text = self.service._build_searchable_text(self.tutorial_sp)
        self.assertIn('live online', text.lower())

    def test_marking_searchable_text_includes_template_name(self):
        """Searchable text for a marking row must contain the template name."""
        text = self.service._build_searchable_text(self.marking_sp)
        self.assertIn('mock marking', text.lower())

    def test_fuzzy_score_finds_tutorial_by_location(self):
        """A fuzzy search for 'london' must score the London tutorial
        above the min_fuzzy_score threshold so it appears in results."""
        text = self.service._build_searchable_text(self.tutorial_sp)
        score = self.service._calculate_fuzzy_score('london', text, self.tutorial_sp)
        self.assertGreaterEqual(score, self.service.min_fuzzy_score,
            f"Score {score} should clear the {self.service.min_fuzzy_score} "
            "threshold so 'London' search returns the London tutorial.")

    def test_fuzzy_score_finds_marking_by_template_name(self):
        """A fuzzy search for 'mock marking' must score the Mock Marking
        template above the min_fuzzy_score threshold."""
        text = self.service._build_searchable_text(self.marking_sp)
        score = self.service._calculate_fuzzy_score(
            'mock marking', text, self.marking_sp,
        )
        self.assertGreaterEqual(score, self.service.min_fuzzy_score,
            f"Score {score} should clear {self.service.min_fuzzy_score} "
            "so 'mock marking' search returns the mock-marking product.")
