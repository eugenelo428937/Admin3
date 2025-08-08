from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from cart.models import ActedOrder, OrderUserAcknowledgment
from rules_engine.engine import rules_engine


class Command(BaseCommand):
    help = 'Test the complete order acknowledgment flow with rule_id and template_id extraction'

    def handle(self, *args, **options):
        # Find a test user
        test_user = User.objects.first()
        if not test_user:
            self.stdout.write(self.style.ERROR('No users found in database. Please create a user first.'))
            return
        
        self.stdout.write(f'Using test user: {test_user.username} (ID: {test_user.id})')
        
        # Create a test order
        order = ActedOrder.objects.create(
            user=test_user,
            subtotal=100.00,
            vat_amount=20.00,
            total_amount=120.00
        )
        self.stdout.write(f'Created test order: {order.id}')
        
        # Simulate the T&C acknowledgment creation process (from cart/views.py)
        self.stdout.write('Simulating T&C acknowledgment creation...')
        
        try:
            # Get rules engine evaluation data for checkout_terms entry point
            rules_evaluation = rules_engine.evaluate_rules(
                entry_point_code='checkout_terms',
                user=test_user,
                order_id=order.id
            )
            
            # Extract rule_id and template_id from rules evaluation
            rule_id = None
            template_id = None
            
            if rules_evaluation.get('success') and rules_evaluation.get('messages'):
                # Look for T&C related messages in the evaluation results
                for message in rules_evaluation['messages']:
                    if (message.get('type') in ['message', 'acknowledgment'] and 
                        message.get('requires_acknowledgment')):
                        rule_id = message.get('rule_id')
                        template_id = message.get('template_id')
                        self.stdout.write(f'Extracted Rule ID: {rule_id}, Template ID: {template_id}')
                        break
            
            # Create Terms & Conditions acknowledgment record with rule_id and template_id
            terms_acknowledgment = OrderUserAcknowledgment.objects.create(
                order=order,
                acknowledgment_type='terms_conditions',
                rule_id=rule_id,
                template_id=template_id,
                title='Terms & Conditions',
                content_summary='General Terms & Conditions acceptance for order completion',
                is_accepted=True,  # Test with accepted=True
                ip_address='127.0.0.1',
                user_agent='Test User Agent',
                content_version='1.0',
                acknowledgment_data={
                    'products': {},
                    'general_terms_accepted': True
                },
                rules_engine_context={
                    'evaluation_result': rules_evaluation,
                    'accepted_at': timezone.now().isoformat(),
                    'payment_data_received': True,
                    'extracted_rule_id': rule_id,
                    'extracted_template_id': template_id
                }
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created acknowledgment record: {terms_acknowledgment.id}'))
            self.stdout.write(f'Order ID: {terms_acknowledgment.order_id}')
            self.stdout.write(f'Rule ID: {terms_acknowledgment.rule_id}')
            self.stdout.write(f'Template ID: {terms_acknowledgment.template_id}')
            self.stdout.write(f'Accepted: {terms_acknowledgment.is_accepted}')
            self.stdout.write(f'IP Address: {terms_acknowledgment.ip_address}')
            
            # Verify the data was stored correctly
            retrieved_ack = OrderUserAcknowledgment.objects.get(id=terms_acknowledgment.id)
            if retrieved_ack.rule_id == rule_id and retrieved_ack.template_id == template_id:
                self.stdout.write(self.style.SUCCESS('✓ Rule ID and Template ID stored correctly!'))
            else:
                self.stdout.write(self.style.ERROR('✗ Rule ID and Template ID not stored correctly'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during acknowledgment creation: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
            
        # Clean up test data
        self.stdout.write('Cleaning up test data...')
        OrderUserAcknowledgment.objects.filter(order=order).delete()
        order.delete()
        self.stdout.write('Test completed and cleaned up successfully!')