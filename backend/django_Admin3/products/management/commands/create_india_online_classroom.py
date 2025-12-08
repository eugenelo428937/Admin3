from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from products.models import ProductVariation


class Command(BaseCommand):
    help = 'Create India Online Classroom variations from UK Online Classroom variations'

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

        # Find all Online Classroom variations with UK in the name
        uk_variations = ProductVariation.objects.filter(
            Q(name__icontains='Online Classroom') & Q(name__icontains='UK')
        )

        self.stdout.write(f'Found {uk_variations.count()} UK Online Classroom variations:')
        self.stdout.write('')

        created_count = 0
        skipped_count = 0

        for variation in uk_variations:
            # Create India version by replacing UK with India
            india_name = variation.name.replace('UK', 'India').replace('uk', 'India')
            india_description = (variation.description or '').replace('UK', 'India').replace('uk', 'India')
            india_description_short = (variation.description_short or '').replace('UK', 'India').replace('uk', 'India')
            india_code = (variation.code or '').replace('UK', 'IN').replace('uk', 'in') if variation.code else None

            if debug:
                self.stdout.write(f'  Original: {variation.name}')
                self.stdout.write(f'  → India:  {india_name}')
                self.stdout.write('')

            # Check if India variation already exists
            existing = ProductVariation.objects.filter(
                variation_type=variation.variation_type,
                name=india_name
            ).exists()

            if existing:
                self.stdout.write(self.style.WARNING(f'  SKIP: "{india_name}" already exists'))
                skipped_count += 1
                continue

            self.stdout.write(f'  CREATE: "{india_name}"')
            self.stdout.write(f'    Type: {variation.variation_type}')
            self.stdout.write(f'    Description: {india_description[:50]}...' if india_description else '    Description: (none)')
            if india_code:
                self.stdout.write(f'    Code: {india_code}')

            if not dry_run:
                with transaction.atomic():
                    ProductVariation.objects.create(
                        variation_type=variation.variation_type,
                        name=india_name,
                        description=india_description if india_description else None,
                        description_short=india_description_short if india_description_short else None,
                        code=india_code
                    )
                self.stdout.write(self.style.SUCCESS(f'    ✓ Created successfully'))

            created_count += 1
            self.stdout.write('')

        self.stdout.write('')
        self.stdout.write('=' * 50)
        self.stdout.write(f'Summary:')
        self.stdout.write(f'  Found:   {uk_variations.count()} UK Online Classroom variations')
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Skipped: {skipped_count} (already exist)')

        if dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('DRY RUN complete - run without --dry-run to apply changes'))
