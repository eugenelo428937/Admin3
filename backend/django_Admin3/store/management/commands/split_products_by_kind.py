"""Split existing store.Product rows into MTI subclasses.

For every store.Product row whose Purchasable.kind == 'product',
classify by `product_product_variation.product_variation.variation_type`
and create the matching subclass row (MaterialProduct / TutorialProduct
/ MarkingProduct) sharing the parent PK (MTI shared PK), then update
Purchasable.kind to the specialized value.

Modes:
  --dry-run (default): walk and report. Write nothing.
  --check: walk and report unmappable rows (unknown formats, missing
           tutorial templates, missing TutorialEvent). Write nothing.
  --commit: walk and split. Idempotent — re-runs skip already-split
            rows.

Usage:
  python manage.py split_products_by_kind --dry-run
  python manage.py split_products_by_kind --check
  python manage.py split_products_by_kind --commit
"""
from collections import Counter

from django.core.management.base import BaseCommand, CommandError

from store.models import Product


# Mapping from catalog ProductVariation.variation_type to the
# specialized Purchasable.kind value and the MTI subclass model.
KIND_BY_VARIATION_TYPE = {
    'eBook':    'material',
    'Printed':  'material',
    'Hub':      'material',
    'Tutorial': 'tutorial',
    'Marking':  'marking',
}


class Command(BaseCommand):
    help = 'Split existing store.Product rows into MTI subclasses.'

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument(
            '--dry-run',
            action='store_true',
            help='Walk and report; write nothing. Default when no mode flag is passed.',
        )
        mode.add_argument(
            '--check',
            action='store_true',
            help='Walk and report unmappable rows. Write nothing.',
        )
        mode.add_argument(
            '--commit',
            action='store_true',
            help='Walk and split. Idempotent.',
        )

    def handle(self, *args, **options):
        if options['commit']:
            raise CommandError('--commit mode is implemented in Phase 2 Task 6')
        if options['check']:
            raise CommandError('--check mode is implemented in Phase 2 Task 5')

        # Default (no flag, or --dry-run explicitly) — walk and report.
        self._walk_and_report()

    def _walk_and_report(self):
        """Walk every legacy Product row and tally by resolved kind.

        Single joined queryset — Product MTI shares the Purchasable PK,
        so filtering by purchasable_ptr__kind='product' is the canonical
        way to get the legacy rows that still need splitting.
        """
        tally = Counter()
        unresolved = 0

        legacy = (
            Product.objects
            .filter(purchasable_ptr__kind='product')
            .select_related('product_product_variation__product_variation')
        )

        for product in legacy.iterator():
            vt = product.product_product_variation.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)
            if kind is None:
                unresolved += 1
                continue
            tally[kind] += 1

        self.stdout.write(self.style.NOTICE(
            'split_products_by_kind --dry-run summary:'
        ))
        for kind in ('material', 'tutorial', 'marking'):
            self.stdout.write(f'  {kind:10s} {tally[kind]:6d}')
        self.stdout.write(f'  {"unresolved":10s} {unresolved:6d}')
        self.stdout.write(
            f'  {"total":10s} {sum(tally.values()) + unresolved:6d}'
        )
