"""Tests for catalog search endpoint ranking accuracy.

Validates that /api/catalog/search/ uses weighted composite scoring
(same as SearchService._calculate_fuzzy_score) so that subject-specific
queries rank the correct subject's products first.

Bug: The catalog search endpoint used max(scores) which caused all products
with the same name (e.g., "Course Notes") to score identically, regardless
of whether the query contained a specific subject code.
"""
import unittest
from django.test import TestCase
from rest_framework.test import APIClient

from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
)


def trigram_extension_available():
    """Check if pg_trgm extension is available."""
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'")
            return cursor.fetchone() is not None
    except Exception:
        return False


@unittest.skipUnless(trigram_extension_available(), "Requires PostgreSQL pg_trgm extension")
class TestCatalogSearchRanking(TestCase):
    """Test that /api/catalog/search/ ranks subject-specific queries correctly."""

    def setUp(self):
        self.client = APIClient()

        # Create two subjects
        self.subject_cs1 = create_subject('CS1', description='Actuarial Statistics')
        self.subject_cb1 = create_subject('CB1', description='Business Finance')

        # Create a shared exam session
        self.session = create_exam_session('2025-04')
        self.ess_cs1 = create_exam_session_subject(self.session, self.subject_cs1)
        self.ess_cb1 = create_exam_session_subject(self.session, self.subject_cb1)

        # Create the same catalog product for both subjects (e.g., "Course Notes")
        self.cat_notes = create_catalog_product(
            'Course Notes', 'Course Notes', 'CN01'
        )
        self.variation = create_product_variation('eBook', 'VitalSource eBook', code='E')

        # Create store products for both subjects
        self.sp_cs1_notes = create_store_product(
            self.ess_cs1, self.cat_notes, self.variation,
            product_code='CS1/CN/2025-04',
        )
        self.sp_cb1_notes = create_store_product(
            self.ess_cb1, self.cat_notes, self.variation,
            product_code='CB1/CN/2025-04',
        )

    def test_subject_specific_query_ranks_correct_subject_first(self):
        """Searching 'cs1 course notes' should rank CS1 Course Notes above CB1 Course Notes."""
        response = self.client.get('/api/catalog/search/', {'q': 'cs1 course notes'})

        self.assertEqual(response.status_code, 200)
        products = response.json()['suggested_products']

        # Must have results
        self.assertGreater(len(products), 0, "Should return matching products")

        # First result should be CS1
        first_subject = products[0].get('subject_code')
        self.assertEqual(
            first_subject, 'CS1',
            f"Expected CS1 first, got {first_subject}. "
            f"Full results: {[(p.get('subject_code'), p.get('product_short_name')) for p in products]}"
        )

    def test_different_subject_query_ranks_that_subject_first(self):
        """Searching 'cb1 course notes' should rank CB1 Course Notes above CS1 Course Notes."""
        response = self.client.get('/api/catalog/search/', {'q': 'cb1 course notes'})

        self.assertEqual(response.status_code, 200)
        products = response.json()['suggested_products']

        self.assertGreater(len(products), 0)
        first_subject = products[0].get('subject_code')
        self.assertEqual(
            first_subject, 'CB1',
            f"Expected CB1 first, got {first_subject}. "
            f"Full results: {[(p.get('subject_code'), p.get('product_short_name')) for p in products]}"
        )

    def test_subject_code_only_query_ranks_that_subject_first(self):
        """Searching just 'cs1' should rank CS1 products above CB1 products."""
        response = self.client.get('/api/catalog/search/', {'q': 'cs1'})

        self.assertEqual(response.status_code, 200)
        products = response.json()['suggested_products']

        if len(products) > 0:
            first_subject = products[0].get('subject_code')
            self.assertEqual(
                first_subject, 'CS1',
                f"Expected CS1 first for query 'cs1', got {first_subject}"
            )
