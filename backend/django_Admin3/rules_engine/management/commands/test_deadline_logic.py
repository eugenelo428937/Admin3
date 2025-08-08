from django.core.management.base import BaseCommand
from rules_engine.models import Rule
from rules_engine.engine import rules_engine
from rules_engine.custom_functions import check_expired_marking_deadlines
import json


class Command(BaseCommand):
    help = 'Test expired deadline logic to debug the issue'

    def add_arguments(self, parser):
        parser.add_argument('--verbose', action='store_true', help='Verbose output')

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)
        
        self.stdout.write('Testing expired deadline logic...')
        
        # Test scenario 1: No expired deadlines
        self.stdout.write('\n--- Test 1: No expired deadlines ---')
        cart_items_no_expired = [
            {
                'id': 1,
                'product_id': 123,
                'product_name': 'CM1 Marking',
                'product_type': 'marking',
                'subject_code': 'CM1'
            }
        ]
        
        # Test the custom function directly
        result = check_expired_marking_deadlines(cart_items_no_expired, {})
        self.stdout.write(f'Custom function result: {json.dumps(result, indent=2)}')
        
        # Test the rule evaluation
        context = {
            'cart_items': cart_items_no_expired
        }
        
        rule_result = rules_engine.evaluate_rules(
            entry_point_code='checkout_start',
            user=None,
            **context
        )
        
        self.stdout.write(f'Rules engine result: {json.dumps(rule_result, indent=2, default=str)}')
        
        # Check if the rule triggered
        triggered_rules = [r for r in rule_result.get('results', []) if r.get('triggered')]
        self.stdout.write(f'Triggered rules: {len(triggered_rules)}')
        for rule in triggered_rules:
            self.stdout.write(f'  - {rule.get("rule_name", "Unknown")}')
        
        # Test scenario 2: With expired deadlines (mock data)
        self.stdout.write('\n--- Test 2: With expired deadlines (would need real data) ---')
        
        # For this test, we'd need actual expired marking papers in the database
        # This is just to verify the structure works correctly
        
        self.stdout.write('✓ Test complete')