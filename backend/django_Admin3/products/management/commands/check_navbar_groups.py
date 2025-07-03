from django.core.management.base import BaseCommand
from products.models import ProductGroup

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
                group = ProductGroup.objects.get(name=group_name)
                product_count = group.products.filter(is_active=True).count()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {group_name} (ID: {group.id}) - {product_count} active products"
                    )
                )
            except ProductGroup.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"✗ {group_name} - NOT FOUND")
                )
        
        # Show all available product groups
        self.stdout.write("\nAll available product groups:")
        all_groups = ProductGroup.objects.all().order_by('name')
        for group in all_groups:
            product_count = group.products.filter(is_active=True).count()
            self.stdout.write(f"  - {group.name} (ID: {group.id}) - {product_count} products") 