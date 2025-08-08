from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rules_engine.engine import rules_engine


class Command(BaseCommand):
    help = 'Test extraction of rule_id and template_id from checkout_terms evaluation'

    def handle(self, *args, **options):
        # Test the rules evaluation for checkout_terms
        self.stdout.write('Testing checkout_terms rules evaluation...')
        
        # Create a test user for evaluation
        test_user = User.objects.first()
        if not test_user:
            self.stdout.write(self.style.ERROR('No users found in database. Please create a user first.'))
            return
        
        # Evaluate rules for checkout_terms entry point
        rules_evaluation = rules_engine.evaluate_rules(
            entry_point_code='checkout_terms',
            user=test_user,
            order_id=999  # Test order ID
        )
        
        self.stdout.write(f'Evaluation success: {rules_evaluation.get("success")}')
        self.stdout.write(f'Number of messages: {len(rules_evaluation.get("messages", []))}')
        
        # Test extraction logic
        rule_id = None
        template_id = None
        
        if rules_evaluation.get('success') and rules_evaluation.get('messages'):
            for message in rules_evaluation['messages']:
                self.stdout.write(f'Message type: {message.get("type")}, '
                                f'requires_acknowledgment: {message.get("requires_acknowledgment")}')
                
                if (message.get('type') in ['message', 'acknowledgment'] and 
                    message.get('requires_acknowledgment')):
                    rule_id = message.get('rule_id')
                    template_id = message.get('template_id')
                    self.stdout.write(f'Found T&C rule - Rule ID: {rule_id}, Template ID: {template_id}')
                    break
        
        if rule_id and template_id:
            self.stdout.write(self.style.SUCCESS(f'Successfully extracted Rule ID: {rule_id}, Template ID: {template_id}'))
        else:
            self.stdout.write(self.style.WARNING('No rule_id or template_id found in evaluation'))
        
        # Display the full evaluation for debugging
        self.stdout.write('\n=== Full Evaluation Result ===')
        import json
        self.stdout.write(json.dumps(rules_evaluation, indent=2, default=str))