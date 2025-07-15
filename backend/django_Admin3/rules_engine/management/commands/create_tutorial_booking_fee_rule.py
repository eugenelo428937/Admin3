from django.core.management.base import BaseCommand
from rules_engine.models import Rule, RuleAction, RuleCondition, MessageTemplate
from django.utils import timezone

class Command(BaseCommand):
    help = 'Create Tutorial Booking Fee rule for the rules engine'

    def handle(self, *args, **options):
        self.stdout.write("Creating Tutorial Booking Fee rule...")
        
        # 1. Create message template for tutorial booking fee
        booking_fee_template, created = MessageTemplate.objects.get_or_create(
            name='tutorial_booking_fee_notice',
            defaults={
                'title': 'Tutorial Booking Fee',
                'content': '''
                <div class="tutorial-booking-fee-notice">
                    <h4><strong>Only ordering tutorials and paying by credit card</strong></h4>
                    <p>If you are <strong>only ordering tutorials and are paying by credit card</strong> then in order to capture your card details we will charge you a nominal booking fee of <strong>&pound;1</strong> immediately. We can then charge you in full for your tutorials once they have been finalised. The &pound;1 charge cannot be refunded but it will be deducted from the charge for your tutorial booking.</p>
                </div>
                ''',
                'message_type': 'info',
                'variables': [],
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created message template: {booking_fee_template.name}"))
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠ Message template already exists: {booking_fee_template.name}"))
        
        # 2. Create the Tutorial Booking Fee rule
        tutorial_fee_rule, created = Rule.objects.get_or_create(
            name='Tutorial Booking Fee',
            defaults={
                'description': 'Apply £1 booking fee for tutorial-only orders paid by credit card',
                'trigger_type': 'checkout_start',
                'priority': 25,  # After VAT rules but before general messages
                'is_active': True,
                'is_blocking': False,  # Non-blocking, just informational and fee application
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created rule: {tutorial_fee_rule.name} (ID: {tutorial_fee_rule.id})"))
            
            # Create condition using custom function
            RuleCondition.objects.create(
                rule=tutorial_fee_rule,
                condition_type='custom_field',
                field_name='cart_items',  # This will be passed to the custom function
                operator='custom_function',
                value='{"function": "check_tutorial_only_credit_card", "params": {"payment_method": "credit_card"}}'
            )
            
            # Create action to show message
            RuleAction.objects.create(
                rule=tutorial_fee_rule,
                action_type='show_message',
                message_template=booking_fee_template,
                parameters={
                    'display_location': 'payment_step',
                    'message_class': 'tutorial-booking-fee-info'
                },
                execution_order=1
            )
            
            # Create action to apply booking fee
            RuleAction.objects.create(
                rule=tutorial_fee_rule,
                action_type='calculate_fee',
                parameters={
                    'function': 'apply_tutorial_booking_fee',
                    'fee_amount': 1.00,
                    'fee_description': 'Tutorial Booking Fee',
                    'fee_type': 'tutorial_booking_fee',
                    'currency': 'GBP',
                    'description': 'One-time booking fee for tutorial reservations'
                },
                execution_order=2
            )
            
            self.stdout.write("  ✓ Added custom condition and actions for tutorial booking fee")
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠ Rule already exists: {tutorial_fee_rule.name}"))
        
        self.stdout.write(self.style.SUCCESS("\n🎉 Tutorial Booking Fee rule creation completed!"))
        self.stdout.write(f"\nCreated rule: {tutorial_fee_rule.name} (ID: {tutorial_fee_rule.id}) - Active: {tutorial_fee_rule.is_active}")
        
        self.stdout.write("\n📋 Rule Summary:")
        self.stdout.write(f"  • Trigger: {tutorial_fee_rule.trigger_type}")
        self.stdout.write(f"  • Priority: {tutorial_fee_rule.priority}")
        self.stdout.write(f"  • Condition: Tutorial-only cart + Credit card payment")
        self.stdout.write(f"  • Actions: Show message + Apply £1 booking fee")
        self.stdout.write(f"  • Message Template: {booking_fee_template.name}")
        
        self.stdout.write(f"\nRule ID: {tutorial_fee_rule.id}, Template ID: {booking_fee_template.id}") 