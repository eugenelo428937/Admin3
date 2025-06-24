from django.core.management.base import BaseCommand
from django.utils import timezone
from utils.services.content_insertion_service import content_insertion_service
from utils.email_testing import email_tester
import json


class Command(BaseCommand):
    help = 'Test email content insertion system with various scenarios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--scenario',
            type=str,
            choices=['tutorial', 'south_africa', 'high_value', 'mock_exam', 'amp_product', 'all'],
            default='all',
            help='Test scenario to run'
        )
        
        parser.add_argument(
            '--send-email',
            type=str,
            help='Email address to send test email with dynamic content'
        )

    def handle(self, *args, **options):
        scenario = options['scenario']
        send_email = options.get('send_email')
        
        self.stdout.write('Testing email content insertion system...')
        
        if scenario == 'all':
            scenarios = ['tutorial', 'south_africa', 'high_value', 'mock_exam']
        else:
            scenarios = [scenario]
        
        for test_scenario in scenarios:
            self.test_scenario(test_scenario, send_email)
        
        self.stdout.write(
            self.style.SUCCESS('Content insertion testing completed!')
        )

    def test_scenario(self, scenario, send_email=None):
        """Test a specific scenario."""
        self.stdout.write(f'\n=== Testing scenario: {scenario.upper()} ===')
        
        # Get test context for scenario
        context = self.get_test_context(scenario)
        
        # Preview dynamic content
        preview = content_insertion_service.preview_dynamic_content(
            template_name='order_confirmation',
            context=context
        )
        
        # Debug rule evaluation
        self.debug_rule_evaluation(context)
        
        # Display results
        self.display_preview_results(scenario, preview)
        
        # Send test email if requested
        if send_email:
            self.send_test_email(scenario, context, send_email)

    def get_test_context(self, scenario):
        """Get test context data for different scenarios."""
        scenarios = self._get_test_scenarios()
        
        if scenario == 'all':
            # Return a generic test context for testing all rules
            return scenarios['amp_product']['context']
        
        if scenario in scenarios:
            return scenarios[scenario]['context']
        
        # Fallback to amp_product scenario if scenario not found
        return scenarios['amp_product']['context']

    def display_preview_results(self, scenario, preview):
        """Display preview results for a scenario."""
        self.stdout.write(f'\nTemplate: {preview["template_name"]}')
        self.stdout.write(f'Context Summary: {json.dumps(preview["context_summary"], indent=2)}')
        
        placeholders = preview.get('placeholders', {})
        
        if not placeholders:
            self.stdout.write(self.style.WARNING('No placeholders found or processed'))
            return
        
        for placeholder_name, placeholder_data in placeholders.items():
            self.stdout.write(f'\n--- Placeholder: {placeholder_name} ---')
            
            has_content = placeholder_data.get('has_content', False)
            if has_content:
                content = placeholder_data.get('generated_content', '')
                self.stdout.write(self.style.SUCCESS(f'✓ Content generated ({len(content)} characters)'))
                
                matched_rules = placeholder_data.get('matched_rules', [])
                if matched_rules:
                    self.stdout.write('Matched rules:')
                    for rule in matched_rules:
                        self.stdout.write(f'  - {rule["rule_name"]} (priority: {rule["priority"]})')
                
                # Show first 200 characters of content
                preview_content = content[:200] + '...' if len(content) > 200 else content
                # Remove MJML tags for cleaner display
                import re
                preview_content = re.sub(r'<[^>]+>', '', preview_content)
                preview_content = preview_content.strip()
                self.stdout.write(f'Content preview: {preview_content}')
            else:
                self.stdout.write(self.style.WARNING('✗ No content generated'))

    def send_test_email(self, scenario, context, email):
        """Send a test email with the dynamic content."""
        self.stdout.write(f'\nSending test email for scenario "{scenario}" to {email}...')
        
        try:
            # Update context with recipient email details
            context.update({
                'first_name': context['first_name'],
                'last_name': context['last_name'],
                'customer_name': f"{context['first_name']} {context['last_name']}"
            })
            
            # Use the email testing service to send
            success = email_tester.test_send_email('order_confirmation', email)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Test email sent successfully to {email}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'✗ Failed to send test email to {email}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error sending test email: {str(e)}')
            )

    def debug_rule_evaluation(self, context):
        """Debug rule evaluation for a given context."""
        self.stdout.write('\n=== DEBUG: Rule Evaluation ===')
        
        from utils.models import EmailContentRule, EmailTemplateContentRule
        
        # Get all active rules for order_confirmation
        rule_associations = EmailTemplateContentRule.objects.filter(
            template__name='order_confirmation',
            content_rule__is_active=True,
            is_enabled=True
        ).select_related('content_rule')
        
        for association in rule_associations:
            rule = association.content_rule
            self.stdout.write(f'\nRule: {rule.name} ({rule.rule_type})')
            self.stdout.write(f'  Condition: {rule.condition_field} {rule.condition_operator} {rule.condition_value}')
            self.stdout.write(f'  Placeholder: {rule.placeholder.name}')
            
            try:
                # Test the condition evaluation
                result = rule.evaluate_condition(context)
                self.stdout.write(f'  Result: {result}')
                
                if rule.rule_type == 'product_based':
                    self.stdout.write('  Product-based rule evaluation:')
                    items = context.get('items', [])
                    for i, item in enumerate(items):
                        self.stdout.write(f'    Item {i}: {item}')
                        if rule.condition_field == 'items.is_tutorial':
                            value = item.get('is_tutorial')
                            self.stdout.write(f'      is_tutorial = {value}')
                        elif rule.condition_field == 'items.product_code':
                            value = item.get('product_code')
                            self.stdout.write(f'      product_code = {value}')
                            contains_result = str(rule.condition_value) in str(value) if value else False
                            self.stdout.write(f'      contains "{rule.condition_value}": {contains_result}')
                
                elif rule.rule_type == 'location_based':
                    field_value = rule._get_nested_field_value(context, rule.condition_field)
                    self.stdout.write(f'  Field value for {rule.condition_field}: {field_value}')
                
                elif rule.rule_type == 'order_value':
                    field_value = rule._get_nested_field_value(context, rule.condition_field)
                    self.stdout.write(f'  Field value for {rule.condition_field}: {field_value}')
                    
            except Exception as e:
                self.stdout.write(f'  ERROR: {str(e)}')
        
        self.stdout.write('=== END DEBUG ===\n')

    def _get_test_scenarios(self):
        """Get predefined test scenarios."""
        return {
            'tutorial': {
                'description': 'Student ordering tutorial products',
                'context': {
                    'user': {
                        'country': 'United Kingdom',
                        'first_name': 'Jane',
                        'last_name': 'Smith',
                        'student_number': '123456'
                    },
                    'order_number': 'ORD-TUTORIAL-001',
                    'total_amount': 299.99,
                    'created_at': timezone.now(),
                    'items': [
                        {
                            'product_id': 41,
                            'product_name': 'Advanced Financial Reporting Tutorial',
                            'product_code': 'AFR/TUT/25A',
                            'subject_code': 'AFR',
                            'session_code': 'DEC24',
                            'quantity': 1,
                            'actual_price': 299.99,
                            'line_total': 299.99,
                            'is_tutorial': True,
                            'variation': None
                        }
                    ]
                }
            },
            'south_africa': {
                'description': 'Customer from South Africa',
                'context': {
                    'user': {
                        'country': 'South Africa',
                        'first_name': 'John',
                        'last_name': 'Doe',
                        'student_number': '123456'
                    },
                    'order_number': 'ORD-SA-001',
                    'total_amount': 199.99,
                    'created_at': timezone.now(),
                    'items': [
                        {
                            'product_id': 40,
                            'product_name': 'Strategic Business Management',
                            'product_code': 'SBM/ST/25A',
                            'subject_code': 'SBM',
                            'session_code': 'DEC24',
                            'quantity': 1,
                            'actual_price': 199.99,
                            'line_total': 199.99,
                            'is_tutorial': False,
                            'variation': None
                        }
                    ]
                }
            },
            'high_value': {
                'description': 'High value order over £500',
                'context': {
                    'user': {
                        'country': 'United Kingdom',
                        'first_name': 'Robert',
                        'last_name': 'Johnson',
                        'student_number': '123456'
                    },
                    'order_number': 'ORD-HIGH-001',
                    'total_amount': 750.00,
                    'created_at': timezone.now(),
                    'items': [
                        {
                            'product_id': 43,
                            'product_name': 'Complete Study Package',
                            'product_code': 'CSP/COMP/25A',
                            'subject_code': 'MULTI',
                            'session_code': 'DEC24',
                            'quantity': 1,
                            'actual_price': 750.00,
                            'line_total': 750.00,
                            'is_tutorial': False,
                            'variation': None
                        }
                    ]
                }
            },
            'mock_exam': {
                'description': 'Mock exam product',
                'context': {
                    'user': {
                        'country': 'United Kingdom',
                        'first_name': 'Mike',
                        'last_name': 'Wilson',
                        'student_number': '123456'
                    },
                    'order_number': 'ORD-MOCK_EXAM-001',
                    'total_amount': 150.00,
                    'created_at': timezone.now(),
                    'items': [
                        {
                            'product_id': 42,
                            'product_name': 'Financial Accounting Mock Exam Pack',
                            'product_code': 'FA-MOCK',
                            'subject_code': 'FA',
                            'session_code': 'DEC24',
                            'quantity': 1,
                            'actual_price': 150.00,
                            'line_total': 150.00,
                            'is_tutorial': False,
                            'variation': None
                        }
                    ]
                }
            },
            'amp_product': {
                'description': 'Additional Mock Pack (AMP) product matching user cart data',
                'context': {
                    'user': {
                        'country': 'United Kingdom',
                        'first_name': 'Eugene',
                        'last_name': 'Lo',
                        'student_number': '352866'
                    },
                    'order_number': 'ORD-000059',
                    'total_amount': 50.40,  # Matches user's actual cart total
                    'created_at': timezone.now(),
                    'items': [
                        {
                            'product_id': 71,
                            'product_name': 'Additional Mock Pack',
                            'product_code': 'AMP',  # Matches user's actual product code
                            'product_type': 'Mock Exam',
                            'subject_code': 'CM2',
                            'session_code': 'DEC25',
                            'quantity': 1,
                            'actual_price': 42.00,
                            'line_total': 42.00,
                            'is_tutorial': False,
                            'variation': 'Vitalsource eBook',
                            'metadata': {'variationId': 1, 'variationName': 'Vitalsource eBook'}
                        }
                    ]
                }
            }
        } 