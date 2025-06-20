from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from utils.models import (
    EmailTemplate, EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Setup email content insertion rules and placeholders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing content rules and placeholders',
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        
        self.stdout.write('Setting up email content insertion system...')
        
        # Get or create a system user for created_by fields
        try:
            user = User.objects.get(username='system')
        except User.DoesNotExist:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                self.stdout.write(
                    self.style.WARNING('No superuser found. Content rules will be created without created_by.')
                )
        
        # Setup placeholders
        self.setup_placeholders(overwrite, user)
        
        # Setup content rules
        self.setup_content_rules(overwrite, user)
        
        # Associate rules with templates
        self.setup_template_associations(overwrite)
        
        self.stdout.write(
            self.style.SUCCESS('Email content insertion system setup completed!')
        )

    def setup_placeholders(self, overwrite, user):
        """Setup email content placeholders."""
        self.stdout.write('Setting up content placeholders...')
        
        placeholders = [
            {
                'name': 'TUTORIAL_CONTENT',
                'display_name': 'Tutorial-Specific Content',
                'description': 'Content shown when tutorial products are ordered',
                'default_content': '',
                'is_required': False,
                'allow_multiple_rules': True,
                'content_separator': '\n\n'
            },
            {
                'name': 'REGIONAL_CONTENT',
                'display_name': 'Regional/Country-Specific Content',
                'description': 'Content based on customer location or country',
                'default_content': '',
                'is_required': False,
                'allow_multiple_rules': False,
                'content_separator': '\n'
            },
            {
                'name': 'PRODUCT_SPECIFIC_CONTENT',
                'display_name': 'Product-Specific Content',
                'description': 'Content based on specific products in the order',
                'default_content': '',
                'is_required': False,
                'allow_multiple_rules': True,
                'content_separator': '\n\n'
            },
            {
                'name': 'PROMOTIONAL_CONTENT',
                'display_name': 'Promotional Content',
                'description': 'Special offers or promotional messages',
                'default_content': '',
                'is_required': False,
                'allow_multiple_rules': False,
                'content_separator': '\n'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for placeholder_data in placeholders:
            placeholder, created = EmailContentPlaceholder.objects.get_or_create(
                name=placeholder_data['name'],
                defaults=placeholder_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"Created placeholder: {placeholder.name}")
            elif overwrite:
                for key, value in placeholder_data.items():
                    setattr(placeholder, key, value)
                placeholder.save()
                updated_count += 1
                self.stdout.write(f"Updated placeholder: {placeholder.name}")
        
        self.stdout.write(f"Placeholders: {created_count} created, {updated_count} updated")

    def setup_content_rules(self, overwrite, user):
        """Setup sample content rules."""
        self.stdout.write('Setting up content rules...')
        
        rules = [
            {
                'name': 'Tutorial Product Information',
                'description': 'Shows additional information when tutorial products are ordered',
                'rule_type': 'product_based',
                'condition_field': 'items.is_tutorial',
                'condition_operator': 'equals',
                'condition_value': True,
                'placeholder_name': 'TUTORIAL_CONTENT',
                'priority': 10,
                'is_exclusive': False,
                'content_template': '''
<mj-text align="left" css-class="content-text" padding-top="16px">
    <span style="color: #2c3e50; font-weight: 600;">Tutorial Information:</span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        Please note that you have ordered tutorial products. You will receive separate 
        communication regarding tutorial booking arrangements and available dates.
        Tutorial bookings are subject to availability and must be made in advance.
    </span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        For tutorial enquiries, please contact our Tutorial Team at 
        <a href="mailto:tutorials@bpp.com">tutorials@bpp.com</a> 
        or call +44 1235 550005.
    </span>
</mj-text>
                '''.strip(),
                'content_variables': {
                    'tutorial_email': 'tutorials@bpp.com',
                    'tutorial_phone': '+44 1235 550005'
                }
            },
            {
                'name': 'South Africa Shipping Notice',
                'description': 'Special shipping information for South African customers',
                'rule_type': 'location_based',
                'condition_field': 'user.country',
                'condition_operator': 'equals',
                'condition_value': 'South Africa',
                'placeholder_name': 'REGIONAL_CONTENT',
                'priority': 20,
                'is_exclusive': True,
                'content_template': '''
<mj-text align="left" css-class="content-text" padding-top="16px">
    <span style="color: #2c3e50; font-weight: 600;">Important Information for South African Customers:</span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        Please allow 10-15 working days for delivery to South Africa. 
        International shipping charges and customs duties may apply. 
        You may be contacted by our shipping partner for additional documentation.
    </span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        For assistance with international orders, please contact our International Team at 
        <a href="mailto:international@bpp.com">international@bpp.com</a>.
    </span>
</mj-text>
                '''.strip(),
                'content_variables': {
                    'international_email': 'international@bpp.com',
                    'delivery_days': '10-15 working days'
                }
            },
            {
                'name': 'High Value Order Notice',
                'description': 'Special notice for orders over £500',
                'rule_type': 'order_value',
                'condition_field': 'total_amount',
                'condition_operator': 'greater_than',
                'condition_value': 500,
                'placeholder_name': 'PRODUCT_SPECIFIC_CONTENT',
                'priority': 15,
                'is_exclusive': False,
                'content_template': '''
<mj-text align="left" css-class="content-text" padding-top="16px">
    <span style="color: #2c3e50; font-weight: 600;">High Value Order:</span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        Thank you for your substantial investment in your professional development. 
        As a valued customer with a high-value order, you are entitled to priority 
        customer support. Please quote reference "HVO-{{ order_number }}" when contacting us.
    </span>
</mj-text>
                '''.strip(),
                'content_variables': {
                    'priority_support': True
                }
            },
            {
                'name': 'Mock Exam Product Notice',
                'description': 'Information for customers ordering mock exams',
                'rule_type': 'product_based',
                'condition_field': 'items.product_code',
                'condition_operator': 'contains',
                'condition_value': 'MOCK',
                'placeholder_name': 'PRODUCT_SPECIFIC_CONTENT',
                'priority': 12,
                'is_exclusive': False,
                'content_template': '''
<mj-text align="left" css-class="content-text" padding-top="16px">
    <span style="color: #2c3e50; font-weight: 600;">Mock Exam Information:</span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        You have ordered mock examination materials. These are designed to simulate 
        the actual exam experience and help you prepare effectively. Answer guides 
        and marking schemes are included with your purchase.
    </span>
</mj-text>
<mj-text align="left" css-class="content-text">
    <span>
        For best results, attempt the mock exams under timed conditions before 
        referring to the answer guides.
    </span>
</mj-text>
                '''.strip(),
                'content_variables': {
                    'exam_type': 'mock'
                }
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for rule_data in rules:
            rule, created = EmailContentRule.objects.get_or_create(
                name=rule_data['name'],
                defaults={**rule_data, 'created_by': user} if user else rule_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"Created content rule: {rule.name}")
            elif overwrite:
                for key, value in rule_data.items():
                    setattr(rule, key, value)
                rule.save()
                updated_count += 1
                self.stdout.write(f"Updated content rule: {rule.name}")
        
        self.stdout.write(f"Content rules: {created_count} created, {updated_count} updated")

    def setup_template_associations(self, overwrite):
        """Associate content rules with email templates."""
        self.stdout.write('Setting up template associations...')
        
        try:
            order_confirmation_template = EmailTemplate.objects.get(name='order_confirmation')
        except EmailTemplate.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Order confirmation template not found. Skipping associations.')
            )
            return
        
        # Get all content rules
        content_rules = EmailContentRule.objects.filter(is_active=True)
        
        created_count = 0
        
        for rule in content_rules:
            association, created = EmailTemplateContentRule.objects.get_or_create(
                template=order_confirmation_template,
                content_rule=rule,
                defaults={
                    'is_enabled': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"Associated rule '{rule.name}' with template '{order_confirmation_template.name}'")
        
        self.stdout.write(f"Template associations: {created_count} created") 