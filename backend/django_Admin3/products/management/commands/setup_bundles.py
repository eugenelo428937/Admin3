from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from products.models import Product, ProductBundle, ProductBundleProduct, ProductVariation, ProductProductVariation
from subjects.models import Subject
from decimal import Decimal

class Command(BaseCommand):
    help = 'Setup bundle products with their component products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--subject',
            type=str,
            help='Subject code to create bundle for (e.g., CM1)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )

    def handle(self, *args, **options):
        subject = options.get('subject')
        dry_run = options.get('dry_run', False)

        if subject:
            self.setup_specific_bundle(subject, dry_run)
        else:
            self.setup_all_bundles(dry_run)

    def setup_specific_bundle(self, subject_code, dry_run=False):
        """Setup bundle for a specific subject"""
        bundle_configs = self.get_bundle_configurations()
        
        if subject_code not in bundle_configs:
            self.stdout.write(
                self.style.ERROR(f'No bundle configuration found for subject: {subject_code}')
            )
            return
        
        self.create_bundle(subject_code, bundle_configs[subject_code], dry_run)

    def setup_all_bundles(self, dry_run=False):
        """Setup all configured bundles"""
        bundle_configs = self.get_bundle_configurations()
        
        for subject_code, config in bundle_configs.items():
            self.create_bundle(subject_code, config, dry_run)

    def get_bundle_configurations(self):
        """
        Define bundle configurations for different subjects.
        In a real implementation, this could be loaded from a config file or database.
        """
        return {
            'CB1': {
                'bundle_name': 'Materials & Marking Bundle',
                'bundle_description': 'CB1 Bundle',
                'components': [
                    {
                        'product_name_contains': 'ASET (2020-2023 Papers)',
                        'variation_type': 'eBook',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 1
                    },
                    {
                        'product_name_contains': 'Mock Exam Marking',
                        'variation_type': 'Marking',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 2
                    },
                    {
                        'product_name_contains': 'Series X Assignments (Marking)',
                        'variation_type': 'Marking',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 3
                    },                    
                    {
                        'product_name_contains': 'Combined Materials Pack',
                        'variation_type': 'Printed',  # Default to printed version
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 4
                    },
                    {
                        'product_name_contains': 'Flash Cards',
                        'variation_type': 'Printed',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 5
                    }
                ]
            },
            'CM1': {
                'bundle_name': 'Materials & Marking Bundle',
                'bundle_description': 'Complete CM1 study package with materials and marking services',
                'components': [
                    {
                        'product_name_contains': 'Mock Exam Marking',
                        'variation_type': 'Marking',  # No specific variation required
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 1
                    },
                    {
                        'product_name_contains': 'Series X Assignments (Marking)',
                        'variation_type': 'Marking',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 2
                    },
                    {
                        'product_name_contains': 'Series Y Assignments (Marking)',
                        'variation_type': 'Marking',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 3
                    },
                    {
                        'product_name_contains': 'Combined Materials Pack',
                        'variation_type': 'Printed',  # Default to printed version
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 4
                    },
                    {
                        'product_name_contains': 'ASET (2020-2023 Papers)',
                        'variation_type': 'Printed',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 5
                    },
                    {
                        'product_name_contains': 'Flash Cards',
                        'variation_type': 'Printed',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 6
                    },
                    {
                        'product_name_contains': 'Revision Notes',
                        'variation_type': 'Printed',
                        'default_price_type': 'standard',
                        'quantity': 1,
                        'sort_order': 7
                    }
                ]
            },            
        }

    @transaction.atomic
    def create_bundle(self, subject_code, config, dry_run=False):
        """Create or update a bundle and its components"""
        
        bundle_name = config['bundle_name']
        
        # Get the Subject object
        try:
            subject = Subject.objects.get(code=subject_code, active=True)
        except Subject.DoesNotExist:
            raise CommandError(f'Subject {subject_code} not found or inactive')
        
        if dry_run:
            self.stdout.write(f"\n[DRY RUN] Would create bundle: {bundle_name} for {subject_code}")
            self.stdout.write(f"[DRY RUN] Would process {len(config['components'])} components:")
            for component_config in config['components']:
                self.stdout.write(f"  - {component_config['product_name_contains']} ({component_config['variation_type']})")
            return
        
        self.stdout.write(f"\nCreating/updating bundle: {bundle_name} for {subject_code}")

        # Create or update the ProductBundle
        bundle, created = ProductBundle.objects.get_or_create(
            subject=subject,
            bundle_name=bundle_name,
            defaults={
                'bundle_description': config.get('bundle_description', ''),
                'is_featured': True,
                'is_active': True,
                'display_order': 0
            }
        )
        
        if not created:
            # Update existing bundle
            bundle.bundle_description = config.get('bundle_description', '')
            bundle.save()
            self.stdout.write(f"Updated existing bundle: {bundle}")
        else:
            self.stdout.write(f"Created new bundle: {bundle}")

        # Clear existing bundle components
        ProductBundleProduct.objects.filter(bundle=bundle).delete()
        self.stdout.write("Cleared existing bundle components")

        # Create new bundle components
        components_created = 0
        for component_config in config['components']:
            try:
                # Find the component product
                component_products = Product.objects.filter(                    
                    fullname__icontains=component_config['product_name_contains']
                )
                
                if component_products.count() == 0:
                    raise CommandError(
                        f"Component not found: {component_config['product_name_contains']}"
                    )
                elif component_products.count() > 1:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Multiple matches for: {component_config['product_name_contains']}. Using first match."
                        )
                    )
                
                component_product = component_products.first()
                
                # Find the required ProductProductVariation
                variation_type = component_config.get('variation_type')
                if not variation_type:
                    raise CommandError(
                        f"variation_type is required for all bundle components. Missing for: {component_config['product_name_contains']}"
                    )
                
                # Find the specific product-variation combination
                product_product_variation = ProductProductVariation.objects.filter(
                    product=component_product,
                    product_variation__name__icontains=variation_type
                ).first()
                
                if not product_product_variation:
                    # Check if the product has any variations at all
                    product_variations_count = ProductProductVariation.objects.filter(
                        product=component_product
                    ).count()
                    
                    if product_variations_count == 0:
                        raise CommandError(
                            f"Product '{component_product.shortname}' has no product variations configured. "
                            f"Please set up ProductProductVariation entries for this product before adding it to bundles."
                        )
                    else:
                        # List available variations for debugging
                        available_variations = ProductProductVariation.objects.filter(
                            product=component_product
                        ).values_list('product_variation__name', flat=True)
                        
                        raise CommandError(
                            f"Variation '{variation_type}' not found for product '{component_product.shortname}'. "
                            f"Available variations: {list(available_variations)}. "
                            f"Please check the variation_type in your bundle configuration."
                        )
                
                # Create bundle component mapping
                bundle_component = ProductBundleProduct.objects.create(
                    bundle=bundle,
                    product_product_variation=product_product_variation,
                    default_price_type=component_config.get('default_price_type', 'standard'),
                    quantity=component_config.get('quantity', 1),
                    sort_order=component_config.get('sort_order', 0)
                )
                
                components_created += 1
                variation_info = f" ({product_product_variation.product_variation.name})"
                self.stdout.write(f"  ✓ Added: {component_product.shortname}{variation_info}")
                
            except CommandError:
                # Re-raise CommandError as-is
                raise
            except Exception as e:
                raise CommandError(
                    f"Error adding component {component_config['product_name_contains']}: {str(e)}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Bundle creation completed! Created {components_created} components for {bundle_name}"
            )
        )

    def get_bundle_summary(self, bundle):
        """Get a summary of bundle components for display"""
        components = ProductBundleProduct.objects.filter(
            bundle=bundle,
            is_active=True
        ).select_related('product_product_variation__product', 'product_product_variation__product_variation').order_by('sort_order')
        
        return [
            {
                'name': comp.product_product_variation.product.shortname,
                'variation': comp.product_product_variation.product_variation.name,
                'price_type': comp.default_price_type,
                'quantity': comp.quantity
            }
            for comp in components
        ] 