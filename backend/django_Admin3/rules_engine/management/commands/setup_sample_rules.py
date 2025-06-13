from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from rules_engine.models import (
    Rule, RuleCondition, RuleAction, MessageTemplate, HolidayCalendar
)


class Command(BaseCommand):
    help = 'Setup sample rules and data for the rules engine'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up sample rules and data...'))

        # Create message templates
        self.create_message_templates()
        
        # Create holiday calendar
        self.create_holidays()
        
        # Create sample rules
        self.create_sample_rules()
        
        self.stdout.write(self.style.SUCCESS('Sample rules and data setup complete!'))

    def create_message_templates(self):
        """Create sample message templates"""
        self.stdout.write('Creating message templates...')
        
        templates = [
            {
                'name': 'terms_and_conditions',
                'title': 'Terms and Conditions',
                'content': '''
                <p><strong>Please read and accept our terms and conditions:</strong></p>
                <ul>
                    <li>All course fees are non-refundable once payment is processed</li>
                    <li>Course materials will be sent to your registered address</li>
                    <li>You have 30 days to complete tutorial bookings</li>
                    <li>Exam session dates cannot be changed once confirmed</li>
                </ul>
                <p>By proceeding, you agree to these terms and conditions.</p>
                ''',
                'message_type': 'terms',
                'variables': []
            },
            {
                'name': 'holiday_delivery_warning',
                'title': 'Holiday Delivery Notice',
                'content': '''
                <p><strong>Important Delivery Information</strong></p>
                <p>Due to the upcoming {holiday_name} on {holiday_date}, please note:</p>
                <ul>
                    <li>Study materials may be delayed by {delay_days} business days</li>
                    <li>Customer service will be limited during this period</li>
                    <li>Online access to materials will remain unaffected</li>
                </ul>
                <p>We apologize for any inconvenience.</p>
                ''',
                'message_type': 'warning',
                'variables': ['holiday_name', 'holiday_date', 'delay_days']
            },
            {
                'name': 'tutorial_deadline_warning',
                'title': 'Tutorial Booking Deadline',
                'content': '''
                <p><strong>Urgent: Tutorial Booking Required</strong></p>
                <p>You have selected tutorial products that require booking within {booking_days} days.</p>
                <p>Please ensure you complete your tutorial bookings promptly to secure your preferred dates and venues.</p>
                ''',
                'message_type': 'warning',
                'variables': ['booking_days']
            },
            {
                'name': 'high_value_order_notice',
                'title': 'High Value Order Confirmation',
                'content': '''
                <p><strong>Large Order Confirmation</strong></p>
                <p>Your order total is £{order_value}. As this is a significant purchase, please verify:</p>
                <ul>
                    <li>Your contact details are up to date</li>
                    <li>Your delivery address is correct</li>
                    <li>You understand the refund policy</li>
                </ul>
                ''',
                'message_type': 'info',
                'variables': ['order_value']
            }
        ]
        
        for template_data in templates:
            template, created = MessageTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                self.stdout.write(f'  Created template: {template.name}')
            else:
                self.stdout.write(f'  Template exists: {template.name}')

    def create_holidays(self):
        """Create sample holiday calendar entries"""
        self.stdout.write('Creating holiday calendar...')
        
        current_year = timezone.now().year
        holidays = [
            {'name': 'Christmas Day', 'date': f'{current_year}-12-25', 'delay_days': 2},
            {'name': 'Boxing Day', 'date': f'{current_year}-12-26', 'delay_days': 2},
            {'name': 'New Year\'s Day', 'date': f'{current_year + 1}-01-01', 'delay_days': 2},
            {'name': 'Good Friday', 'date': f'{current_year}-04-07', 'delay_days': 1},
            {'name': 'Easter Monday', 'date': f'{current_year}-04-10', 'delay_days': 1},
            {'name': 'May Day', 'date': f'{current_year}-05-01', 'delay_days': 1},
            {'name': 'Spring Bank Holiday', 'date': f'{current_year}-05-29', 'delay_days': 1},
            {'name': 'Summer Bank Holiday', 'date': f'{current_year}-08-28', 'delay_days': 1},
        ]
        
        for holiday_data in holidays:
            holiday, created = HolidayCalendar.objects.get_or_create(
                name=holiday_data['name'],
                date=holiday_data['date'],
                defaults={
                    'country': 'GB',
                    'delivery_delay_days': holiday_data['delay_days']
                }
            )
            if created:
                self.stdout.write(f'  Created holiday: {holiday.name}')

    def create_sample_rules(self):
        """Create sample rules"""
        self.stdout.write('Creating sample rules...')
        
        # Rule 1: Terms and Conditions on Checkout
        terms_template = MessageTemplate.objects.get(name='terms_and_conditions')
        rule1, created = Rule.objects.get_or_create(
            name='Checkout Terms and Conditions',
            defaults={
                'description': 'Show terms and conditions during checkout',
                'trigger_type': 'checkout_start',
                'priority': 1,
                'is_blocking': True,
                'is_active': True
            }
        )
        if created:
            self.stdout.write('  Created rule: Checkout Terms and Conditions')
            
            # Add action
            RuleAction.objects.create(
                rule=rule1,
                action_type='require_acknowledgment',
                message_template=terms_template,
                execution_order=1
            )

        # Rule 2: Holiday Delivery Warning
        holiday_template = MessageTemplate.objects.get(name='holiday_delivery_warning')
        rule2, created = Rule.objects.get_or_create(
            name='Holiday Delivery Warning',
            defaults={
                'description': 'Warn about delivery delays during holidays',
                'trigger_type': 'checkout_start',
                'priority': 10,
                'is_blocking': False,
                'is_active': True
            }
        )
        if created:
            self.stdout.write('  Created rule: Holiday Delivery Warning')
            
            # Add condition for holiday proximity
            RuleCondition.objects.create(
                rule=rule2,
                condition_type='holiday_proximity',
                field_name='business_days_to_next_holiday',
                operator='less_than',
                value='7'
            )
            
            # Add action
            RuleAction.objects.create(
                rule=rule2,
                action_type='show_message',
                message_template=holiday_template,
                execution_order=1
            )

        # Rule 3: Tutorial Product Warning
        tutorial_template = MessageTemplate.objects.get(name='tutorial_deadline_warning')
        rule3, created = Rule.objects.get_or_create(
            name='Tutorial Booking Reminder',
            defaults={
                'description': 'Remind users to book tutorials',
                'trigger_type': 'cart_add',
                'priority': 5,
                'is_blocking': False,
                'is_active': True
            }
        )
        if created:
            self.stdout.write('  Created rule: Tutorial Booking Reminder')
            
            # Add condition for tutorial products
            RuleCondition.objects.create(
                rule=rule3,
                condition_type='product_type',
                field_name='product.type',
                operator='equals',
                value='Tutorial'
            )
            
            # Add action
            RuleAction.objects.create(
                rule=rule3,
                action_type='show_message',
                message_template=tutorial_template,
                execution_order=1
            )

        # Rule 4: High Value Order Notice
        high_value_template = MessageTemplate.objects.get(name='high_value_order_notice')
        rule4, created = Rule.objects.get_or_create(
            name='High Value Order Notice',
            defaults={
                'description': 'Show notice for high value orders',
                'trigger_type': 'checkout_start',
                'priority': 15,
                'is_blocking': False,
                'is_active': True
            }
        )
        if created:
            self.stdout.write('  Created rule: High Value Order Notice')
            
            # Add condition for cart value
            RuleCondition.objects.create(
                rule=rule4,
                condition_type='cart_value',
                field_name='cart_value',
                operator='greater_than',
                value='500'
            )
            
            # Add action
            RuleAction.objects.create(
                rule=rule4,
                action_type='show_message',
                message_template=high_value_template,
                execution_order=1
            )