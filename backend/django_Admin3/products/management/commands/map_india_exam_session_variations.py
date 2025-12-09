from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from products.models import ProductVariation, ProductProductVariation
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectProduct,
    ExamSessionSubjectProductVariation,
    Price
)


class Command(BaseCommand):
    help = 'Map India Online Classroom variations to exam session subject products, variations, and prices'

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

        # Get all UK Online Classroom ProductProductVariation mappings
        uk_product_variations = ProductProductVariation.objects.filter(
            Q(product_variation__name__icontains='Online Classroom') &
            Q(product_variation__name__icontains='UK')
        ).select_related('product', 'product_variation')

        self.stdout.write(f'Found {uk_product_variations.count()} UK Online Classroom product-variation mappings')
        self.stdout.write('')

        essp_created = 0
        esspv_created = 0
        price_created = 0
        skipped = 0

        for uk_ppv in uk_product_variations:
            uk_variation = uk_ppv.product_variation
            india_name = uk_variation.name.replace('UK', 'India').replace('uk', 'India')

            # Find the corresponding India variation
            try:
                india_variation = ProductVariation.objects.get(
                    variation_type=uk_variation.variation_type,
                    name=india_name
                )
            except ProductVariation.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'ERROR: India variation not found for "{uk_variation.name}"'))
                continue

            # Find the India ProductProductVariation
            try:
                india_ppv = ProductProductVariation.objects.get(
                    product=uk_ppv.product,
                    product_variation=india_variation
                )
            except ProductProductVariation.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'ERROR: India ProductProductVariation not found for product {uk_ppv.product} and variation {india_name}'))
                continue

            if debug:
                self.stdout.write(f'\nProcessing: {uk_variation.name}')
                self.stdout.write(f'  UK PPV ID: {uk_ppv.id} → India PPV ID: {india_ppv.id}')

            # Find all ExamSessionSubjectProductVariations using the UK ProductProductVariation
            uk_esspvs = ExamSessionSubjectProductVariation.objects.filter(
                product_product_variation=uk_ppv
            ).select_related(
                'exam_session_subject_product',
                'exam_session_subject_product__exam_session_subject',
                'exam_session_subject_product__exam_session_subject__exam_session',
                'exam_session_subject_product__exam_session_subject__subject'
            )

            if debug:
                self.stdout.write(f'  Found {uk_esspvs.count()} ExamSessionSubjectProductVariations with UK variation')

            for uk_esspv in uk_esspvs:
                essp = uk_esspv.exam_session_subject_product
                ess = essp.exam_session_subject

                # Check if India variation already exists for this exam session subject product
                existing_india_esspv = ExamSessionSubjectProductVariation.objects.filter(
                    exam_session_subject_product=essp,
                    product_product_variation=india_ppv
                ).first()

                if existing_india_esspv:
                    if debug:
                        self.stdout.write(self.style.WARNING(f'    SKIP: {ess.subject.code} - India variation already exists'))
                    skipped += 1
                    continue

                self.stdout.write(f'  CREATE ESSPV: {ess.exam_session.session_code} / {ess.subject.code}')
                self.stdout.write(f'    Product: {essp.product.fullname}')
                self.stdout.write(f'    Variation: {india_variation.name}')

                if not dry_run:
                    with transaction.atomic():
                        # Create the ExamSessionSubjectProductVariation for India
                        india_esspv = ExamSessionSubjectProductVariation.objects.create(
                            exam_session_subject_product=essp,
                            product_product_variation=india_ppv
                            # product_code will be auto-generated by save()
                        )
                        esspv_created += 1
                        self.stdout.write(self.style.SUCCESS(f'    ✓ Created ESSPV (ID: {india_esspv.id}, Code: {india_esspv.product_code})'))

                        # Copy prices from UK variation
                        uk_prices = Price.objects.filter(variation=uk_esspv)
                        for uk_price in uk_prices:
                            Price.objects.create(
                                variation=india_esspv,
                                price_type=uk_price.price_type,
                                amount=uk_price.amount,
                                currency=uk_price.currency
                            )
                            price_created += 1
                            self.stdout.write(self.style.SUCCESS(f'    ✓ Created Price: {uk_price.price_type} - {uk_price.amount} {uk_price.currency}'))
                else:
                    esspv_created += 1
                    # Show what prices would be copied
                    uk_prices = Price.objects.filter(variation=uk_esspv)
                    for uk_price in uk_prices:
                        self.stdout.write(f'    Would copy price: {uk_price.price_type} - {uk_price.amount} {uk_price.currency}')
                        price_created += 1

        self.stdout.write('')
        self.stdout.write('=' * 70)
        self.stdout.write('Summary:')
        self.stdout.write(f'  UK ProductProductVariations processed: {uk_product_variations.count()}')
        self.stdout.write(f'  ExamSessionSubjectProductVariations created: {esspv_created}')
        self.stdout.write(f'  Prices created: {price_created}')
        self.stdout.write(f'  Skipped (already exist): {skipped}')

        if dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('DRY RUN complete - run without --dry-run to apply changes'))
