from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from utils.models import (
    EmailTemplate, EmailAttachment, EmailTemplateAttachment
)
import os


class Command(BaseCommand):
    help = 'Setup conditional email attachments for order confirmation emails'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing attachment configurations',
        )

    def handle(self, *args, **options):
        overwrite = options.get('overwrite', False)
        
        self.stdout.write("Setting up order confirmation email attachments...")
        
        # Get or create order confirmation template
        template, created = EmailTemplate.objects.get_or_create(
            name='order_confirmation',
            defaults={
                'template_type': 'order_confirmation',
                'display_name': 'Order Confirmation Email',
                'description': 'Email sent to customers when they complete an order',
                'subject_template': 'Order Confirmation - #{order_number}',
                'content_template_name': 'order_confirmation_content',
                'use_master_template': True,
                'enable_queue': True,
                'default_priority': 'high',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created order_confirmation template"))
        else:
            self.stdout.write(f"Using existing order_confirmation template")

        # Setup attachments
        attachments_config = [
            {
                'name': 'bpp_complaints_procedure',
                'display_name': 'BPP Complaints Procedure.pdf',
                'description': 'BPP Complaints Procedure document included in all order confirmation emails',
                'file_path': 'static/documents/BPP Complaints Procedure.pdf',
                'condition_rules': {
                    'include_always': True,
                    'description': 'Included in all order confirmation emails'
                },
                'is_required': True,
                'order': 1
            },
            {
                'name': 'acted_distance_learning_tcs',
                'display_name': 'ActEd Distance Learning T&Cs.pdf',
                'description': 'ActEd Distance Learning Terms and Conditions for materials and marking products',
                'file_path': 'static/documents/ActEd Distance Learning T&Cs.pdf',
                'condition_rules': {
                    'include_for_product_types': ['materials', 'marking'],
                    'description': 'Included for materials and marking products'
                },
                'is_required': False,
                'order': 2
            },
            {
                'name': 'acted_classroom_tcs',
                'display_name': 'ActEd Classroom T&Cs.pdf',
                'description': 'ActEd Classroom Terms and Conditions for tutorial products',
                'file_path': 'static/documents/ActEd Classroom T&Cs.pdf',
                'condition_rules': {
                    'include_for_product_types': ['tutorial'],
                    'description': 'Included for tutorial products'
                },
                'is_required': False,
                'order': 3
            }
        ]

        for attachment_config in attachments_config:
            # Create or update attachment
            attachment, created = EmailAttachment.objects.get_or_create(
                name=attachment_config['name'],
                defaults={
                    'display_name': attachment_config['display_name'],
                    'attachment_type': 'static',
                    'file_path': attachment_config['file_path'],
                    'description': attachment_config['description'],
                    'is_conditional': True,
                    'condition_rules': attachment_config['condition_rules'],
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created attachment: {attachment.name}"))
            else:
                if overwrite:
                    # Update existing attachment
                    attachment.display_name = attachment_config['display_name']
                    attachment.file_path = attachment_config['file_path']
                    attachment.description = attachment_config['description']
                    attachment.condition_rules = attachment_config['condition_rules']
                    attachment.save()
                    self.stdout.write(self.style.SUCCESS(f"✓ Updated attachment: {attachment.name}"))
                else:
                    self.stdout.write(f"- Using existing attachment: {attachment.name}")

            # Create or update template-attachment association
            template_attachment, created = EmailTemplateAttachment.objects.get_or_create(
                template=template,
                attachment=attachment,
                defaults={
                    'is_required': attachment_config['is_required'],
                    'order': attachment_config['order'],
                    'include_condition': self._build_include_condition(attachment_config['condition_rules'])
                }
            )
            
            if created:
                self.stdout.write(f"  ✓ Associated with order_confirmation template")
            else:
                if overwrite:
                    template_attachment.is_required = attachment_config['is_required']
                    template_attachment.order = attachment_config['order']
                    template_attachment.include_condition = self._build_include_condition(attachment_config['condition_rules'])
                    template_attachment.save()
                    self.stdout.write(f"  ✓ Updated template association")
                else:
                    self.stdout.write(f"  - Using existing template association")

        self.stdout.write(self.style.SUCCESS("\n📎 Order confirmation email attachments setup completed!"))
        self.stdout.write("\nAttachment Rules:")
        self.stdout.write("1. BPP Complaints Procedure - Included in ALL order confirmation emails")
        self.stdout.write("2. ActEd Distance Learning T&Cs - Included for materials and marking products")
        self.stdout.write("3. ActEd Classroom T&Cs - Included for tutorial products")
        
        # Display current attachments
        self.stdout.write(f"\nConfigured attachments:")
        for template_attachment in EmailTemplateAttachment.objects.filter(template=template).order_by('order'):
            attachment = template_attachment.attachment
            self.stdout.write(f"  • {attachment.display_name}")
            self.stdout.write(f"    Path: {attachment.file_path}")
            self.stdout.write(f"    Required: {'Yes' if template_attachment.is_required else 'No'}")
            self.stdout.write(f"    Condition: {attachment.condition_rules.get('description', 'No description')}")
            
            # Check if file exists
            file_path = os.path.join('static', 'documents', attachment.display_name)
            if os.path.exists(file_path):
                self.stdout.write(self.style.SUCCESS(f"    File exists: ✓"))
            else:
                self.stdout.write(self.style.WARNING(f"    File not found: {file_path}"))
            self.stdout.write("")

    def _build_include_condition(self, condition_rules):
        """Build the include condition JSON for template attachment."""
        if condition_rules.get('include_always'):
            return {
                'type': 'always_include',
                'description': 'Always include this attachment'
            }
        elif 'include_for_product_types' in condition_rules:
            return {
                'type': 'product_type_based',
                'product_types': condition_rules['include_for_product_types'],
                'logic': 'any',  # Include if ANY product in order matches these types
                'description': f"Include for product types: {', '.join(condition_rules['include_for_product_types'])}"
            }
        else:
            return {
                'type': 'no_condition',
                'description': 'No specific condition'
            } 