"""
Management command to create test rules for each entry point
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from rules_engine.models import ActedRule, MessageTemplate


class Command(BaseCommand):
    help = 'Create test rules for all entry points with always-true conditions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test rules before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write("🧹 Clearing existing test rules...")
            deleted_count = ActedRule.objects.filter(rule_id__startswith='test_').delete()[0]
            self.stdout.write(f"Deleted {deleted_count} test rules")

        # Entry points to create rules for
        entry_points = [
            'home_page_mount',
            'product_list_mount', 
            'product_card_mount',
            'checkout_start',
            'checkout_preference',
            'checkout_terms',
            'checkout_payment'
        ]

        # Create message templates if they don't exist
        self.create_message_templates()

        # Create test rules for each entry point
        for entry_point in entry_points:
            self.create_test_rule(entry_point)

        self.stdout.write(
            self.style.SUCCESS(f'✅ Successfully created {len(entry_points)} test rules')
        )

    def create_message_templates(self):
        """Create message templates for test rules"""
        templates = [
            {
                'name': 'test_display_message',
                'title': 'Test Display Message',
                'content': '<p>This is a test message from the rules engine.</p>',
                'message_type': 'info',
                'json_content': {
                    'message_container': {
                        'element': 'container',
                        'text_align': 'left',
                        'title': 'h4',
                        'text': 'Test Message'
                    },
                    'content': [
                        {
                            'seq': 1,
                            'element': 'p',
                            'text': 'This is a test message from the new JSONB rules engine!'
                        }
                    ]
                }
            },
            {
                'name': 'test_acknowledgment',
                'title': 'Test Acknowledgment Required',
                'content': '<p>Please acknowledge this test message.</p>',
                'message_type': 'terms',
                'json_content': {
                    'message_container': {
                        'element': 'container',
                        'text_align': 'left',
                        'title': 'h4',
                        'text': 'Test Acknowledgment'
                    },
                    'content': [
                        {
                            'seq': 1,
                            'element': 'p',
                            'text': 'This test message requires your acknowledgment to verify the rules engine is working correctly.'
                        }
                    ]
                }
            }
        ]

        for template_data in templates:
            template, created = MessageTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    'title': template_data['title'],
                    'content': template_data['content'],
                    'content_format': 'json',
                    'json_content': template_data['json_content'],
                    'message_type': template_data['message_type'],
                    'variables': [],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f"Created template: {template.name}")

    def create_test_rule(self, entry_point):
        """Create a test rule for the given entry point"""
        
        rule_configs = {
            'home_page_mount': {
                'name': 'Test Home Page Rule',
                'description': 'Test rule that displays a welcome message on home page',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Welcome to Admin3!',
                        'content': f'This is a test message for {entry_point}. The rules engine is working correctly!',
                        'messageType': 'info',
                        'templateId': 'test_display_message'
                    }
                ]
            },
            'product_list_mount': {
                'name': 'Test Product List Rule',
                'description': 'Test rule for product list page',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Product List Info',
                        'content': f'Test message for {entry_point}. Browse our products!',
                        'messageType': 'info',
                        'templateId': 'test_display_message'
                    }
                ]
            },
            'product_card_mount': {
                'name': 'Test Product Card Rule',
                'description': 'Test rule for product card display',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Product Card Info',
                        'content': f'Test message for {entry_point}. Product details loaded!',
                        'messageType': 'info',
                        'templateId': 'test_display_message'
                    }
                ]
            },
            'checkout_start': {
                'name': 'Test Checkout Start Rule',
                'description': 'Test rule when checkout process begins',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Checkout Started',
                        'content': f'Test message for {entry_point}. Starting checkout process!',
                        'messageType': 'warning',
                        'templateId': 'test_display_message'
                    }
                ]
            },
            'checkout_preference': {
                'name': 'Test Checkout Preference Rule',
                'description': 'Test rule for checkout preferences',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Checkout Preferences',
                        'content': f'Test message for {entry_point}. Set your preferences!',
                        'messageType': 'info',
                        'templateId': 'test_display_message'
                    }
                ]
            },
            'checkout_terms': {
                'name': 'Test Checkout Terms Rule',
                'description': 'Test rule for terms & conditions acknowledgment',
                'actions': [
                    {
                        'type': 'user_acknowledge',
                        'title': 'Test Terms & Conditions',
                        'content': f'Test acknowledgment for {entry_point}. Please accept these test terms.',
                        'templateId': 'test_acknowledgment',
                        'ackKey': 'test_terms_v1',
                        'required': True
                    }
                ]
            },
            'checkout_payment': {
                'name': 'Test Checkout Payment Rule',
                'description': 'Test rule for payment processing',
                'actions': [
                    {
                        'type': 'display_message',
                        'title': 'Payment Processing',
                        'content': f'Test message for {entry_point}. Processing your payment!',
                        'messageType': 'success',
                        'templateId': 'test_display_message'
                    }
                ]
            }
        }

        config = rule_configs.get(entry_point, {})
        
        rule_data = {
            'rule_id': f'test_{entry_point}_001',
            'name': config.get('name', f'Test Rule for {entry_point}'),
            'description': config.get('description', f'Test rule for {entry_point} entry point'),
            'entry_point': entry_point,
            'priority': 10,
            'active': True,
            'version': 1,
            'condition': {'always': True},  # Always-true condition for testing
            'actions': config.get('actions', [
                {
                    'type': 'display_message',
                    'title': f'Test {entry_point}',
                    'content': f'Default test message for {entry_point}',
                    'messageType': 'info'
                }
            ]),
            'stop_processing': False,
            'metadata': {
                'created_by': 'management_command',
                'purpose': 'testing',
                'entry_point': entry_point,
                'created_at': timezone.now().isoformat()
            }
        }

        # Create or update the rule
        rule, created = ActedRule.objects.update_or_create(
            rule_id=rule_data['rule_id'],
            defaults=rule_data
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"  {action}: {rule.rule_id} - {rule.name}")

        return rule