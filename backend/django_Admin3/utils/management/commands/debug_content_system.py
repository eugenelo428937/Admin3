from django.core.management.base import BaseCommand
from utils.models import EmailTemplate, EmailContentRule, EmailContentPlaceholder, EmailTemplateContentRule


class Command(BaseCommand):
    help = 'Debug the email content insertion system'

    def handle(self, *args, **options):
        self.stdout.write('=== EMAIL CONTENT INSERTION SYSTEM DEBUG ===\n')
        
        # Check templates
        templates = EmailTemplate.objects.all()
        self.stdout.write(f'Email Templates ({templates.count()}):')
        for template in templates:
            self.stdout.write(f'  - {template.name} ({template.template_type})')
        
        # Check placeholders
        placeholders = EmailContentPlaceholder.objects.all()
        self.stdout.write(f'\nEmail Content Placeholders ({placeholders.count()}):')
        for placeholder in placeholders:
            self.stdout.write(f'  - {placeholder.name}: {placeholder.display_name}')
            associated_templates = placeholder.templates.all()
            if associated_templates:
                self.stdout.write(f'    Associated with: {[t.name for t in associated_templates]}')
            else:
                self.stdout.write(f'    No template associations')
        
        # Check content rules
        rules = EmailContentRule.objects.all()
        self.stdout.write(f'\nEmail Content Rules ({rules.count()}):')
        for rule in rules:
            self.stdout.write(f'  - {rule.name} ({rule.rule_type}) -> {rule.placeholder_name}')
            self.stdout.write(f'    Condition: {rule.condition_field} {rule.condition_operator} {rule.condition_value}')
            self.stdout.write(f'    Priority: {rule.priority}, Active: {rule.is_active}')
        
        # Check template-rule associations
        associations = EmailTemplateContentRule.objects.all()
        self.stdout.write(f'\nTemplate-Rule Associations ({associations.count()}):')
        for assoc in associations:
            self.stdout.write(f'  - {assoc.template.name} + {assoc.content_rule.name}')
            self.stdout.write(f'    Enabled: {assoc.is_enabled}, Priority: {assoc.effective_priority}')
        
        # Fix missing associations
        self.stdout.write('\n=== FIXING ASSOCIATIONS ===')
        
        # Associate all placeholders with order_confirmation template
        try:
            order_template = EmailTemplate.objects.get(name='order_confirmation')
            for placeholder in placeholders:
                placeholder.templates.add(order_template)
                self.stdout.write(f'Associated {placeholder.name} with {order_template.name}')
        except EmailTemplate.DoesNotExist:
            self.stdout.write('order_confirmation template not found!')
        
        self.stdout.write('\nDebug completed!') 