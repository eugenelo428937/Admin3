from django.core.management.base import BaseCommand
from products.models import FilterGroup


class Command(BaseCommand):
    help = 'Check if navbar product groups exist in the database'

    def handle(self, *args, **options):
        navbar_groups = [
            'Core Study Materials',
            'Revision Materials',
            'Marking',
            'Tutorials'
        ]

        self.stdout.write("Checking navbar product groups...")

        for group_name in navbar_groups:
            try:
                group = FilterGroup.objects.get(name=group_name)
                # catalog_products is the related_name after catalog consolidation
                product_count = group.catalog_products.filter(is_active=True).count()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {group_name} (ID: {group.id}) - {product_count} active products"
                    )
                )
            except FilterGroup.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"✗ {group_name} - NOT FOUND")
                )

        # Show all available filter groups
        self.stdout.write("\nAll available filter groups:")
        all_groups = FilterGroup.objects.all().order_by('name')
        for group in all_groups:
            # catalog_products is the related_name after catalog consolidation
            product_count = group.catalog_products.filter(is_active=True).count()
            self.stdout.write(f"  - {group.name} (ID: {group.id}) - {product_count} products")
