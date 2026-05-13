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
from django.core.management.base import BaseCommand


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
            default=True,
            help='Walk and report; write nothing. Default.',
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
            # Will be implemented in Task 6
            raise NotImplementedError(
                '--commit mode is implemented in Phase 2 Task 6'
            )
        if options['check']:
            # Will be implemented in Task 5
            raise NotImplementedError(
                '--check mode is implemented in Phase 2 Task 5'
            )

        # --dry-run (default)
        self._walk_and_report()

    def _walk_and_report(self):
        from store.models import Product, Purchasable

        tally = Counter()
        unresolved = 0
        # Walk Purchasable.kind='product' rows that still have a Product
        # child (i.e., not orphans — see pre-flight in plan).
        legacy = Purchasable.objects.filter(
            kind='product',
            pk__in=Product.objects.values('pk'),
        )

        for purchasable in legacy.iterator():
            product = Product.objects.select_related(
                'product_product_variation__product_variation'
            ).get(pk=purchasable.pk)
            vt = product.product_product_variation.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)
            if kind is None:
                unresolved += 1
                continue
            tally[kind] += 1

        self.stdout.write(self.style.NOTICE(
            f'split_products_by_kind --dry-run summary:'
        ))
        for kind in ('material', 'tutorial', 'marking'):
            self.stdout.write(f'  {kind:10s} {tally[kind]:6d}')
        self.stdout.write(f'  {"unresolved":10s} {unresolved:6d}')
        self.stdout.write(
            f'  {"total":10s} {sum(tally.values()) + unresolved:6d}'
        )
