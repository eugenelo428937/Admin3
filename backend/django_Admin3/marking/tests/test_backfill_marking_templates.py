"""Tests for the Phase 2 marking-template backfill data migration.

Verifies the migration creates one MarkingTemplate per distinct
catalog.Product referenced by a Marking PPV, preserving (code, name)
distinctions and using catalog_product.id as the MarkingTemplate PK.

Strategy: we call the migration's forward function directly against
the live DB rather than reversing/reapplying the migration. This
means the test DB already has MarkingTemplate rows from the real
migration run during test-DB setup. The tests are written to be
robust against that: they check DELTAS, not absolute counts.
"""
import importlib

from django.apps import apps as django_apps
from django.test import TestCase


def _load_backfill_module():
    """Migration modules start with a digit, so plain `from ... import`
    doesn't work — use importlib."""
    return importlib.import_module(
        'marking.migrations.0019_backfill_marking_templates'
    )


class BackfillMarkingTemplatesTests(TestCase):
    # Plan called for TransactionTestCase but FK teardown on the dev DB
    # (filter_configurations -> auth_user) crashes the flush. TestCase
    # is safe here because:
    #   1. The forward function uses standard ORM create() with no raw
    #      SQL or explicit BEGIN/COMMIT, so nested savepoints work.
    #   2. We call the forward function directly (not via migrate), so
    #      no migration-level transaction wrapping is introduced.
    #   3. TestCase rolls back via SAVEPOINT ROLLBACK at test boundaries,
    #      which gives full per-test isolation even with the live
    #      django.apps registry.

    def _fixture_catalog_marking_rows(self):
        """Create three distinct catalog rows + PPVs referencing them.

        Returns the three catalog Product instances. Two share
        code='ZTEST_M' with distinct shortnames — the case that
        motivates the composite (code, name) UC.
        """
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        # Use sentinel codes that won't collide with the dev DB's
        # real marking templates (M, M1, M2, M3, X, Y).
        cp_mock = CatalogProduct.objects.create(
            code='ZTEST_M', shortname='Mock Exam Marking',
            fullname='Mock Exam Marking',
        )
        cp_practice = CatalogProduct.objects.create(
            code='ZTEST_M', shortname='Practice Exam Marking',
            fullname='Practice Exam Marking',
        )
        cp_x = CatalogProduct.objects.create(
            code='ZTEST_X', shortname='X Marking', fullname='X Marking',
        )
        # Find or create a Marking-type variation so the PPVs are
        # discoverable by the migration's filter.
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Marking',
            name='Marking',
            defaults={'code': 'M', 'is_active': True},
        )
        for cp in (cp_mock, cp_practice, cp_x):
            ProductProductVariation.objects.create(
                product=cp, product_variation=pv, is_active=True,
            )
        return cp_mock, cp_practice, cp_x

    def test_backfill_creates_one_template_per_new_catalog_row(self):
        """Adding 3 distinct catalog rows produces 3 new MarkingTemplate
        rows (delta, not absolute count — the DB already has rows
        from the migration run at test-DB setup time)."""
        from marking.models import MarkingTemplate

        before = MarkingTemplate.objects.count()
        cp_mock, cp_practice, cp_x = self._fixture_catalog_marking_rows()

        backfill = _load_backfill_module()
        backfill.create_marking_templates(apps=django_apps, schema_editor=None)

        after = MarkingTemplate.objects.count()
        self.assertEqual(after - before, 3,
                         f'Expected 3 new rows, got {after - before}')

        # PK mapping is 1:1 with catalog.Product.id
        mt_mock = MarkingTemplate.objects.get(pk=cp_mock.pk)
        self.assertEqual(mt_mock.code, 'ZTEST_M')
        self.assertEqual(mt_mock.name, 'Mock Exam Marking')

        mt_practice = MarkingTemplate.objects.get(pk=cp_practice.pk)
        self.assertEqual(mt_practice.code, 'ZTEST_M')
        self.assertEqual(mt_practice.name, 'Practice Exam Marking')

        # Both rows preserved despite same code (composite UC)
        self.assertEqual(
            MarkingTemplate.objects.filter(code='ZTEST_M').count(), 2
        )

    def test_backfill_is_idempotent(self):
        """Re-running the migration produces no additional rows AND
        leaves existing rows untouched (snapshot comparison)."""
        from marking.models import MarkingTemplate

        self._fixture_catalog_marking_rows()
        backfill = _load_backfill_module()

        backfill.create_marking_templates(apps=django_apps, schema_editor=None)
        templates_after_first = list(
            MarkingTemplate.objects
            .order_by('pk')
            .values('pk', 'code', 'name', 'description', 'is_active')
        )

        backfill.create_marking_templates(apps=django_apps, schema_editor=None)
        templates_after_second = list(
            MarkingTemplate.objects
            .order_by('pk')
            .values('pk', 'code', 'name', 'description', 'is_active')
        )

        self.assertEqual(
            templates_after_first, templates_after_second,
            'Re-running backfill must leave row count AND row contents unchanged',
        )
