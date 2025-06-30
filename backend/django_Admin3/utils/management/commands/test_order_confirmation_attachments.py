from django.core.management.base import BaseCommand
from utils.email_service import email_service
from datetime import datetime


class Command(BaseCommand):
    help = 'Test order confirmation email attachments with different product types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='test@example.com',
            help='Email address to send test emails to',
        )
        parser.add_argument(
            '--scenario',
            type=str,
            choices=['materials', 'tutorial', 'marking', 'mixed'],
            default='mixed',
            help='Test scenario: materials, tutorial, marking, or mixed',
        )

    def handle(self, *args, **options):
        email = options['email']
        scenario = options['scenario']
        
        self.stdout.write(f"Testing order confirmation attachments - Scenario: {scenario}")
        self.stdout.write(f"Sending test email to: {email}")
        
        # Create test order data based on scenario
        order_data = self._get_test_order_data(scenario)
        
        self.stdout.write("\nOrder Details:")
        self.stdout.write(f"  Order Number: {order_data['order_number']}")
        self.stdout.write(f"  Total Items: {len(order_data['items'])}")
        self.stdout.write("  Items:")
        for item in order_data['items']:
            self.stdout.write(f"    - {item['product_name']} (Type: {item.get('product_type', 'materials')})")
        
        # Send the order confirmation email
        try:
            success = email_service.send_order_confirmation(
                user_email=email,
                order_data=order_data,
                use_mjml=True,
                enhance_outlook=True,
                use_queue=False,  # Send immediately for testing
                user=None
            )
            
            if success:
                self.stdout.write(self.style.SUCCESS(f"\n✅ Order confirmation email sent successfully!"))
                self.stdout.write("\nExpected Attachments based on scenario:")
                self._show_expected_attachments(scenario)
            else:
                self.stdout.write(self.style.ERROR(f"\n❌ Failed to send order confirmation email"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error sending email: {str(e)}"))

    def _get_test_order_data(self, scenario):
        """Generate test order data based on scenario."""
        base_order = {
            'order_number': f'TEST-{scenario.upper()}-001',
            'customer_name': 'Test Customer',
            'first_name': 'Test',
            'last_name': 'Customer',
            'student_number': 'STU12345',
            'total_amount': 299.99,
            'subtotal': 249.99,
            'vat_amount': 50.00,
            'discount_amount': 0,
            'created_at': datetime.now(),
            'is_invoice': False,
            'employer_code': None,
            'is_digital': False,
            'is_tutorial': False,
            'payment_method': 'card',
        }
        
        if scenario == 'materials':
            base_order['items'] = [
                {
                    'product_name': 'Study Text - Financial Accounting',
                    'subject_code': 'FA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 129.99,
                    'line_total': 129.99,
                    'product_type': 'materials',
                    'is_tutorial': False,
                    'is_marking': False,
                },
                {
                    'product_name': 'Practice & Revision Kit - Management Accounting',
                    'subject_code': 'MA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 119.99,
                    'line_total': 119.99,
                    'product_type': 'materials',
                    'is_tutorial': False,
                    'is_marking': False,
                }
            ]
        
        elif scenario == 'tutorial':
            base_order['items'] = [
                {
                    'product_name': 'Tutorial - Financial Accounting Weekend Course',
                    'subject_code': 'FA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 299.99,
                    'line_total': 299.99,
                    'product_type': 'tutorial',
                    'is_tutorial': True,
                    'is_marking': False,
                }
            ]
            base_order['is_tutorial'] = True
        
        elif scenario == 'marking':
            base_order['items'] = [
                {
                    'product_name': 'Marking Service - Financial Accounting Practice Exam',
                    'subject_code': 'FA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 49.99,
                    'line_total': 49.99,
                    'product_type': 'marking',
                    'is_tutorial': False,
                    'is_marking': True,
                }
            ]
        
        elif scenario == 'mixed':
            base_order['items'] = [
                {
                    'product_name': 'Study Text - Financial Accounting',
                    'subject_code': 'FA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 129.99,
                    'line_total': 129.99,
                    'product_type': 'materials',
                    'is_tutorial': False,
                    'is_marking': False,
                },
                {
                    'product_name': 'Tutorial - Management Accounting Weekend Course',
                    'subject_code': 'MA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 299.99,
                    'line_total': 299.99,
                    'product_type': 'tutorial',
                    'is_tutorial': True,
                    'is_marking': False,
                },
                {
                    'product_name': 'Marking Service - Practice Exam',
                    'subject_code': 'FA',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 49.99,
                    'line_total': 49.99,
                    'product_type': 'marking',
                    'is_tutorial': False,
                    'is_marking': True,
                }
            ]
            base_order['total_amount'] = 479.97
            base_order['subtotal'] = 399.97
            base_order['vat_amount'] = 80.00
            base_order['is_tutorial'] = True  # Has tutorial items
        
        return base_order

    def _show_expected_attachments(self, scenario):
        """Show which attachments should be included for each scenario."""
        attachments = []
        
        # BPP Complaints Procedure is always included
        attachments.append("📎 BPP Complaints Procedure.pdf (Always included)")
        
        if scenario in ['materials', 'marking', 'mixed']:
            attachments.append("📎 ActEd Distance Learning T&Cs.pdf (For materials/marking)")
        
        if scenario in ['tutorial', 'mixed']:
            attachments.append("📎 ActEd Classroom T&Cs.pdf (For tutorials)")
        
        for attachment in attachments:
            self.stdout.write(f"  {attachment}")
        
        self.stdout.write(f"\nTotal expected attachments: {len(attachments)}") 