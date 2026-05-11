"""Tests for the `backfill_tutorial_filter_groups` management command.

The command moves Tutorial PPGs from the Tutorial parent group to the
appropriate leaf child (Face-to-face / Live Online / Online Classroom)
based on the PPV's variation_code prefix:

    F2F_*  →  Face-to-face       (matches both F2F_5F and F2F_1PD)
    LO_*   →  Live Online        (matches both LO_5B and LO_1PD)
    OC     →  Online Classroom   (the literal code 'OC' with no underscore)

It also assigns orphaned Tutorial PPVs (those with zero rows in
filter_product_product_groups) to the correct leaf.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from filtering.models import FilterGroup, ProductProductGroup


def _mk_tutorial_ppv(code, *, variation_type='Tutorial'):
    """Helper: build a Tutorial PPV with the given variation_code."""
    cp = CatalogProduct.objects.create(
        fullname=f'P-{code}', shortname=f'P-{code}', code=f'P-{code}', is_active=True,
    )
    pv = ProductVariation.objects.create(
        variation_type=variation_type, name=code, code=code, is_active=True,
    )
    return ProductProductVariation.objects.create(
        product=cp, product_variation=pv, is_active=True,
    )


class BackfillTutorialFilterGroupsTests(TestCase):
    def setUp(self):
        # The 4-level Tutorial hierarchy we expect to write into
        self.tutorial = FilterGroup.objects.create(
            name='Tutorial', code='tutorial', is_active=True,
        )
        self.f2f = FilterGroup.objects.create(
            name='Face-to-face', code='face_to_face',
            parent=self.tutorial, is_active=True,
        )
        self.lo = FilterGroup.objects.create(
            name='Live Online', code='live_online',
            parent=self.tutorial, is_active=True,
        )
        self.oc = FilterGroup.objects.create(
            name='Online Classroom', code='online_classroom',
            parent=self.tutorial, is_active=True,
        )

        # Three orphans, one per prefix
        self.orphan_f2f = _mk_tutorial_ppv('F2F_5F')
        self.orphan_lo = _mk_tutorial_ppv('LO_6H')
        self.orphan_oc = _mk_tutorial_ppv('OC')

        # One Tutorial PPV already (incorrectly) tagged at the PARENT level
        # — the command must move this row down to its proper leaf.
        self.parent_tagged = _mk_tutorial_ppv('F2F_1F')
        ProductProductGroup.objects.create(
            product_product_variation=self.parent_tagged,
            product_group=self.tutorial,  # ← stranded at parent
        )

        # A NON-Tutorial PPV that must not be touched (regression guard)
        self.material_ppv = _mk_tutorial_ppv('C', variation_type='eBook')

    # ──────────────────────────────────────────────────────────────────────
    # Core behavior: orphans get assigned to the correct leaf
    # ──────────────────────────────────────────────────────────────────────
    def test_f2f_orphan_assigned_to_face_to_face(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        self.assertTrue(ProductProductGroup.objects.filter(
            product_product_variation=self.orphan_f2f,
            product_group=self.f2f,
        ).exists())

    def test_lo_orphan_assigned_to_live_online(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        self.assertTrue(ProductProductGroup.objects.filter(
            product_product_variation=self.orphan_lo,
            product_group=self.lo,
        ).exists())

    def test_oc_orphan_assigned_to_online_classroom(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        self.assertTrue(ProductProductGroup.objects.filter(
            product_product_variation=self.orphan_oc,
            product_group=self.oc,
        ).exists())

    # ──────────────────────────────────────────────────────────────────────
    # Re-tag behavior: parent-level rows get moved to their leaf
    # ──────────────────────────────────────────────────────────────────────
    def test_parent_tagged_ppv_gets_moved_to_leaf(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())

        # Should now sit on the leaf (Face-to-face), not the parent (Tutorial)
        self.assertTrue(ProductProductGroup.objects.filter(
            product_product_variation=self.parent_tagged,
            product_group=self.f2f,
        ).exists())
        self.assertFalse(ProductProductGroup.objects.filter(
            product_product_variation=self.parent_tagged,
            product_group=self.tutorial,
        ).exists())

    # ──────────────────────────────────────────────────────────────────────
    # Safety: idempotent, dry-run, regression guard, malformed input
    # ──────────────────────────────────────────────────────────────────────
    def test_idempotent_no_duplicates_on_second_run(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        before = ProductProductGroup.objects.count()
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        after = ProductProductGroup.objects.count()
        self.assertEqual(before, after)

    def test_dry_run_does_not_write(self):
        before = ProductProductGroup.objects.count()
        call_command(
            'backfill_tutorial_filter_groups', '--dry-run', stdout=StringIO(),
        )
        after = ProductProductGroup.objects.count()
        self.assertEqual(before, after)

    def test_non_tutorial_ppvs_are_left_alone(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        # The eBook PPV must not have been assigned to any tutorial leaf
        self.assertFalse(ProductProductGroup.objects.filter(
            product_product_variation=self.material_ppv,
        ).exists())

    def test_unknown_prefix_is_skipped_not_crashed(self):
        oddball = _mk_tutorial_ppv('XYZ_99')  # unknown prefix
        out = StringIO()
        call_command('backfill_tutorial_filter_groups', stdout=out)
        # No assignment made
        self.assertFalse(ProductProductGroup.objects.filter(
            product_product_variation=oddball,
        ).exists())
        # And the command surfaced the skip in its output
        self.assertIn('XYZ_99', out.getvalue())

    # ──────────────────────────────────────────────────────────────────────
    # Aggregate sanity: after one run, every Tutorial PPV has a leaf row
    # and no Tutorial PPV is still pinned to the bare parent.
    # ──────────────────────────────────────────────────────────────────────
    def test_all_known_tutorial_ppvs_end_up_at_leaf(self):
        call_command('backfill_tutorial_filter_groups', stdout=StringIO())
        known_ppvs = [
            self.orphan_f2f, self.orphan_lo, self.orphan_oc, self.parent_tagged,
        ]
        leaf_ids = {self.f2f.id, self.lo.id, self.oc.id}
        for ppv in known_ppvs:
            rows = ProductProductGroup.objects.filter(product_product_variation=ppv)
            self.assertTrue(rows.exists(), f"ppv={ppv} got no row")
            self.assertTrue(
                all(r.product_group_id in leaf_ids for r in rows),
                f"ppv={ppv} has a non-leaf assignment: "
                f"{[r.product_group_id for r in rows]}",
            )
