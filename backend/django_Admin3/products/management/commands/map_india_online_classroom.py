from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from products.models import ProductVariation, ProductProductVariation, Product


class Command(BaseCommand):
    help = 'Map India Online Classroom variations to products that have UK Online Classroom variations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Show detailed debug information',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        debug = options.get('debug', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
            self.stdout.write('')

        # Get all UK Online Classroom variations
        uk_variations = ProductVariation.objects.filter(
            Q(name__icontains='Online Classroom') & Q(name__icontains='UK')
        )

        self.stdout.write(f'Found {uk_variations.count()} UK Online Classroom variations')
        self.stdout.write('')

        created_count = 0
        skipped_count = 0
        products_updated = set()

        for uk_variation in uk_variations:
            # Find the corresponding India variation
            india_name = uk_variation.name.replace('UK', 'India').replace('uk', 'India')

            try:
                india_variation = ProductVariation.objects.get(
                    variation_type=uk_variation.variation_type,
                    name=india_name
                )
            except ProductVariation.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'  ERROR: India variation not found for "{uk_variation.name}"'))
                continue

            # Find all products linked to the UK variation
            uk_product_links = ProductProductVariation.objects.filter(
                product_variation=uk_variation
            ).select_related('product')

            if debug:
                self.stdout.write(f'\n{uk_variation.name}:')
                self.stdout.write(f'  → India variation: {india_variation.name} (ID: {india_variation.id})')
                self.stdout.write(f'  → Products with UK variation: {uk_product_links.count()}')

            for link in uk_product_links:
                product = link.product

                # Check if India variation is already linked to this product
                existing = ProductProductVariation.objects.filter(
                    product=product,
                    product_variation=india_variation
                ).exists()

                if existing:
                    if debug:
                        self.stdout.write(self.style.WARNING(f'    SKIP: Product "{product}" already has India variation'))
                    skipped_count += 1
                    continue

                self.stdout.write(f'  MAP: Product "{product}" (ID: {product.id})')
                self.stdout.write(f'       + {india_variation.name}')

                if not dry_run:
                    with transaction.atomic():
                        ProductProductVariation.objects.create(
                            product=product,
                            product_variation=india_variation
                        )
                    self.stdout.write(self.style.SUCCESS(f'       ✓ Mapped successfully'))

                created_count += 1
                products_updated.add(product.id)

        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write(f'Summary:')
        self.stdout.write(f'  UK variations processed: {uk_variations.count()}')
        self.stdout.write(f'  New mappings created:    {created_count}')
        self.stdout.write(f'  Mappings skipped:        {skipped_count} (already exist)')
        self.stdout.write(f'  Products updated:        {len(products_updated)}')

        if dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('DRY RUN complete - run without --dry-run to apply changes'))
