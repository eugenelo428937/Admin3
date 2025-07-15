from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rules_engine.engine import evaluate_checkout_rules
from cart.models import CartFee
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Test the Tutorial Booking Fee rule with different scenarios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--scenario',
            type=str,
            choices=['tutorial_only_credit', 'tutorial_only_invoice', 'mixed_cart_credit', 'no_items'],
            default='tutorial_only_credit',
            help='Test scenario to run'
        )

    def handle(self, *args, **options):
        scenario = options['scenario']
        
        self.stdout.write(self.style.SUCCESS(f'Testing Tutorial Booking Fee Rule - Scenario: {scenario}'))
        self.stdout.write("=" * 60)
        
        # Create a test user if needed
        test_user, created = User.objects.get_or_create(
            username='test_tutorial_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        if created:
            self.stdout.write(f"Created test user: {test_user.username}")
        
        # Define test scenarios
        scenarios = {
            'tutorial_only_credit': {
                'cart_items': [
                    {
                        'id': 1,
                        'product_id': 101,
                        'subject_code': 'CB1',
                        'product_name': 'CB1 Tutorial Session',
                        'product_code': 'CB1-TUT-001',
                        'product_type': 'Tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '125.00',
                        'metadata': {}
                    },
                    {
                        'id': 2,
                        'product_id': 102,
                        'subject_code': 'CP1',
                        'product_name': 'CP1 Tutorial Session',
                        'product_code': 'CP1-TUT-001',
                        'product_type': 'Tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '125.00',
                        'metadata': {}
                    }
                ],
                'payment_method': 'credit_card',
                'user_country': 'GB',
                'cart_id': 1,
                'description': 'Tutorial-only cart with credit card payment (should trigger fee)'
            },
            'tutorial_only_invoice': {
                'cart_items': [
                    {
                        'id': 1,
                        'product_id': 101,
                        'subject_code': 'CB1',
                        'product_name': 'CB1 Tutorial Session',
                        'product_code': 'CB1-TUT-001',
                        'product_type': 'Tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '125.00',
                        'metadata': {}
                    }
                ],
                'payment_method': 'invoice',
                'user_country': 'GB',
                'cart_id': 2,
                'description': 'Tutorial-only cart with invoice payment (should NOT trigger fee)'
            },
            'mixed_cart_credit': {
                'cart_items': [
                    {
                        'id': 1,
                        'product_id': 101,
                        'subject_code': 'CB1',
                        'product_name': 'CB1 Tutorial Session',
                        'product_code': 'CB1-TUT-001',
                        'product_type': 'Tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '125.00',
                        'metadata': {}
                    },
                    {
                        'id': 2,
                        'product_id': 201,
                        'subject_code': 'CB1',
                        'product_name': 'CB1 Study Text',
                        'product_code': 'CB1-BOOK-001',
                        'product_type': 'Study Text',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '45.00',
                        'metadata': {}
                    }
                ],
                'payment_method': 'credit_card',
                'user_country': 'GB',
                'cart_id': 3,
                'description': 'Mixed cart (tutorial + book) with credit card (should NOT trigger fee)'
            },
            'no_items': {
                'cart_items': [],
                'payment_method': 'credit_card',
                'user_country': 'GB',
                'cart_id': 4,
                'description': 'Empty cart (should NOT trigger fee)'
            }
        }
        
        # Run the selected scenario
        test_scenario = scenarios[scenario]
        
        self.stdout.write(f"\n📋 Scenario: {test_scenario['description']}")
        self.stdout.write(f"   Payment Method: {test_scenario['payment_method']}")
        self.stdout.write(f"   Cart Items: {len(test_scenario['cart_items'])}")
        
        if test_scenario['cart_items']:
            for item in test_scenario['cart_items']:
                self.stdout.write(f"     - {item['product_name']} ({item['product_type']}) - £{item['actual_price']}")
        
        # Evaluate the rules
        self.stdout.write(f"\n🔍 Evaluating rules...")
        
        # Remove cart_items from kwargs to avoid parameter conflict with function signature
        context_data = test_scenario.copy()
        cart_items_data = context_data.pop('cart_items', [])
        
        # For testing purposes, we need to pass the cart_items data differently
        # Let's pass it as a separate context key that our custom functions can access
        context_data['test_cart_items'] = cart_items_data
        
        result = evaluate_checkout_rules(
            user=test_user,
            cart_items=None,  # We pass None since we don't have actual CartItem model objects
            **context_data
        )
        
        # Display results
        self.stdout.write(f"\n📊 Results:")
        self.stdout.write(f"   Success: {result.get('success', False)}")
        self.stdout.write(f"   Can Proceed: {result.get('can_proceed', True)}")
        self.stdout.write(f"   Messages: {len(result.get('messages', []))}")
        self.stdout.write(f"   Calculations: {len(result.get('calculations', []))}")
        
        # Show messages
        if result.get('messages'):
            self.stdout.write(f"\n💬 Messages:")
            for i, message in enumerate(result['messages'], 1):
                self.stdout.write(f"   {i}. {message.get('title', 'No title')}")
                self.stdout.write(f"      Type: {message.get('message_type', 'Unknown')}")
                self.stdout.write(f"      Requires Acknowledgment: {message.get('requires_acknowledgment', False)}")
                # Show content without HTML tags for readability
                content = message.get('content', '').replace('<p>', '').replace('</p>', '').replace('<strong>', '').replace('</strong>', '')
                if len(content) > 100:
                    content = content[:100] + "..."
                self.stdout.write(f"      Content: {content}")
        
        # Show calculations
        if result.get('calculations'):
            self.stdout.write(f"\n🧮 Calculations:")
            for i, calc in enumerate(result['calculations'], 1):
                calc_result = calc.get('calculation_result', {})
                self.stdout.write(f"   {i}. {calc.get('calculation_type', 'Unknown')} calculation")
                self.stdout.write(f"      Rule: {calc.get('rule_name', 'Unknown')}")
                self.stdout.write(f"      Function: {calc_result.get('function_name', 'Unknown')}")
                self.stdout.write(f"      Success: {calc_result.get('success', False)}")
                self.stdout.write(f"      Fee Applied: {calc_result.get('fee_applied', False)}")
                if calc_result.get('fee_applied'):
                    self.stdout.write(f"      Fee Amount: £{calc_result.get('fee_amount', 0)}")
                    self.stdout.write(f"      Fee ID: {calc_result.get('fee_id', 'N/A')}")
        
        # Check for any actual CartFee records created
        fee_count = CartFee.objects.filter(cart_id=test_scenario['cart_id']).count()
        self.stdout.write(f"\n💳 Cart Fees in Database: {fee_count}")
        
        if fee_count > 0:
            fees = CartFee.objects.filter(cart_id=test_scenario['cart_id'])
            for fee in fees:
                self.stdout.write(f"     - {fee.name}: £{fee.amount} ({fee.fee_type})")
        
        # Show raw result for debugging
        if options.get('verbosity', 1) >= 2:
            self.stdout.write(f"\n🔧 Raw Result (debug):")
            self.stdout.write(json.dumps(result, indent=2, default=str))
        
        self.stdout.write(f"\n✅ Test completed for scenario: {scenario}")
        
        # Cleanup test data
        CartFee.objects.filter(cart_id=test_scenario['cart_id']).delete()
        self.stdout.write(f"🧹 Cleaned up test cart fees") 