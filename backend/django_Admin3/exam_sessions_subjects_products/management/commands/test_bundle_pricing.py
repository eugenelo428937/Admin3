from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
import json
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle
from products.serializers import ExamSessionSubjectBundleSerializer

class Command(BaseCommand):
    help = 'Test bundle pricing API functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--bundle-id',
            type=int,
            help='Test specific bundle ID'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )

    def handle(self, *args, **options):
        self.stdout.write('🧪 Testing Bundle Pricing API...\n')
        
        # Get bundle(s) to test
        if options['bundle_id']:
            try:
                bundles = [ExamSessionSubjectBundle.objects.get(id=options['bundle_id'])]
                self.stdout.write(f"Testing specific bundle ID: {options['bundle_id']}")
            except ExamSessionSubjectBundle.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Bundle with ID {options['bundle_id']} not found")
                )
                return
        else:
            bundles = ExamSessionSubjectBundle.objects.filter(is_active=True)[:3]  # Test first 3 active bundles
            self.stdout.write(f"Testing first {len(bundles)} active bundles")
        
        if not bundles:
            self.stdout.write(self.style.WARNING("No bundles found to test"))
            return
        
        for bundle in bundles:
            self.test_bundle(bundle, options['verbose'])
    
    def test_bundle(self, bundle, verbose=False):
        """Test a specific bundle's pricing"""
        self.stdout.write(f"\n📦 Testing Bundle: {bundle}")
        self.stdout.write(f"   Subject: {bundle.exam_session_subject.subject.code}")
        self.stdout.write(f"   Exam Session: {bundle.exam_session_subject.exam_session.session_code}")
        
        # Serialize the bundle with pricing
        serializer = ExamSessionSubjectBundleSerializer(bundle)
        bundle_data = serializer.data
        
        self.stdout.write(f"   Components Count: {bundle_data.get('components_count', 0)}")
        
        # Check each component for pricing
        components = bundle_data.get('components', [])
        total_price_standard = 0
        components_with_pricing = 0
        pricing_types_available = set()
        
        for i, component in enumerate(components, 1):
            product_name = component.get('product', {}).get('shortname', 'Unknown')
            variation_name = component.get('product_variation', {}).get('name', 'Unknown')
            prices = component.get('prices', [])
            quantity = component.get('quantity', 1)
            
            self.stdout.write(f"   📋 Component {i}: {product_name} ({variation_name})")
            self.stdout.write(f"      Quantity: {quantity}")
            
            if prices:
                components_with_pricing += 1
                if verbose:
                    self.stdout.write(f"      💰 Prices available:")
                for price in prices:
                    price_type = price.get('price_type')
                    amount = price.get('amount')
                    currency = price.get('currency', 'GBP')
                    
                    pricing_types_available.add(price_type)
                    
                    if price_type == 'standard':
                        total_price_standard += float(amount) * quantity
                    
                    if verbose:
                        self.stdout.write(f"         {price_type}: {currency} {amount}")
                
                if not verbose:
                    standard_price = next((p for p in prices if p['price_type'] == 'standard'), None)
                    if standard_price:
                        amount = standard_price['amount']
                        currency = standard_price.get('currency', 'GBP')
                        total_component = float(amount) * quantity
                        self.stdout.write(f"      💰 Standard: {currency} {amount} × {quantity} = {currency} {total_component:.2f}")
            else:
                self.stdout.write(f"      ❌ No pricing data available")
        
        # Summary
        self.stdout.write(f"\n📊 Bundle Summary:")
        self.stdout.write(f"   Components with pricing: {components_with_pricing}/{len(components)}")
        self.stdout.write(f"   Total standard price: GBP {total_price_standard:.2f}")
        self.stdout.write(f"   Price types available: {', '.join(sorted(pricing_types_available))}")
        
        # Test price calculation logic (similar to frontend)
        if pricing_types_available:
            self.stdout.write(f"\n🧮 Testing Price Calculation:")
            for price_type in ['standard', 'retaker', 'additional']:
                if price_type in pricing_types_available:
                    total = self.calculate_bundle_price(components, price_type)
                    self.stdout.write(f"   {price_type.title()}: GBP {total:.2f}")
        
        # Test API JSON structure
        if verbose:
            self.stdout.write(f"\n📄 JSON Structure Sample (first component):")
            if components:
                component_json = json.dumps(components[0], indent=2, cls=DjangoJSONEncoder)
                self.stdout.write(component_json)
    
    def calculate_bundle_price(self, components, price_type):
        """Calculate total bundle price for a specific price type with fallback"""
        total = 0
        for component in components:
            prices = component.get('prices', [])
            quantity = component.get('quantity', 1)
            
            # Try to find requested price type
            price_obj = next((p for p in prices if p['price_type'] == price_type), None)
            
            # Fallback to standard if not found
            if not price_obj:
                price_obj = next((p for p in prices if p['price_type'] == 'standard'), None)
            
            if price_obj:
                total += float(price_obj['amount']) * quantity
        
        return total 