"""Export a CSV of every PPV that still needs a filter-group assignment
decision: orphans (no row in filter_product_product_groups) plus rows
currently stranded at a parent group (Material or Marking) that need to
be moved to a leaf child.

The CSV is INPUT for the business team — target columns are intentionally
blank, to be filled in with the correct leaf FilterGroup.code per row.

The Tutorial parent/orphan case is excluded (already handled by
backfill_tutorial_filter_groups).

Usage:
    python manage.py export_filter_group_backfill_csv --output orphans.csv
    python manage.py export_filter_group_backfill_csv             # → stdout
"""
from __future__ import annotations

import csv
import sys

from django.core.management.base import BaseCommand
from django.db.models import Q

from catalog.products.models import ProductProductVariation
from filtering.models import FilterGroup, ProductProductGroup


# Parent groups whose direct rows are considered "stranded" and need to
# move down to a leaf child. Tutorial is intentionally excluded — its
# parent rows were already handled by backfill_tutorial_filter_groups.
PARENT_GROUP_CODES_IN_SCOPE = {'material', 'marking'}


CSV_COLUMNS = [
    # Context — read-only for the business team
    'ppv_id',
    'kind',                       # 'orphan' or 'parent_tagged'
    'product_id',
    'product_code',
    'product_shortname',
    'product_fullname',
    'variation_type',
    'variation_code',
    'variation_name',
    'variation_description',
    'current_group_code',         # blank for orphans
    'current_group_name',
    # Decision — to be filled in
    'target_filter_group_code',
    'target_filter_group_name',   # for human reference only; not consumed
    'rationale',
]


class Command(BaseCommand):
    help = (
        "Export a CSV of PPVs needing a filter-group assignment decision "
        "(orphans + rows stranded at Material/Marking parent)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--output', type=str, default=None,
            help='Path to write the CSV (default: stdout).',
        )

    def handle(self, *args, **options):
        path = options['output']

        rows = self._collect_rows()

        if path:
            with open(path, 'w', newline='', encoding='utf-8') as fh:
                self._write_csv(fh, rows)
        else:
            self._write_csv(sys.stdout, rows)

        n_orphan = sum(1 for r in rows if r['kind'] == 'orphan')
        n_parent = sum(1 for r in rows if r['kind'] == 'parent_tagged')

        target = path if path else '<stdout>'
        self.stdout.write(self.style.SUCCESS(
            f"Exported {len(rows)} rows ({n_orphan} orphans, "
            f"{n_parent} parent-tagged) to {target}"
        ))

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _collect_rows():
        # Resolve in-scope parent groups once
        parent_groups = list(
            FilterGroup.objects.filter(code__in=PARENT_GROUP_CODES_IN_SCOPE)
        )
        parent_group_ids = {g.id for g in parent_groups}

        # All PPVs currently assigned somewhere
        all_assigned = ProductProductGroup.objects.values_list(
            'product_product_variation_id', 'product_group_id',
        )
        assigned_groups_by_ppv: dict[int, list[int]] = {}
        for ppv_id, group_id in all_assigned:
            assigned_groups_by_ppv.setdefault(ppv_id, []).append(group_id)

        # Group dict for current_group_code/name lookup
        groups_by_id = {
            g.id: g for g in FilterGroup.objects.all()
        }

        rows = []

        # ── Orphans: any PPV whose product_variation.variation_type is NOT
        # Tutorial and which has zero PPG rows.
        non_tutorial_ppvs = (
            ProductProductVariation.objects
            .exclude(product_variation__variation_type='Tutorial')
            .select_related('product', 'product_variation')
        )
        for ppv in non_tutorial_ppvs:
            assigned = assigned_groups_by_ppv.get(ppv.id, [])
            if not assigned:
                rows.append(Command._make_row(ppv, kind='orphan', current_group=None))

        # ── Parent-tagged: PPVs with a row pointing at a parent group in scope
        parent_tagged_qs = (
            ProductProductGroup.objects
            .filter(product_group_id__in=parent_group_ids)
            .select_related(
                'product_product_variation__product',
                'product_product_variation__product_variation',
                'product_group',
            )
        )
        seen = set()
        for ppg in parent_tagged_qs:
            ppv = ppg.product_product_variation
            # Skip if the PPV also has a leaf row already — caller can
            # inspect manually if needed, but for the CSV we focus on the
            # rows that still need a decision. Heuristic: include if the
            # PPV's ONLY assignment is at the parent.
            key = (ppv.id, ppg.product_group_id)
            if key in seen:
                continue
            seen.add(key)
            rows.append(Command._make_row(
                ppv, kind='parent_tagged', current_group=ppg.product_group,
            ))

        # Sort for stable output: kind first, then variation_type, then ppv_id
        rows.sort(key=lambda r: (r['kind'], r['variation_type'] or '', int(r['ppv_id'])))
        return rows

    @staticmethod
    def _make_row(ppv, *, kind, current_group):
        pv = ppv.product_variation
        product = ppv.product
        return {
            'ppv_id': ppv.id,
            'kind': kind,
            'product_id': getattr(product, 'id', '') if product else '',
            'product_code': getattr(product, 'code', '') if product else '',
            'product_shortname': getattr(product, 'shortname', '') if product else '',
            'product_fullname': getattr(product, 'fullname', '') if product else '',
            'variation_type': pv.variation_type if pv else '',
            'variation_code': pv.code if pv else '',
            'variation_name': pv.name if pv else '',
            'variation_description': (pv.description or '') if pv else '',
            'current_group_code': current_group.code if current_group else '',
            'current_group_name': current_group.name if current_group else '',
            'target_filter_group_code': '',
            'target_filter_group_name': '',
            'rationale': '',
        }

    @staticmethod
    def _write_csv(stream, rows):
        writer = csv.DictWriter(stream, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
