from django.core.management.base import BaseCommand
from products.models import ProductProductVariation
from cart.models import CartItem

class Command(BaseCommand):
    help = 'Test the is_digital logic for different product variations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--variation-id',
            type=int,
            help='Test specific variation ID'
        )
        parser.add_argument(
            '--cart-item-id',
            type=int,
            help='Test specific cart item ID'
        )

    def handle(self, *args, **options):
        variation_id = options.get('variation_id')
        cart_item_id = options.get('cart_item_id')
        
        if variation_id:
            # Test specific variation
            self.test_variation(variation_id)
        elif cart_item_id:
            # Test specific cart item
            self.test_cart_item_logic(cart_item_id)
        else:
            # Test all variations
            self.test_all_variations()

    def test_variation(self, variation_id):
        """Test a specific variation ID"""
        try:
            ppv = ProductProductVariation.objects.select_related('product_variation').get(id=variation_id)
            variation_type = ppv.product_variation.variation_type.lower()
            is_digital = variation_type in ['ebook', 'hub']
            
            self.stdout.write(f"Variation ID {variation_id}:")
            self.stdout.write(f"  Name: {ppv.product_variation.name}")
            self.stdout.write(f"  Type: {ppv.product_variation.variation_type}")
            self.stdout.write(f"  Is Digital: {is_digital}")
            
        except ProductProductVariation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Variation ID {variation_id} not found"))

    def test_all_variations(self):
        """Test all product variations"""
        variations = ProductProductVariation.objects.select_related('product_variation').all()
        
        self.stdout.write("Testing all product variations:\n")
        
        digital_count = 0
        physical_count = 0
        
        for ppv in variations:
            variation_type = ppv.product_variation.variation_type.lower()
            is_digital = variation_type in ['ebook', 'hub']
            
            if is_digital:
                digital_count += 1
                status = self.style.SUCCESS("DIGITAL")
            else:
                physical_count += 1
                status = self.style.WARNING("PHYSICAL")
            
            self.stdout.write(f"ID {ppv.id:3}: {ppv.product_variation.name:30} ({ppv.product_variation.variation_type:10}) - {status}")
        
        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  Digital variations: {digital_count}")
        self.stdout.write(f"  Physical variations: {physical_count}")
        self.stdout.write(f"  Total variations: {digital_count + physical_count}")

    def test_cart_item_logic(self, cart_item_id):
        """Test the cart item digital detection logic"""
        try:
            cart_item = CartItem.objects.get(id=cart_item_id)
            
            self.stdout.write(f"Testing cart item {cart_item_id}:")
            self.stdout.write(f"  Product: {cart_item.product.product.fullname}")
            self.stdout.write(f"  Metadata: {cart_item.metadata}")
            
            if cart_item.metadata and cart_item.metadata.get('variationId'):
                variation_id = cart_item.metadata.get('variationId')
                try:
                    ppv = ProductProductVariation.objects.select_related('product_variation').get(id=variation_id)
                    variation_type = ppv.product_variation.variation_type.lower()
                    is_digital = variation_type in ['ebook', 'hub']
                    
                    self.stdout.write(f"  Variation ID: {variation_id}")
                    self.stdout.write(f"  Variation Name: {ppv.product_variation.name}")
                    self.stdout.write(f"  Variation Type: {ppv.product_variation.variation_type}")
                    self.stdout.write(f"  Is Digital: {is_digital}")
                    
                except ProductProductVariation.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"  Variation ID {variation_id} not found"))
            else:
                self.stdout.write("  No variation ID in metadata")
                
        except CartItem.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Cart item {cart_item_id} not found")) 