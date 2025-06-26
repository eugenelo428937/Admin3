import logging
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from utils.models import EmailTemplate, EmailSettings, EmailAttachment

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Setup default email templates and settings for the email management system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing templates if they exist'
        )
        
        parser.add_argument(
            '--user',
            type=str,
            help='Username of the user to assign as creator of templates'
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        username = options.get('user')
        
        # Get user if specified
        user = None
        if username:
            try:
                user = User.objects.get(username=username)
                self.stdout.write(f'Using user: {user.username}')
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User {username} not found, proceeding without user assignment'))
        
        try:
            self.setup_email_templates(overwrite, user)
            self.setup_email_settings(overwrite, user)
            self.setup_default_attachments(overwrite)
            
            self.stdout.write(self.style.SUCCESS('Email templates and settings setup completed successfully!'))
            
        except Exception as e:
            raise CommandError(f'Setup failed: {str(e)}')

    def setup_email_templates(self, overwrite, user):
        """Setup default email templates."""
        self.stdout.write('Setting up email templates...')
        
        templates = [
            {
                'name': 'order_confirmation',
                'template_type': 'order_confirmation',
                'display_name': 'Order Confirmation Email',
                'description': 'Email sent to customers when their order is confirmed',
                'subject_template': 'Order Confirmation - #{{ order.order_number }}',
                'content_template_name': 'order_confirmation_content',
                'use_master_template': True,
                'default_priority': 'high',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 3,
                'retry_delay_minutes': 5,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'password_reset',
                'template_type': 'password_reset',
                'display_name': 'Password Reset Request',
                'description': 'Email sent when user requests password reset',
                'subject_template': 'Password Reset Request - ActEd',
                'content_template_name': 'password_reset_content',
                'use_master_template': True,
                'default_priority': 'urgent',
                'enable_tracking': False,
                'enable_queue': False,  # Send immediately for security
                'max_retry_attempts': 2,
                'retry_delay_minutes': 2,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'account_activation',
                'template_type': 'account_activation',
                'display_name': 'Account Activation',
                'description': 'Email sent to activate new user accounts',
                'subject_template': 'Activate Your ActEd Account',
                'content_template_name': 'account_activation_content',
                'use_master_template': True,
                'default_priority': 'high',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 3,
                'retry_delay_minutes': 10,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'email_verification',
                'template_type': 'email_verification',
                'display_name': 'Email Verification',
                'description': 'Email sent to verify new email addresses when users update their profile',
                'subject_template': 'Verify Your New Email Address - ActEd',
                'content_template_name': 'email_verification_content',
                'use_master_template': True,
                'default_priority': 'high',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 3,
                'retry_delay_minutes': 5,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'welcome',
                'template_type': 'welcome',
                'display_name': 'Welcome Email',
                'description': 'Welcome email for new users after account activation',
                'subject_template': 'Welcome to ActEd, {{ user.first_name }}!',
                'content_template_name': 'welcome_content',
                'use_master_template': True,
                'default_priority': 'normal',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 3,
                'retry_delay_minutes': 15,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'newsletter',
                'template_type': 'newsletter',
                'display_name': 'Newsletter',
                'description': 'Monthly newsletter template',
                'subject_template': 'ActEd Newsletter - {{ newsletter.title }}',
                'content_template_name': 'newsletter_content',
                'use_master_template': True,
                'default_priority': 'low',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 2,
                'retry_delay_minutes': 30,
                'enhance_outlook_compatibility': True
            },
            {
                'name': 'sample_email',
                'template_type': 'custom',
                'display_name': 'Sample Email Template',
                'description': 'Sample email demonstrating MJML includes',
                'subject_template': 'Sample Email with MJML Includes',
                'content_template_name': 'sample_email',
                'use_master_template': False,
                'default_priority': 'normal',
                'enable_tracking': True,
                'enable_queue': True,
                'max_retry_attempts': 3,
                'retry_delay_minutes': 5,
                'enhance_outlook_compatibility': True
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            template, created = EmailTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    **template_data,
                    'created_by': user,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created template: {template.display_name}')
            elif overwrite:
                for key, value in template_data.items():
                    setattr(template, key, value)
                template.save()
                updated_count += 1
                self.stdout.write(f'  ↻ Updated template: {template.display_name}')
            else:
                self.stdout.write(f'  - Skipped existing template: {template.display_name}')
        
        self.stdout.write(f'Templates: {created_count} created, {updated_count} updated')

    def setup_email_settings(self, overwrite, user):
        """Setup default email settings."""
        self.stdout.write('Setting up email settings...')
        
        settings = [
            {
                'key': 'default_from_email',
                'setting_type': 'smtp',
                'display_name': 'Default From Email',
                'description': 'Default sender email address for all emails',
                'value': 'noreply@admin3.com',
                'is_required': True,
                'is_sensitive': False
            },
            {
                'key': 'default_reply_to_email',
                'setting_type': 'smtp',
                'display_name': 'Default Reply-To Email',
                'description': 'Default reply-to email address',
                'value': 'support@admin3.com',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'max_queue_processing_batch',
                'setting_type': 'queue',
                'display_name': 'Max Queue Processing Batch Size',
                'description': 'Maximum number of emails to process in one batch',
                'value': 50,
                'is_required': True,
                'is_sensitive': False
            },
            {
                'key': 'queue_processing_interval_seconds',
                'setting_type': 'queue',
                'display_name': 'Queue Processing Interval',
                'description': 'Interval in seconds between queue processing batches',
                'value': 30,
                'is_required': True,
                'is_sensitive': False
            },
            {
                'key': 'enable_email_tracking',
                'setting_type': 'tracking',
                'display_name': 'Enable Email Tracking',
                'description': 'Enable open and click tracking for emails',
                'value': True,
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'tracking_pixel_url',
                'setting_type': 'tracking',
                'display_name': 'Tracking Pixel URL',
                'description': 'Base URL for email tracking pixels',
                'value': 'http://127.0.0.1:8888/api/email/track',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'company_name',
                'setting_type': 'template',
                'display_name': 'Company Name',
                'description': 'Company name used in email templates',
                'value': 'BPP Actuarial Education',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'company_address',
                'setting_type': 'template',
                'display_name': 'Company Address',
                'description': 'Company address for email footers',
                'value': 'BPP Professional Education, Waterloo Place, London SW1Y 4AU',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'support_email',
                'setting_type': 'template',
                'display_name': 'Support Email',
                'description': 'Support email address shown in templates',
                'value': 'support@bpp.com',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'support_phone',
                'setting_type': 'template',
                'display_name': 'Support Phone',
                'description': 'Support phone number shown in templates',
                'value': '+44 (0) 20 7430 4000',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'unsubscribe_url',
                'setting_type': 'template',
                'display_name': 'Unsubscribe URL',
                'description': 'URL for email unsubscribe page',
                'value': 'http://127.0.0.1:3000/unsubscribe',
                'is_required': False,
                'is_sensitive': False
            },
            {
                'key': 'privacy_policy_url',
                'setting_type': 'template',
                'display_name': 'Privacy Policy URL',
                'description': 'URL for privacy policy page',
                'value': 'http://127.0.0.1:3000/privacy',
                'is_required': False,
                'is_sensitive': False
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for setting_data in settings:
            setting, created = EmailSettings.objects.get_or_create(
                key=setting_data['key'],
                defaults={
                    **setting_data,
                    'updated_by': user,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created setting: {setting.display_name}')
            elif overwrite:
                for key, value in setting_data.items():
                    if key != 'key':  # Don't update the key itself
                        setattr(setting, key, value)
                setting.updated_by = user
                setting.save()
                updated_count += 1
                self.stdout.write(f'  ↻ Updated setting: {setting.display_name}')
            else:
                self.stdout.write(f'  - Skipped existing setting: {setting.display_name}')
        
        self.stdout.write(f'Settings: {created_count} created, {updated_count} updated')

    def setup_default_attachments(self, overwrite):
        """Setup default email attachments."""
        self.stdout.write('Setting up default attachments...')
        
        attachments = [
            {
                'name': 'company_logo',
                'display_name': 'Company Logo',
                'attachment_type': 'static',
                'description': 'Company logo for email headers',
                'file_path': 'static/images/logo.png',
                'mime_type': 'image/png',
                'is_conditional': False
            },
            {
                'name': 'terms_and_conditions',
                'display_name': 'Terms and Conditions',
                'attachment_type': 'static',
                'description': 'Company terms and conditions document',
                'file_path': 'static/documents/terms_and_conditions.pdf',
                'mime_type': 'application/pdf',
                'is_conditional': True,
                'condition_rules': {'include_terms': True}
            },
            {
                'name': 'course_brochure',
                'display_name': 'Course Brochure',
                'attachment_type': 'static',
                'description': 'General course information brochure',
                'file_path': 'static/documents/course_brochure.pdf',
                'mime_type': 'application/pdf',
                'is_conditional': True,
                'condition_rules': {'email_type': 'welcome'}
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for attachment_data in attachments:
            attachment, created = EmailAttachment.objects.get_or_create(
                name=attachment_data['name'],
                defaults={
                    **attachment_data,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created attachment: {attachment.display_name}')
            elif overwrite:
                for key, value in attachment_data.items():
                    setattr(attachment, key, value)
                attachment.save()
                updated_count += 1
                self.stdout.write(f'  ↻ Updated attachment: {attachment.display_name}')
            else:
                self.stdout.write(f'  - Skipped existing attachment: {attachment.display_name}')
        
        self.stdout.write(f'Attachments: {created_count} created, {updated_count} updated') 