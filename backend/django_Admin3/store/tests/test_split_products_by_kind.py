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
        for kind in ('material', 'tutorial', 'marking', 'unresolved'):
            self.assertIn(kind, output.lower())
        self.assertIn('total', output.lower())


class SplitProductsCommitModeStillUnimplementedTests(TestCase):
    """--commit still raises CommandError until Task 6 lands."""

    def test_commit_mode_raises_command_error(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError) as cm:
            call_command('split_products_by_kind', '--commit')
        self.assertIn('Task 6', str(cm.exception))


class SplitProductsCheckModeTests(TestCase):
    """--check mode reports unmappable rows. Writes nothing."""

    def test_check_writes_nothing(self):
        from store.models import (
            MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )
        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_check_reports_tutorial_format_mapping_status(self):
        """Output names tutorial-format coverage and any unmapped codes."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        self.assertIn('format', output.lower())

    def test_check_reports_marking_template_coverage(self):
        """Output reports whether every Marking PPV product_id has a
        matching MarkingTemplate row."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        self.assertIn('marking_template', output.lower())


class BuildTemplateCodeTests(TestCase):
    """Direct tests for the (subject, format) -> template_code helper.

    Independent of DB state — the helper is pure string mapping.
    """

    def setUp(self):
        from store.management.commands.split_products_by_kind import Command
        self.fn = Command._build_template_code

    def test_oc_returns_oc_subject(self):
        self.assertEqual(self.fn('CB1', 'OC'), 'OC_CB1')
        self.assertEqual(self.fn('CM2', 'OC'), 'OC_CM2')

    def test_f2f_strips_letter_suffix(self):
        self.assertEqual(self.fn('CB1', 'F2F_1F'), 'CB1_f2f_1')
        self.assertEqual(self.fn('CB1', 'F2F_3F'), 'CB1_f2f_3')
        self.assertEqual(self.fn('CB1', 'F2F_5B'), 'CB1_f2f_5')
        self.assertEqual(self.fn('CB1', 'F2F_6H'), 'CB1_f2f_6')
        self.assertEqual(self.fn('SP6', 'F2F_1PD'), 'SP6_f2f_1')

    def test_lo_strips_letter_suffix(self):
        self.assertEqual(self.fn('CB1', 'LO_3F'), 'CB1_LO_3')
        self.assertEqual(self.fn('CB1', 'LO_2H'), 'CB1_LO_2')
        self.assertEqual(self.fn('CM2', 'LO_10H'), 'CM2_LO_10')
        self.assertEqual(self.fn('SP6', 'LO_1PD'), 'SP6_LO_1')

    def test_unknown_format_returns_none(self):
        self.assertIsNone(self.fn('CB1', 'UNKNOWN'))
        self.assertIsNone(self.fn('CB1', 'BUNDLE'))

    def test_numeric_suffix_edge_cases(self):
        from store.management.commands.split_products_by_kind import Command
        self.assertEqual(Command._numeric_suffix('10H'), '10')
        self.assertEqual(Command._numeric_suffix('1PD'), '1')
        self.assertEqual(Command._numeric_suffix('F'), '')
        self.assertEqual(Command._numeric_suffix(''), '')
