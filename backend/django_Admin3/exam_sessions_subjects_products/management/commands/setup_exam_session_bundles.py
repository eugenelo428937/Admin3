from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from products.models import ProductBundle
from exam_sessions_subjects.models import ExamSessionSubject
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectProduct, 
    ExamSessionSubjectProductVariation
)
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle, ExamSessionSubjectBundleProduct

class Command(BaseCommand):
    help = 'Setup exam session bundles from master bundle templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-session',
            type=str,
            help='Exam session to create bundles for (e.g., "September 2025")',
        )
        parser.add_argument(
            '--subject',
            type=str,
            help='Subject code to create bundles for (e.g., CM1)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recreate bundles even if they already exist',
        )

    def handle(self, *args, **options):
        exam_session = options.get('exam_session')
        subject = options.get('subject')
        dry_run = options.get('dry_run', False)
        force = options.get('force', False)

        # Get exam session subjects to process
        exam_session_subjects = self.get_exam_session_subjects(exam_session, subject)
        
        if not exam_session_subjects.exists():
            raise CommandError('No exam session subjects found matching the criteria')

        self.stdout.write(f"Found {exam_session_subjects.count()} exam session subjects to process")

        for exam_session_subject in exam_session_subjects:
            self.create_bundles_for_exam_session_subject(exam_session_subject, dry_run, force)

    def get_exam_session_subjects(self, exam_session=None, subject=None):
        """Get exam session subjects based on filters"""
        queryset = ExamSessionSubject.objects.select_related(
            'exam_session', 'subject'
        )
        
        if exam_session:
            queryset = queryset.filter(exam_session__session_code__icontains=exam_session)
        
        if subject:
            queryset = queryset.filter(subject__code=subject)
        
        return queryset.order_by('exam_session__session_code', 'subject__code')

    @transaction.atomic
    def create_bundles_for_exam_session_subject(self, exam_session_subject, dry_run=False, force=False):
        """Create bundles for a specific exam session subject"""
        
        self.stdout.write(f"\nProcessing: {exam_session_subject}")
        
        # Get master bundles for this subject
        master_bundles = ProductBundle.objects.filter(
            subject=exam_session_subject.subject,
            is_active=True
        ).prefetch_related('bundle_products__product_product_variation__product')
        
        if not master_bundles.exists():
            self.stdout.write(f"  No master bundles found for {exam_session_subject.subject.code}")
            return
        
        for master_bundle in master_bundles:
            self.create_exam_session_bundle(exam_session_subject, master_bundle, dry_run, force)

    def create_exam_session_bundle(self, exam_session_subject, master_bundle, dry_run=False, force=False):
        """Create an exam session bundle from a master bundle template"""
        
        if dry_run:
            self.stdout.write(f"  [DRY RUN] Would create bundle: {master_bundle.bundle_name}")
            components = master_bundle.bundle_products.filter(is_active=True)
            self.stdout.write(f"  [DRY RUN] Would process {components.count()} components")
            return
        
        # Check if bundle already exists
        existing_bundle = ExamSessionSubjectBundle.objects.filter(
            exam_session_subject=exam_session_subject,
            bundle=master_bundle
        ).first()
        
        if existing_bundle and not force:
            self.stdout.write(f"  Bundle already exists: {master_bundle.bundle_name} (use --force to recreate)")
            return
        elif existing_bundle and force:
            self.stdout.write(f"  Recreating existing bundle: {master_bundle.bundle_name}")
            existing_bundle.delete()
        
        # Create the exam session bundle
        exam_session_bundle = ExamSessionSubjectBundle.objects.create(
            exam_session_subject=exam_session_subject,
            bundle=master_bundle,
            is_active=True,
            display_order=master_bundle.display_order
        )
        
        self.stdout.write(f"  ✓ Created bundle: {master_bundle.bundle_name}")
        
        # Add bundle components
        components_created = 0
        components_skipped = 0
        
        for master_bundle_product in master_bundle.bundle_products.filter(is_active=True):
            try:
                # Get product and variation from the ProductProductVariation
                product = master_bundle_product.product_product_variation.product
                product_variation = master_bundle_product.product_product_variation.product_variation
                
                # Find the corresponding exam session product
                exam_session_product = ExamSessionSubjectProduct.objects.filter(
                    exam_session_subject=exam_session_subject,
                    product=product
                ).first()
                
                if not exam_session_product:
                    self.stdout.write(
                        self.style.WARNING(
                            f"    Product not available in exam session: {product.shortname}"
                        )
                    )
                    components_skipped += 1
                    continue
                
                # Find the corresponding exam session product variation
                exam_session_product_variation = ExamSessionSubjectProductVariation.objects.filter(
                    exam_session_subject_product=exam_session_product,
                    product_product_variation=master_bundle_product.product_product_variation
                ).first()
                
                if not exam_session_product_variation:
                    self.stdout.write(
                        self.style.WARNING(
                            f"    Variation not available: {product_variation.name} for {product.shortname}"
                        )
                    )
                    components_skipped += 1
                    continue
                
                # Create the bundle product mapping
                ExamSessionSubjectBundleProduct.objects.create(
                    bundle=exam_session_bundle,
                    exam_session_subject_product_variation=exam_session_product_variation,
                    default_price_type=master_bundle_product.default_price_type,
                    quantity=master_bundle_product.quantity,
                    sort_order=master_bundle_product.sort_order,
                    is_active=master_bundle_product.is_active
                )
                
                components_created += 1
                variation_info = f" ({product_variation.name})"
                self.stdout.write(f"    ✓ Added: {product.shortname}{variation_info}")
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"    Error adding {product.shortname}: {str(e)}"
                    )
                )
                components_skipped += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f"    Bundle completed: {components_created} components added, {components_skipped} skipped"
            )
        ) 