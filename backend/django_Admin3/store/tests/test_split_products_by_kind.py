"""Tests for the split_products_by_kind management command.

Phase 2 of the Product MTI specialization. The command walks every
store.Product and creates one MaterialProduct / TutorialProduct /
MarkingProduct row per existing Product, reassigning Purchasable.kind
away from 'product'.
"""
from io import StringIO
from django.core.management import call_command
from django.test import TestCase


class SplitProductsDryRunTests(TestCase):
    """--dry-run mode walks the data but writes nothing."""

    def test_command_is_registered(self):
        from django.core.management import get_commands
        self.assertIn('split_products_by_kind', get_commands())

    def test_dry_run_writes_nothing(self):
        """No new MaterialProduct/TutorialProduct/MarkingProduct rows
        are created; no Purchasable.kind is changed."""
        from store.models import (
            Product, MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )

        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_dry_run_prints_per_kind_tally(self):
        """The stdout includes a count per resolved kind."""
        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)
        output = out.getvalue()
        # The tally lines use the kind names directly
        for kind in ('material', 'tutorial', 'marking'):
            self.assertIn(kind, output.lower())
        # The summary includes a total
        self.assertIn('total', output.lower())
