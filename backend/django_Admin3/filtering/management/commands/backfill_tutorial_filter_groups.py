"""Move Tutorial PPGs from the Tutorial parent group to the appropriate
leaf child (Face-to-face / Live Online / Online Classroom) based on the
PPV's variation_code prefix. Also assigns orphaned Tutorial PPVs.

Why this exists
---------------
The catalog's nav-bar Tutorial dropdown was empty for the
Face-to-face / Live Online / Online Classroom sub-slots because:

* 20 existing rows in filter_product_product_groups pointed at the
  Tutorial PARENT (id=3) rather than at the leaf children the
  dropdown queries by (id=9, 10, 11).
* 35 active Tutorial PPVs had NO row at all (orphans).

The mapping rule is deterministic from variation_code:

    F2F_*  →  Face-to-face       (code=face_to_face)
    LO_*   →  Live Online        (code=live_online)
    OC     →  Online Classroom   (code=online_classroom)

Usage
-----
    python manage.py backfill_tutorial_filter_groups            # apply changes
    python manage.py backfill_tutorial_filter_groups --dry-run  # report only
"""
from __future__ import annotations

from typing import Optional

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.products.models import ProductProductVariation
from filtering.models import FilterGroup, ProductProductGroup


# Prefix → FilterGroup.code mapping. The codes match the actual DB rows
# under the Tutorial parent (see filtering.FilterGroup).
PREFIX_TO_LEAF_CODE = {
    'F2F': 'face_to_face',
    'LO':  'live_online',
    'OC':  'online_classroom',
}


def _prefix_for(variation_code: Optional[str]) -> Optional[str]:
    """Return the matching prefix key from PREFIX_TO_LEAF_CODE, or None.

    Handles three shapes seen in production:
        'F2F_5F'  → 'F2F'  (split on underscore)
        'LO_1PD'  → 'LO'
        'OC'      → 'OC'   (literal, no underscore)
    """
    if not variation_code:
        return None
    head = variation_code.split('_', 1)[0]
    return head if head in PREFIX_TO_LEAF_CODE else None


class Command(BaseCommand):
    help = (
        "Backfill filter_product_product_groups for Tutorial variations. "
        "Moves parent-level rows to leaf children and assigns orphans, "
        "using variation_code prefix (F2F_/LO_/OC) for the mapping."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would change without writing.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Load leaf groups once. If any are missing we still proceed for the
        # others — the command should keep working under partial schema.
        leaves: dict[str, Optional[FilterGroup]] = {
            prefix: FilterGroup.objects.filter(code=leaf_code).first()
            for prefix, leaf_code in PREFIX_TO_LEAF_CODE.items()
        }
        for prefix, group in leaves.items():
            if group is None:
                self.stdout.write(self.style.WARNING(
                    f"Leaf group with code={PREFIX_TO_LEAF_CODE[prefix]!r} "
                    f"not found; prefix {prefix} will be skipped."
                ))

        tutorial_parent = FilterGroup.objects.filter(code='tutorial').first()

        # Only Tutorial PPVs are in scope. variation_type is the discriminator.
        tutorial_ppvs = (
            ProductProductVariation.objects
            .filter(product_variation__variation_type='Tutorial')
            .select_related('product_variation')
        )

        assigned = 0
        moved = 0
        skipped_unknown_prefix = []
        skipped_missing_leaf = 0
        already_correct = 0

        # All writes happen inside one transaction so a mid-run crash
        # doesn't leave the table half-rewritten.
        with transaction.atomic():
            for ppv in tutorial_ppvs:
                code = ppv.product_variation.code if ppv.product_variation else None
                prefix = _prefix_for(code)
                if prefix is None:
                    skipped_unknown_prefix.append(
                        (ppv.id, code or '<None>')
                    )
                    continue

                leaf = leaves[prefix]
                if leaf is None:
                    skipped_missing_leaf += 1
                    continue

                # Is there already a row at the correct leaf?
                already = ProductProductGroup.objects.filter(
                    product_product_variation=ppv, product_group=leaf,
                ).exists()

                # Is there a stale row at the Tutorial parent that we need
                # to clear out?
                stale_parent_row = None
                if tutorial_parent is not None:
                    stale_parent_row = ProductProductGroup.objects.filter(
                        product_product_variation=ppv,
                        product_group=tutorial_parent,
                    ).first()

                if already and stale_parent_row is None:
                    already_correct += 1
                    continue

                if not dry_run:
                    if not already:
                        ProductProductGroup.objects.create(
                            product_product_variation=ppv, product_group=leaf,
                        )
                    if stale_parent_row is not None:
                        stale_parent_row.delete()

                if stale_parent_row is not None:
                    moved += 1
                else:
                    assigned += 1

            # Dry-run: don't actually commit even on success
            if dry_run:
                transaction.set_rollback(True)

        # Report
        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Tutorial backfill complete:"
        ))
        self.stdout.write(f"  assigned (new leaf rows):     {assigned}")
        self.stdout.write(f"  moved (parent → leaf):        {moved}")
        self.stdout.write(f"  already correct (no-op):      {already_correct}")
        if skipped_missing_leaf:
            self.stdout.write(self.style.WARNING(
                f"  skipped (target leaf missing): {skipped_missing_leaf}"
            ))
        if skipped_unknown_prefix:
            self.stdout.write(self.style.WARNING(
                f"  skipped (unknown variation_code prefix): "
                f"{len(skipped_unknown_prefix)}"
            ))
            for ppv_id, code in skipped_unknown_prefix[:10]:
                self.stdout.write(f"    ppv_id={ppv_id}  code={code!r}")
            if len(skipped_unknown_prefix) > 10:
                self.stdout.write(
                    f"    … and {len(skipped_unknown_prefix) - 10} more"
                )
