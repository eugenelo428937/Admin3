from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rules_engine.engine import rules_engine
from cart.models import CartItem


class Command(BaseCommand):
    help = 'Test the expired deadline detection rule'

    def handle(self, *args, **options):
        # Find a test user
        test_user = User.objects.first()
        if not test_user:
            self.stdout.write(self.style.ERROR('No users found in database. Please create a user first.'))
            return
        
        self.stdout.write(f'Using test user: {test_user.username} (ID: {test_user.id})')
        
        # Test the rules evaluation for checkout_start entry point
        self.stdout.write('\nTesting checkout_start rules evaluation with marking products...')
        
        # Create test cart items with marking products
        test_cart_items = [
            {
                'id': 1,
                'product_id': 123,  # Mock product ID
                'subject_code': 'CM1',
                'product_name': 'Series X Assignments (Marking)',
                'product_code': 'CM1_X_MARKING',
                'product_type': 'marking',
                'quantity': 1,
                'price_type': 'standard',
                'actual_price': '45.00',
                'metadata': {}
            }
        ]
        
        # Evaluate rules for checkout_start entry point
        rules_evaluation = rules_engine.evaluate_rules(
            entry_point_code='checkout_start',
            user=test_user,
            cart_items=test_cart_items
        )
        
        self.stdout.write(f'Evaluation success: {rules_evaluation.get("success")}')
        self.stdout.write(f'Number of messages: {len(rules_evaluation.get("messages", []))}')
        self.stdout.write(f'Can proceed: {rules_evaluation.get("can_proceed")}')
        
        # Check if expired deadline messages were found
        messages = rules_evaluation.get('messages', [])
        expired_deadline_messages = [
            msg for msg in messages 
            if msg.get('message_type') == 'warning' and 
               'deadline' in msg.get('title', '').lower()
        ]
        
        if expired_deadline_messages:
            self.stdout.write(self.style.SUCCESS(f'\nFound {len(expired_deadline_messages)} expired deadline warning(s):'))
            for i, msg in enumerate(expired_deadline_messages, 1):
                self.stdout.write(f'\n--- Message {i} ---')
                self.stdout.write(f'Title: {msg.get("title")}')
                self.stdout.write(f'Type: {msg.get("message_type")}')
                self.stdout.write(f'Rule ID: {msg.get("rule_id")}')
                self.stdout.write(f'Template ID: {msg.get("template_id")}')
                
                # Display JSON content if available
                if msg.get('json_content'):
                    self.stdout.write('JSON Content:')
                    import json
                    self.stdout.write(json.dumps(msg['json_content'], indent=2))
        else:
            self.stdout.write(self.style.WARNING('No expired deadline warnings found.'))
        
        # Display the full evaluation for debugging
        self.stdout.write('\n=== Full Evaluation Result ===')
        import json
        self.stdout.write(json.dumps(rules_evaluation, indent=2, default=str))
        
        # Test the custom function directly
        self.stdout.write('\n=== Direct Custom Function Test ===')
        from rules_engine.custom_functions import check_expired_marking_deadlines
        
        direct_result = check_expired_marking_deadlines(test_cart_items, {})
        self.stdout.write(f'Direct function result: {direct_result}')
        
        self.stdout.write('\nTest completed!')