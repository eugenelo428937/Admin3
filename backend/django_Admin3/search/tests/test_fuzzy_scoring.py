"""Tests for weighted composite fuzzy scoring (US1).

Validates that the weighted formula:
    score = 0.15 * subject_bonus + 0.40 * token_sort + 0.25 * partial_name + 0.20 * token_set

produces correct ranking behavior, replacing the old max(scores) approach.
"""
from django.test import TestCase
from unittest.mock import patch, MagicMock

from search.services.search_service import SearchService
from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
)


class WeightedScoringFormulaTest(TestCase):
    """Test that _calculate_fuzzy_score uses weighted composite formula."""

    def setUp(self):
        self.service = SearchService()
        # Create catalog dependencies for CS2
        self.subject_cs2 = create_subject('CS2')
        self.exam_session = create_exam_session('2025-04')
        self.ess_cs2 = create_exam_session_subject(self.exam_session, self.subject_cs2)

        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')

        # CS2 Additional Mock Exam Marking
        self.mock_exam_product = create_catalog_product(
            fullname='CS2 Additional Mock Exam Marking',
            shortname='CS2 Additional Mock Exam Marking',
            code='MOCK01',
        )
        self.sp_mock = create_store_product(
            self.ess_cs2, self.mock_exam_product, self.printed,
            product_code='CS2/PMOCK01/2025-04',
        )

        # CS2 Course Notes
        self.course_notes_product = create_catalog_product(
            fullname='CS2 Course Notes',
            shortname='CS2 Course Notes',
            code='CN01',
        )
        self.sp_notes = create_store_product(
            self.ess_cs2, self.course_notes_product, self.printed,
            product_code='CS2/PCN01/2025-04',
        )

    def test_composite_score_uses_weights(self):
        """Score uses weights: 0.15 subject + 0.40 token_sort + 0.25 partial_name + 0.20 token_set (R1)."""
        query = 'cs2 addition mock'
        searchable_mock = self.service._build_searchable_text(self.sp_mock)
        searchable_notes = self.service._build_searchable_text(self.sp_notes)

        score_mock = self.service._calculate_fuzzy_score(query, searchable_mock, self.sp_mock)
        score_notes = self.service._calculate_fuzzy_score(query, searchable_notes, self.sp_notes)

        # Verify scores are within 0-100 range
        self.assertGreaterEqual(score_mock, 0)
        self.assertLessEqual(score_mock, 100)
        self.assertGreaterEqual(score_notes, 0)
        self.assertLessEqual(score_notes, 100)

        # The key assertion: under weighted scoring, the mock exam product
        # should NOT score the same as course notes. max(scores) gives both 95.
        self.assertNotEqual(score_mock, score_notes,
                            "Weighted scoring must differentiate products (not max())")

    def test_sc001_mock_exam_ranks_above_course_notes(self):
        """SC-001: For 'CS2 addition mock', mock exam product scores higher than course notes."""
        query = 'cs2 addition mock'
        searchable_mock = self.service._build_searchable_text(self.sp_mock)
        searchable_notes = self.service._build_searchable_text(self.sp_notes)

        score_mock = self.service._calculate_fuzzy_score(query, searchable_mock, self.sp_mock)
        score_notes = self.service._calculate_fuzzy_score(query, searchable_notes, self.sp_notes)

        self.assertGreater(score_mock, score_notes,
                           f"Mock exam ({score_mock}) should rank above course notes ({score_notes})")

    def test_study_text_is_top_result(self):
        """For 'CM2 study text', study text product is top result."""
        subject_cm2 = create_subject('CM2')
        ess_cm2 = create_exam_session_subject(self.exam_session, subject_cm2)

        study_text = create_catalog_product(
            fullname='CM2 Study Text', shortname='CM2 Study Text', code='ST01',
        )
        sp_study = create_store_product(
            ess_cm2, study_text, self.printed, product_code='CM2/PST01/2025-04',
        )

        other_product = create_catalog_product(
            fullname='CM2 Course Notes', shortname='CM2 Course Notes', code='CN02',
        )
        sp_other = create_store_product(
            ess_cm2, other_product, self.printed, product_code='CM2/PCN02/2025-04',
        )

        query = 'cm2 study text'
        score_study = self.service._calculate_fuzzy_score(
            query, self.service._build_searchable_text(sp_study), sp_study)
        score_other = self.service._calculate_fuzzy_score(
            query, self.service._build_searchable_text(sp_other), sp_other)

        self.assertGreater(score_study, score_other,
                           f"Study text ({score_study}) should rank above course notes ({score_other})")

    def test_subject_bonus_does_not_dominate(self):
        """FR-001: Subject-code-only bonus does not dominate when content relevance differs."""
        query = 'cs2 addition mock'
        searchable_mock = self.service._build_searchable_text(self.sp_mock)
        searchable_notes = self.service._build_searchable_text(self.sp_notes)

        score_mock = self.service._calculate_fuzzy_score(query, searchable_mock, self.sp_mock)
        score_notes = self.service._calculate_fuzzy_score(query, searchable_notes, self.sp_notes)

        # Both have subject bonus, but mock exam has much better content match.
        # With max(), both get 95. With weighted scoring, there should be a meaningful gap.
        gap = score_mock - score_notes
        self.assertGreater(gap, 5,
                           f"Weighted scoring should produce meaningful gap ({gap}) between "
                           f"highly relevant ({score_mock}) and less relevant ({score_notes})")

    def test_score_range_0_to_100(self):
        """FR-004: Score range remains 0-100."""
        query = 'cs2 addition mock'
        searchable = self.service._build_searchable_text(self.sp_mock)

        score = self.service._calculate_fuzzy_score(query, searchable, self.sp_mock)

        self.assertGreaterEqual(score, 0, "Score must be >= 0")
        self.assertLessEqual(score, 100, "Score must be <= 100")

    def test_irrelevant_product_below_threshold(self):
        """FR-003, R2: Irrelevant products fall below threshold of 45."""
        # Create a totally unrelated product
        subject_sa = create_subject('SA1')
        ess_sa = create_exam_session_subject(self.exam_session, subject_sa)
        unrelated = create_catalog_product(
            fullname='SA1 Life Insurance Principles',
            shortname='SA1 Life Insurance',
            code='LI01',
        )
        sp_unrelated = create_store_product(
            ess_sa, unrelated, self.printed, product_code='SA1/PLI01/2025-04',
        )

        query = 'cs2 addition mock'
        searchable = self.service._build_searchable_text(sp_unrelated)
        score = self.service._calculate_fuzzy_score(query, searchable, sp_unrelated)

        self.assertLess(score, 45,
                        f"Irrelevant product scored {score}, should be below threshold of 45")

    def test_no_subject_prefix_ranks_on_content(self):
        """Edge case: Query with no subject code ranks purely on content relevance."""
        query = 'additional mock exam marking'
        searchable_mock = self.service._build_searchable_text(self.sp_mock)
        searchable_notes = self.service._build_searchable_text(self.sp_notes)

        score_mock = self.service._calculate_fuzzy_score(query, searchable_mock, self.sp_mock)
        score_notes = self.service._calculate_fuzzy_score(query, searchable_notes, self.sp_notes)

        # Without subject prefix, content relevance should still rank mock exam higher
        self.assertGreater(score_mock, score_notes,
                           "Content-only relevance should rank mock exam above course notes")

    def test_only_subject_code_returns_all_subject_products(self):
        """Edge case: Query with only subject code returns all products for that subject."""
        query = 'cs2'
        searchable_mock = self.service._build_searchable_text(self.sp_mock)
        searchable_notes = self.service._build_searchable_text(self.sp_notes)

        score_mock = self.service._calculate_fuzzy_score(query, searchable_mock, self.sp_mock)
        score_notes = self.service._calculate_fuzzy_score(query, searchable_notes, self.sp_notes)

        # Both CS2 products should pass the threshold of 45
        self.assertGreaterEqual(score_mock, 45,
                                f"CS2 mock exam ({score_mock}) should pass threshold for query 'cs2'")
        self.assertGreaterEqual(score_notes, 45,
                                f"CS2 course notes ({score_notes}) should pass threshold for query 'cs2'")
