from django.core.management.base import BaseCommand
from rules_engine.models import (
    Rule, RuleAction, RuleCondition, RuleConditionGroup, MessageTemplate, RuleEntryPoint
)
from django.utils import timezone


class Command(BaseCommand):
    help = 'Setup expired deadline detection rule for checkout_start'

    def handle(self, *args, **options):
        self.stdout.write('Setting up expired deadline detection rule...')
        
        try:
            # Get or create the checkout_start entry point
            checkout_start_entry, created = RuleEntryPoint.objects.get_or_create(
                code='checkout_start',
                defaults={
                    'name': 'Checkout Start',
                    'description': 'Rules evaluated when user starts the checkout process',
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f'Created entry point: {checkout_start_entry.name}')
            else:
                self.stdout.write(f'Using existing entry point: {checkout_start_entry.name}')
            
            # Create the message template for expired deadlines
            template, created = MessageTemplate.objects.get_or_create(
                name='expired_marking_deadline_warning',
                defaults={
                    'message_type': 'warning',
                    'title': 'Marking Deadline Warning',
                    'content_format': 'json',
                    'json_content': {
                        'message_container': {
                            'element': 'container',
                            'text_align': 'left',
                            'class': 'expired-deadline-warning',
                            'title': 'h4',
                            'text': 'Expired Marking Deadlines Notice'
                        },
                        'content': [
                            {
                                'seq': 1,
                                'element': 'p',
                                'text': 'For the marking products you are ordering, some of the deadlines has expired. Please consider to use the Marking Voucher instead. Below is the marking product that has expired deadlines:'
                            },
                            {
                                'seq': 2,
                                'element': 'div',
                                'class': 'expired-products-list mb-3',
                                'repeat_for': 'expired_products',
                                'content': [
                                    {
                                        'element': 'p',
                                        'class': 'mb-2',
                                        'text': '{product_name} : {expired_count}/{total_papers} deadlines expired.'
                                    }
                                ]
                            }
                        ]
                    },
                    'variables': ['expired_products', 'product_name', 'expired_count', 'total_papers'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f'Created message template: {template.name}')
            else:
                self.stdout.write(f'Using existing template: {template.name}')
            
            # Create the rule for expired deadline detection
            rule, created = Rule.objects.get_or_create(
                name='Expired Marking Deadline Detection',
                defaults={
                    'entry_point': checkout_start_entry,
                    'description': 'Detect when cart contains marking products with expired deadlines',
                    'trigger_type': 'checkout_start',  # For backward compatibility
                    'priority': 100,
                    'is_active': True,
                    'is_blocking': False,  # Warning, not blocking
                    'success_criteria': 'any'  # Show warning if any deadlines are expired
                }
            )
            if created:
                self.stdout.write(f'Created rule: {rule.name}')
            else:
                self.stdout.write(f'Using existing rule: {rule.name}')
            
            # Create condition group for AND logic
            condition_group, created = RuleConditionGroup.objects.get_or_create(
                rule=rule,
                logical_operator='AND',
                defaults={'name': 'Expired Deadline Conditions'}
            )
            if created:
                self.stdout.write('Created condition group with AND logic')
            
            # Condition 1: cart.has_marking = True
            condition1, created = RuleCondition.objects.get_or_create(
                rule=rule,
                condition_group=condition_group,
                condition_type='cart_has_marking',
                defaults={
                    'field_name': 'cart.has_marking',
                    'operator': 'equals',
                    'value': 'True'
                }
            )
            if created:
                self.stdout.write('Created condition: cart.has_marking = True')
            
            # Condition 2: CartItem has expired deadlines (this will be evaluated per cart item)
            condition2, created = RuleCondition.objects.get_or_create(
                rule=rule,
                condition_group=condition_group,
                condition_type='cart_item_expired_deadline',
                defaults={
                    'field_name': 'cart_item.is_marking_and_expired',
                    'operator': 'equals',
                    'value': 'True'
                }
            )
            if created:
                self.stdout.write('Created condition: cart_item has expired deadlines')
            
            # Create the action for this rule - require acknowledgment
            action, created = RuleAction.objects.get_or_create(
                rule=rule,
                action_type='acknowledge',
                defaults={
                    'message_template': template,
                    'parameters': {
                        'requires_checkbox': True,
                        'acknowledgment_type': 'deadline_expired',
                        'step': 2  # Display in step 2 of checkout
                    }
                }
            )
            if created:
                self.stdout.write(f'Created action: acknowledgment required for {rule.name}')
            else:
                self.stdout.write(f'Using existing action for: {rule.name}')
            
            self.stdout.write(self.style.SUCCESS('✓ Expired deadline detection rule setup complete!'))
            self.stdout.write(f'Rule ID: {rule.id}')
            self.stdout.write(f'Template ID: {template.id}')
            self.stdout.write(f'Entry Point: {checkout_start_entry.code}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error setting up rule: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())