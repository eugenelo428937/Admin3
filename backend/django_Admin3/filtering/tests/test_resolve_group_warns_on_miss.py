"""Layer 3: silent fail-open observability.

ProductFilterService._resolve_group_ids_with_hierarchy() returns an
empty set when none of the requested group names match a FilterGroup.
apply_store_product_filters() then silently drops the WHERE clause and
returns ALL products instead of zero — masking name-mismatch bugs.

This change does NOT alter the fail-open behavior yet (the user chose
log-only for this layer). It only asserts that a WARNING is emitted so
future regressions are visible in logs.
"""
import logging

from django.test import TestCase

from filtering.models import FilterGroup
from filtering.services.filter_service import ProductFilterService


class ResolveGroupWarnsOnMissTests(TestCase):
    def test_warning_logged_when_no_names_match(self):
        """All names unresolvable → WARNING log emitted naming the missing names."""
        FilterGroup.objects.create(name='Material', code='material', is_active=True)

        with self.assertLogs(
            'filtering.services.filter_service', level='WARNING'
        ) as captured:
            resolved = ProductFilterService._resolve_group_ids_with_hierarchy(
                ['Definitely Not A Group', 'Also Missing']
            )

        # Resolution still returns empty set (behavior unchanged)
        self.assertEqual(resolved, set())

        # But now there's a warning surface for the missing names
        joined = "\n".join(captured.output)
        self.assertIn('Definitely Not A Group', joined)
        self.assertIn('Also Missing', joined)

    def test_no_warning_when_at_least_one_name_resolves(self):
        """Partial match is not a bug — don't spam logs."""
        FilterGroup.objects.create(name='Material', code='material', is_active=True)

        logger = logging.getLogger('filtering.services.filter_service')
        # Capture but expect no WARNING records for this call
        with self.assertNoLogs(
            'filtering.services.filter_service', level='WARNING'
        ):
            resolved = ProductFilterService._resolve_group_ids_with_hierarchy(
                ['Material']  # this DOES resolve → no warning expected
            )
        self.assertTrue(resolved)  # contains at least Material's id

    def test_no_warning_for_empty_input(self):
        """Empty input is a no-op, not a bug."""
        with self.assertNoLogs(
            'filtering.services.filter_service', level='WARNING'
        ):
            resolved = ProductFilterService._resolve_group_ids_with_hierarchy([])
        self.assertEqual(resolved, set())
