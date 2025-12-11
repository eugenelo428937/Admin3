import logging
import os
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string, get_template
from django.conf import settings
from premailer import transform
from mjml import mjml2html
from typing import Dict, List, Optional
from django.utils import timezone

logger = logging.getLogger(__name__)

# Suppress CSS parser warnings (cssutils) that are non-critical
logging.getLogger('cssutils').setLevel(logging.CRITICAL)
logging.getLogger('premailer').setLevel(logging.WARNING)

class EmailService:
    """
    Email service with responsive template support and cross-client compatibility.
    Handles confirmation emails, password resets, and order notifications.
    Now integrated with queue system and email models.
    """

    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@admin3.com')
        self.reply_to_email = getattr(settings, 'DEFAULT_REPLY_TO_EMAIL', None)
        self.base_template_dir = 'emails'
        self.mjml_template_dir = 'emails/mjml'
        
    def _handle_dev_email_override(self, to_emails: List[str], context: Dict) -> List[str]:
        """
        Handle development environment email override.

        Args:
            to_emails: Original recipient email addresses
            context: Email template context

        Returns:
            List[str]: Modified recipient list for development, original list for production
        """
        # Check if we're in development mode and override is enabled
        dev_override = getattr(settings, 'DEV_EMAIL_OVERRIDE', False)
        dev_recipients = getattr(settings, 'DEV_EMAIL_RECIPIENTS', [])

        if dev_override and dev_recipients and settings.DEBUG:
            # Store original recipients in context for display in email
            original_recipients = to_emails.copy()
            context['dev_original_recipients'] = original_recipients
            context['dev_mode_active'] = True

            return dev_recipients

        # In production or when override is disabled, return original recipients
        context['dev_mode_active'] = False
        return to_emails

    def _get_bcc_recipients(self) -> List[str]:
        """
        Get BCC monitoring recipients if enabled.

        Returns:
            List[str]: List of BCC recipients, or empty list if monitoring disabled
        """
        bcc_monitoring = getattr(settings, 'EMAIL_BCC_MONITORING', False)
        bcc_recipients = getattr(settings, 'EMAIL_BCC_RECIPIENTS', [])

        if bcc_monitoring and bcc_recipients:
            logger.info(f"Email BCC monitoring enabled. BCC recipients: {bcc_recipients}")
            return bcc_recipients

        return []
        
    def send_templated_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None,
        use_mjml: bool = True,
        enhance_outlook_compatibility: bool = True,
        use_queue: bool = None,
        priority: str = 'normal',
        scheduled_at = None,
        user = None
    ) -> bool:
        """
        Send email using MJML or HTML template with cross-client compatibility.
        
        Args:
            template_name: Name of the email template (without extension)
            context: Template context variables
            to_emails: List of recipient email addresses
            subject: Email subject
            from_email: Sender email (optional)
            use_mjml: Whether to use MJML template (default: True)
            enhance_outlook_compatibility: Apply additional Premailer processing to MJML output for better Outlook support
            use_queue: Whether to queue the email (None = use template setting)
            priority: Email priority for queue
            scheduled_at: When to send the email (for queuing)
            user: User who initiated the email
            
        Returns:
            bool: True if email sent/queued successfully
        """
        # Handle development email override
        actual_recipients = self._handle_dev_email_override(to_emails, context)
        
        # Check if we should use the queue system
        should_use_queue = self._should_use_queue(template_name, use_queue)
        
        if should_use_queue:
            return self._queue_email(
                template_name=template_name,
                context=context,
                to_emails=actual_recipients,
                subject=subject,
                from_email=from_email,
                use_mjml=use_mjml,
                enhance_outlook_compatibility=enhance_outlook_compatibility,
                priority=priority,
                scheduled_at=scheduled_at,
                user=user
            )
        else:
            # Send immediately using existing logic
            if use_mjml:
                # Core email types always use master template approach - handle them directly
                core_email_types = {
                    'order_confirmation': 'order_confirmation_content',
                    'password_reset': 'password_reset_content',
                    'password_reset_completed': 'password_reset_completed_content',
                    'account_activation': 'account_activation_content',
                    'email_verification': 'email_verification_content'
                }
                
                if template_name in core_email_types:
                    return self._send_mjml_email(
                        template_name, 
                        context, 
                        actual_recipients, 
                        subject, 
                        from_email,
                        enhance_outlook_compatibility
                    )
                
                # For non-core email types, try MJML template first
                try:
                    mjml_template_path = f'{self.mjml_template_dir}/{template_name}.mjml'
                    get_template(mjml_template_path)  # Check if MJML template exists
                    return self._send_mjml_email(
                        template_name, 
                        context, 
                        actual_recipients, 
                        subject, 
                        from_email,
                        enhance_outlook_compatibility
                    )
                except Exception as e:
                    pass
            
            # Fallback to regular HTML template
            return self._send_html_email(template_name, context, actual_recipients, subject, from_email)
    
    def _should_use_queue(self, template_name: str, use_queue_override: bool = None) -> bool:
        """Determine if email should be queued based on template configuration."""
        if use_queue_override is not None:
            return use_queue_override
        
        try:
            from .models import EmailTemplate
            template = EmailTemplate.objects.get(name=template_name, is_active=True)
            return template.enable_queue
        except EmailTemplate.DoesNotExist:
            # Default to immediate send if no template config found
            return False
        except Exception as e:
            logger.warning(f"Error checking template queue setting: {str(e)}")
            return False
    
    def _queue_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: str = None,
        use_mjml: bool = True,
        enhance_outlook_compatibility: bool = True,
        priority: str = 'normal',
        scheduled_at = None,
        user = None
    ) -> bool:
        """Queue email for later processing."""
        try:
            from .services.queue_service import email_queue_service
            
            queue_item = email_queue_service.queue_email(
                template_name=template_name,
                to_emails=to_emails,
                context=context,
                subject_override=subject,
                from_email=from_email,
                priority=priority,
                scheduled_at=scheduled_at,
                user=user
            )

            return True
            
        except Exception as e:
            logger.error(f"Failed to queue email: {str(e)}")
            # Fallback to immediate send
            return self._send_mjml_email(
                template_name, context, to_emails, subject, from_email, enhance_outlook_compatibility
            ) if use_mjml else self._send_html_email(template_name, context, to_emails, subject, from_email)
    
    def _send_mjml_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None,
        enhance_outlook_compatibility: bool = False
    ) -> Dict:
        """Send email using MJML template with automatic HTML conversion and return detailed response."""
        response_data = {
            'success': False,
            'response_code': None,
            'response_message': None,
            'esp_response': {},
            'esp_message_id': None,
            'error_details': {}
        }
        
        try:
            # Check if this is a core email type that should use the master template approach
            core_email_types = {
                'order_confirmation': 'order_confirmation_content',
                'password_reset': 'password_reset_content',
                'password_reset_completed': 'password_reset_completed_content',
                'account_activation': 'account_activation_content',
                'email_verification': 'email_verification_content'
            }
            
            if template_name in core_email_types:
                # Use master template approach for core email types
                content_template = core_email_types[template_name]

                # Render using master template
                mjml_content = self._render_email_with_master_template(
                    content_template=content_template,
                    context=context,
                    email_title=subject,
                    email_preview=f"Email from ActEd"
                )
                
                # Send using the pre-rendered content method
                return self._send_mjml_email_from_content(
                    mjml_content=mjml_content,
                    context=context,
                    to_emails=to_emails,
                    subject=subject,
                    from_email=from_email,
                    enhance_outlook_compatibility=enhance_outlook_compatibility
                )
            
            # For non-core email types, try the standalone MJML template approach
            # Render MJML template with Django context
            mjml_template = f'{self.mjml_template_dir}/{template_name}.mjml'
            
            mjml_content = render_to_string(mjml_template, context)
            
            # Send using the pre-rendered content method
            return self._send_mjml_email_from_content(
                mjml_content=mjml_content,
                context=context,
                to_emails=to_emails,
                subject=subject,
                from_email=from_email,
                enhance_outlook_compatibility=enhance_outlook_compatibility
            )
            
        except Exception as e:
            # Handle template not found or other errors
            error_type = type(e).__name__
            error_message = str(e)
            
            response_data.update({
                'success': False,
                'response_code': '500',
                'response_message': f'MJML template processing failed: {error_message}',
                'esp_response': {
                    'error_type': error_type,
                    'error_message': error_message,
                    'template_name': template_name,
                    'processing_stage': 'template_rendering',
                    'timestamp': timezone.now().isoformat()
                },
                'error_details': {
                    'exception_type': error_type,
                    'exception_message': error_message,
                    'template_name': template_name,
                    'processing_stage': 'template_rendering'
                }
            })
            
            logger.error(f"Failed to send MJML email to {to_emails}: {error_message}")
            
            return response_data
    
    def _send_mjml_email_from_content(
        self,
        mjml_content: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None,
        enhance_outlook_compatibility: bool = False,
        attachments: List[Dict] = None
    ) -> Dict:
        """
        Send email from pre-rendered MJML content and return detailed response information.
        
        Returns:
            Dict: Contains 'success', 'response_code', 'response_message', 'esp_response', 'esp_message_id'
        """
        response_data = {
            'success': False,
            'response_code': None,
            'response_message': None,
            'esp_response': {},
            'esp_message_id': None,
            'error_details': {}
        }
        
        try:
            # Handle development email override
            actual_recipients = self._handle_dev_email_override(to_emails, context)
            
            # Define include loader for mjml-python
            import os
            from django.conf import settings
            
            mjml_base_path = os.path.join(
                settings.BASE_DIR, 
                'utils', 
                'templates', 
                'emails', 
                'mjml'
            )
            
            def include_loader(path: str) -> str:
                """Load included MJML files for mjml-python with Django template processing."""
                try:
                    # Normalize the path to remove ./ prefix and other path issues
                    normalized_path = path.lstrip('./')
                    
                    # Process the include file as a Django template with context
                    include_template_path = f'{self.mjml_template_dir}/{normalized_path}'
                    rendered_content = render_to_string(include_template_path, context)
                    return rendered_content
                except Exception as e:
                    # Fallback to reading raw file if Django template processing fails
                    normalized_path = path.lstrip('./')
                    include_path = os.path.join(mjml_base_path, normalized_path)
                    try:
                        with open(include_path, 'r', encoding='utf-8') as f:
                            logger.warning(f"Django template processing failed for {normalized_path}, using raw file: {str(e)}")
                            return f.read()
                    except FileNotFoundError:
                        logger.error(f"MJML include file not found: {include_path}")
                        return f"<!-- Include not found: {normalized_path} -->"
                    except Exception as fallback_error:
                        logger.error(f"Error loading MJML include {normalized_path}: {str(fallback_error)}")
                        return f"<!-- Error loading include: {normalized_path} -->"
            
            # Convert MJML to HTML using mjml-python with include support
            html_content = mjml2html(
                mjml_content,
                include_loader=include_loader
            )

            # Enhanced Outlook compatibility: Apply Premailer post-processing to MJML output
            if enhance_outlook_compatibility:
                html_content = self._enhance_outlook_compatibility(html_content)
            
            # Create simple text version
            text_content = self._html_to_text(html_content)

            # Get BCC monitoring recipients if enabled
            bcc_recipients = self._get_bcc_recipients()

            # Create email message with Reply-To header
            reply_to = [self.reply_to_email] if self.reply_to_email else None
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email or self.from_email,
                to=actual_recipients,
                bcc=bcc_recipients if bcc_recipients else None,
                reply_to=reply_to
            )

            # Attach HTML version
            email.attach_alternative(html_content, "text/html")

            # Add file attachments if provided
            if attachments:
                self._attach_files_to_email(email, attachments)
            
            # Send email and capture detailed response
            try:
                # Capture the actual SMTP response
                send_result = email.send()
                
                # Extract response details based on Django email backend
                backend_name = getattr(settings, 'EMAIL_BACKEND', 'unknown')
                
                if send_result > 0:
                    # Email sent successfully
                    response_data.update({
                        'success': True,
                        'response_code': '250',  # Standard SMTP success code
                        'response_message': f'Email sent successfully to {len(actual_recipients)} recipients',
                        'esp_response': {
                            'backend': backend_name,
                            'send_result': send_result,
                            'recipients_count': len(actual_recipients),
                            'recipients': actual_recipients,
                            'message_size': len(html_content) + len(text_content),
                            'timestamp': timezone.now().isoformat()
                        }
                    })
                    
                    # Try to extract message ID if available (depends on backend)
                    if hasattr(email, 'extra_headers') and 'Message-ID' in email.extra_headers:
                        response_data['esp_message_id'] = email.extra_headers['Message-ID']
                    
                else:
                    # Send failed
                    response_data.update({
                        'success': False,
                        'response_code': '554',  # SMTP permanent failure
                        'response_message': 'Email sending failed - no recipients processed',
                        'esp_response': {
                            'backend': backend_name,
                            'send_result': send_result,
                            'error': 'No recipients processed',
                            'timestamp': timezone.now().isoformat()
                        }
                    })
                
            except Exception as smtp_error:
                # Capture detailed SMTP error information
                error_type = type(smtp_error).__name__
                error_message = str(smtp_error)
                
                response_data.update({
                    'success': False,
                    'response_code': getattr(smtp_error, 'smtp_code', '550'),
                    'response_message': error_message,
                    'esp_response': {
                        'backend': getattr(settings, 'EMAIL_BACKEND', 'unknown'),
                        'error_type': error_type,
                        'error_message': error_message,
                        'smtp_code': getattr(smtp_error, 'smtp_code', None),
                        'smtp_error': getattr(smtp_error, 'smtp_error', None),
                        'timestamp': timezone.now().isoformat()
                    },
                    'error_details': {
                        'exception_type': error_type,
                        'exception_message': error_message,
                        'smtp_code': getattr(smtp_error, 'smtp_code', None),
                        'smtp_error': getattr(smtp_error, 'smtp_error', None)
                    }
                })
                
                logger.error(f"SMTP error sending email to {actual_recipients}: {error_message}")
                raise smtp_error

        except Exception as e:
            # Capture any other errors
            error_type = type(e).__name__
            error_message = str(e)
            
            response_data.update({
                'success': False,
                'response_code': '500',
                'response_message': f'Email processing failed: {error_message}',
                'esp_response': {
                    'error_type': error_type,
                    'error_message': error_message,
                    'processing_stage': 'content_generation_or_sending',
                    'timestamp': timezone.now().isoformat()
                },
                'error_details': {
                    'exception_type': error_type,
                    'exception_message': error_message,
                    'processing_stage': 'content_generation_or_sending'
                }
            })
            
            logger.error(f"Failed to send dynamic MJML email to {to_emails}: {error_message}")
        
        return response_data
    
    def _enhance_outlook_compatibility(self, html_content: str) -> str:
        """
        Apply additional Premailer processing to MJML-generated HTML for enhanced Outlook compatibility.
        
        Args:
            html_content: MJML-generated HTML content
            
        Returns:
            str: Enhanced HTML with better Outlook compatibility
        """
        try:
            # Apply Premailer with Outlook-specific settings
            enhanced_html = transform(
                html_content,
                base_url=getattr(settings, 'BASE_URL', 'http://127.0.0.1:8888'),
                
                # CSS Processing
                remove_classes=False,  # Keep classes for non-Outlook clients
                strip_important=False,  # Keep !important declarations
                keep_style_tags=True,   # Keep style tags for fallbacks
                
                # Outlook-specific optimizations
                cssutils_logging_level=logging.ERROR,  # Reduce CSS parsing noise
                
                # Additional transformations for Outlook
                external_styles=None,  # Don't try to fetch external stylesheets
                
                # Preserve certain attributes that Outlook needs
                preserve_internal_links=True,
                
                # Table and layout optimizations
                exclude_pseudoclasses=True,  # Remove pseudo-classes that Outlook doesn't support
            )
            
            # Additional Outlook-specific fixes
            enhanced_html = self._apply_outlook_specific_fixes(enhanced_html)

            return enhanced_html
            
        except Exception as e:
            logger.warning(f"Failed to enhance Outlook compatibility: {str(e)}, returning original HTML")
            return html_content
    
    def _apply_outlook_specific_fixes(self, html_content: str) -> str:
        """Apply specific fixes for Outlook rendering issues."""
        
        # Fix 1: Ensure proper DOCTYPE for Outlook
        if not html_content.strip().startswith('<!DOCTYPE'):
            html_content = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + html_content
        
        # Fix 2: Add Outlook-specific meta tags if missing
        outlook_meta = '''<!--[if gte mso 9]>
        <xml>
        <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->'''
        
        if '<!--[if gte mso 9]>' not in html_content:
            # Insert after <head> tag
            html_content = html_content.replace('<head>', f'<head>\n{outlook_meta}')
        
        # Fix 3: Ensure tables have proper cellpadding and cellspacing for Outlook
        import re
        
        # Add cellpadding="0" cellspacing="0" to tables that don't have them
        def fix_table_attributes(match):
            table_tag = match.group(0)
            if 'cellpadding=' not in table_tag:
                table_tag = table_tag.replace('<table', '<table cellpadding="0"')
            if 'cellspacing=' not in table_tag:
                table_tag = table_tag.replace('<table', '<table cellspacing="0"')
            return table_tag
        
        html_content = re.sub(r'<table[^>]*>', fix_table_attributes, html_content)
        
        # Fix 4: Ensure proper line-height inheritance for Outlook
        html_content = html_content.replace(
            'line-height:1;',
            'line-height:1.2; mso-line-height-rule:exactly;'
        )
        
        # Fix 5: Add border="0" to images if missing (Outlook shows borders by default)
        html_content = re.sub(
            r'<img(?![^>]*border=)[^>]*>',
            lambda m: m.group(0).replace('<img', '<img border="0"'),
            html_content
        )
        
        return html_content
    
    def _send_html_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None
    ) -> bool:
        """Fallback method for regular HTML templates."""
        try:
            # Handle development email override
            actual_recipients = self._handle_dev_email_override(to_emails, context)
            
            # Render HTML template
            html_template = f'{self.base_template_dir}/{template_name}.html'
            html_content = render_to_string(html_template, context)
            
            # Inline CSS for better email client compatibility
            html_content = transform(
                html_content,
                base_url=getattr(settings, 'BASE_URL', 'http://127.0.0.1:8888'),
                remove_classes=True,  # Remove class attributes after inlining
                strip_important=False,  # Keep !important declarations
                keep_style_tags=False,  # Remove <style> tags after inlining
            )
            
            # Render plain text version
            try:
                text_template = f'{self.base_template_dir}/{template_name}.txt'
                text_content = render_to_string(text_template, context)
            except:
                # If no text template, create simple text version
                text_content = self._html_to_text(html_content)

            # Get BCC monitoring recipients if enabled
            bcc_recipients = self._get_bcc_recipients()

            # Create email message with Reply-To header
            reply_to = [self.reply_to_email] if self.reply_to_email else None
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email or self.from_email,
                to=actual_recipients,
                bcc=bcc_recipients if bcc_recipients else None,
                reply_to=reply_to
            )

            # Attach HTML version
            email.attach_alternative(html_content, "text/html")

            # Send email
            email.send()

            return True

        except Exception as e:
            logger.error(f"Failed to send HTML email to {to_emails}: {str(e)}")
            return False
    
    def _get_template_placeholders(self, template_name: str) -> Dict[str, str]:
        """
        Get dynamic content placeholders for a specific template.
        
        Args:
            template_name: Name of the email template
            
        Returns:
            Dict: Placeholder names mapped to their placeholder strings
        """
        try:
            from .models import EmailTemplate, EmailContentPlaceholder
            
            # Get template
            template = EmailTemplate.objects.get(name=template_name, is_active=True)
            
            # Get all active placeholders associated with this template
            placeholders = EmailContentPlaceholder.objects.filter(
                templates=template,
                is_active=True
            ).values_list('name', flat=True)
            
            # Create a dictionary mapping placeholder names to their template strings
            placeholder_context = {}
            for placeholder_name in placeholders:
                placeholder_context[placeholder_name] = f'{{{{{placeholder_name}}}}}'

            return placeholder_context
            
        except Exception as e:
            logger.warning(f"Failed to get placeholders for template {template_name}: {str(e)}")
            # Fallback to common placeholders if database query fails
            return {
                'TUTORIAL_CONTENT': '{{TUTORIAL_CONTENT}}',
                'REGIONAL_CONTENT': '{{REGIONAL_CONTENT}}', 
                'PRODUCT_SPECIFIC_CONTENT': '{{PRODUCT_SPECIFIC_CONTENT}}',
            }

    def _render_email_with_master_template(self, content_template: str, context: Dict, email_title: str = None, email_preview: str = None) -> str:
        """
        Render email content using the master template with dynamic content injection.
        
        Args:
            content_template: Name of the content template (e.g., 'order_confirmation_content')
            context: Context data for the content template
            email_title: Email title for the master template
            email_preview: Email preview text for the master template
            
        Returns:
            str: Rendered MJML content with master template
        """
        try:
            # Determine template name from content template
            template_name = content_template.replace('_content', '') if content_template.endswith('_content') else content_template
            
            # Get dynamic content placeholders for this template
            template_placeholders = self._get_template_placeholders(template_name)
            
            # Add placeholders to context to prevent Django from removing them
            placeholder_context = {
                **template_placeholders,  # Dynamic placeholders from database
                **context  # Original context takes precedence
            }
            
            # First, render the specific content template
            content_template_path = f'{self.mjml_template_dir}/{content_template}.mjml'
            rendered_content = render_to_string(content_template_path, placeholder_context)
            
            # Process dynamic content insertion for placeholders
            try:
                from .services.content_insertion_service import content_insertion_service
                
                rendered_content = content_insertion_service.process_template_content(
                    template_name=template_name,
                    content=rendered_content,
                    context=context
                )

            except Exception as content_error:
                logger.warning(f"Failed to process dynamic content insertion: {str(content_error)}")
                # Continue with original content if dynamic content processing fails
            
            # Prepare context for master template
            master_context = {
                'email_title': email_title or 'Email from ActEd',
                'email_preview': email_preview or 'Email from ActEd',
                'email_content': rendered_content,
                **context  # Include original context for any master template variables
            }
            
            # Render the master template with the content injected
            master_template_path = f'{self.mjml_template_dir}/master_template.mjml'
            final_mjml = render_to_string(master_template_path, master_context)
            
            return final_mjml
            
        except Exception as e:
            logger.error(f"Failed to render email with master template: {str(e)}")
            raise Exception(f"Email template rendering failed: {str(e)}")

    def send_order_confirmation(self, user_email: str, order_data: Dict, use_mjml: bool = True, enhance_outlook: bool = True, use_queue: bool = None, user = None) -> bool:
        """Send order confirmation email using master template with dynamic content."""
        
        # Format the order date in Python to avoid MJML template filter issues
        order_created_at = order_data.get('created_at')
        if order_created_at:
            if hasattr(order_created_at, 'strftime'):
                # Format datetime to readable string
                formatted_date = order_created_at.strftime("%B %d, %Y at %I:%M %p")
            else:
                formatted_date = str(order_created_at)
        else:
            formatted_date = "Date not available"
        
        # Create order object for template compatibility
        order_obj = {
            'created_at': order_created_at,  # Keep original for any other uses
            'created_at_formatted': formatted_date,  # Pre-formatted string for display
            'subtotal': order_data.get('subtotal', 0),
            'vat_amount': order_data.get('vat_amount', 0),
            'discount_amount': order_data.get('discount_amount', 0),
        }
        
        context = {
            'order': order_obj,  # Template expects order.created_at
            'customer_name': order_data.get('customer_name', ''),
            'first_name': order_data.get('first_name', ''),
            'last_name': order_data.get('last_name', ''),
            'student_number': order_data.get('student_number', ''),
            'order_number': order_data.get('order_number', ''),
            'total_amount': order_data.get('total_amount', 0),
            'items': order_data.get('items', []),  # Template expects 'items', not 'order_items'
            'item_count': order_data.get('item_count', len(order_data.get('items', []))),
            'total_items': order_data.get('total_items', len(order_data.get('items', []))),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000'),            
            'is_invoice': order_data.get('is_invoice', False),
            'employer_code': order_data.get('employer_code', None),
            'is_digital': order_data.get('is_digital', False),
            'is_tutorial': order_data.get('is_tutorial', False),
            'payment_method': order_data.get('payment_method', 'card'),
        }
        
        # Try to send using the template system - it will automatically handle master template vs standalone
        try:
            if use_queue is False:
                # Send immediately using MJML email method for detailed response
                response_data = self._send_mjml_email(
                    template_name='order_confirmation',
                    context=context,
                    to_emails=[user_email],
                    subject=f"Order Confirmation - #{order_data.get('order_number', '')}",
                    from_email=None,
                    enhance_outlook_compatibility=enhance_outlook
                )
                
                return response_data.get('success', False)
            else:
                # Use queue system (returns boolean from queue_email method)
                return self.send_templated_email(
                    template_name='order_confirmation',
                    context=context,
                    to_emails=[user_email],
                    subject=f"Order Confirmation - #{order_data.get('order_number', '')}",
                    use_mjml=use_mjml,
                    enhance_outlook_compatibility=enhance_outlook,
                    use_queue=use_queue,
                    priority='high',
                    user=user
                )
                
        except Exception as e:
            logger.error(f"Order confirmation email failed for {order_data.get('order_number', 'unknown')} to {user_email}: {str(e)}")
            
            # Try using master template approach directly as last resort
            try:
                # Render using master template directly
                mjml_content = self._render_email_with_master_template(
                    content_template='order_confirmation_content',
                    context=context,
                    email_title=f"Order Confirmation - #{order_data.get('order_number', '')}",
                    email_preview=f"Your order #{order_data.get('order_number', '')} has been confirmed"
                )
                
                # Send the email directly and return boolean for compatibility
                response_data = self._send_mjml_email_from_content(
                    mjml_content=mjml_content,
                    context=context,
                    to_emails=[user_email],
                    subject=f"Order Confirmation - #{order_data.get('order_number', '')}",
                    from_email=None,
                    enhance_outlook_compatibility=enhance_outlook
                )
                
                return response_data.get('success', False)
                
            except Exception as fallback_error:
                logger.error(f"Master template fallback also failed: {str(fallback_error)}")
                return False
    
    def send_password_reset(self, user_email: str, reset_data: Dict, use_mjml: bool = True, enhance_outlook: bool = False, use_queue: bool = None, user = None) -> bool:
        """Send password reset email using master template with dynamic content."""
        context = {
            'user': reset_data.get('user'),
            'reset_url': reset_data.get('reset_url'),
            'expiry_hours': reset_data.get('expiry_hours', 24),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000'),
        }
        
        return self.send_templated_email(
            template_name='password_reset',
            context=context,
            to_emails=[user_email],
            subject="Password Reset Request - ActEd",
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            priority='urgent',
            user=user
        )
    
    def send_password_reset_completed(self, user_email: str, completion_data: Dict, use_mjml: bool = True, enhance_outlook: bool = False, use_queue: bool = None, user = None) -> bool:
        """Send password reset completion confirmation email using master template with dynamic content."""
        from django.utils import timezone
        
        # Format the reset timestamp for display
        reset_timestamp = completion_data.get('reset_timestamp') or timezone.now()
        if hasattr(reset_timestamp, 'strftime'):
            formatted_timestamp = reset_timestamp.strftime("%B %d, %Y at %I:%M %p")
        else:
            formatted_timestamp = str(reset_timestamp)
        
        context = {
            'user': completion_data.get('user'),
            'login_url': f"{getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')}/auth/login",
            'reset_timestamp': formatted_timestamp,
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000'),
        }
        
        return self.send_templated_email(
            template_name='password_reset_completed',
            context=context,
            to_emails=[user_email],
            subject="Password Successfully Reset - ActEd",
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            priority='high',
            user=user
        )
    
    def send_account_activation(self, user_email: str, activation_data: Dict, use_mjml: bool = True, enhance_outlook: bool = False, use_queue: bool = None, user = None) -> bool:
        """Send account activation email using master template with dynamic content."""
        
        # Extract user object and convert to serializable format
        user_obj = activation_data.get('user')
        user_data = {}
        if user_obj:
            user_data = {
                'id': getattr(user_obj, 'id', None),
                'username': getattr(user_obj, 'username', ''),
                'email': getattr(user_obj, 'email', ''),
                'first_name': getattr(user_obj, 'first_name', ''),
                'last_name': getattr(user_obj, 'last_name', ''),
                'is_active': getattr(user_obj, 'is_active', False),
                'date_joined': getattr(user_obj, 'date_joined', None)
            }
            # Handle datetime serialization
            if user_data['date_joined']:
                user_data['date_joined'] = user_data['date_joined'].isoformat()
        
        context = {
            'user': user_data,
            'activation_url': activation_data.get('activation_url'),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000'),
        }
        
        return self.send_templated_email(
            template_name='account_activation',
            context=context,
            to_emails=[user_email],
            subject="Activate Your ActEd Account",
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            priority='high',
            user=user
        )
    
    def send_email_verification(self, user_email: str, verification_data: Dict, use_mjml: bool = True, enhance_outlook: bool = False, use_queue: bool = None, user = None) -> bool:
        """Send email verification email when user updates their profile with a new email address."""
        from django.utils import timezone
        
        # Format the verification timestamp for display
        verification_timestamp = verification_data.get('verification_timestamp') or timezone.now()
        if hasattr(verification_timestamp, 'strftime'):
            formatted_timestamp = verification_timestamp.strftime("%B %d, %Y at %I:%M %p")
        else:
            formatted_timestamp = str(verification_timestamp)
        
        context = {
            'user': verification_data.get('user'),
            'verification_email': verification_data.get('verification_email'),
            'verification_url': verification_data.get('verification_url'),
            'expiry_hours': verification_data.get('expiry_hours', 24),
            'verification_timestamp': formatted_timestamp,
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000'),
        }
        
        return self.send_templated_email(
            template_name='email_verification',
            context=context,
            to_emails=[user_email],
            subject="Verify Your New Email Address - ActEd",
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            priority='high',
            user=user
        )
    
    def _attach_files_to_email(self, email, attachments: List[Dict]) -> None:
        """
        Attach files to an EmailMultiAlternatives object.
        
        Args:
            email: EmailMultiAlternatives instance
            attachments: List of attachment dictionaries with file info
        """
        import os
        from django.conf import settings
        
        for attachment in attachments:
            try:
                file_path = attachment.get('path') or attachment.get('file_path')
                display_name = attachment.get('name') or attachment.get('display_name')
                mime_type = attachment.get('mime_type', 'application/octet-stream')
                
                if not file_path or not display_name:
                    logger.warning(f"Attachment missing required fields: {attachment}")
                    continue
                
                # Handle different path formats
                if file_path.startswith('static/'):
                    # Convert relative static path to absolute
                    full_path = os.path.join(settings.BASE_DIR, file_path)
                elif os.path.isabs(file_path):
                    # Already absolute path
                    full_path = file_path
                else:
                    # Assume it's relative to BASE_DIR
                    full_path = os.path.join(settings.BASE_DIR, file_path)
                
                # Check if file exists
                if os.path.exists(full_path):
                    with open(full_path, 'rb') as f:
                        email.attach(display_name, f.read(), mime_type)
                else:
                    logger.error(f"Attachment file not found: {full_path}")
                    if attachment.get('is_required'):
                        raise FileNotFoundError(f"Required attachment not found: {full_path}")
                    
            except Exception as e:
                logger.error(f"Failed to attach file {attachment.get('name', 'unknown')}: {str(e)}")
                if attachment.get('is_required'):
                    raise  # Re-raise if it's a required attachment
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text for email fallback."""
        from html2text import html2text
        return html2text(html_content)

    def send_master_template_email(self, user_email: str, master_data: Dict, use_mjml: bool = True, enhance_outlook: bool = True, use_queue: bool = None, user = None) -> bool:
        """
        Send a master template email demonstrating MJML includes functionality.
        """
        context = {
            'student': master_data.get('student', {}),                        
            'order_reference': master_data.get('order_reference', ''),
            'order_type': master_data.get('order_type', ''),
            'order': master_data.get('order', {}),
            'order_items': master_data.get('order_items', []),            
        }
        return self.send_templated_email(
            template_name='master_template',
            context=context,
            to_emails=[user_email],
            subject=master_data.get('email_title', 'Master Template'),
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            user=user
        )

    def send_sample_email(self, user_email: str, sample_data: Dict, use_mjml: bool = True, enhance_outlook: bool = True, use_queue: bool = None, user = None) -> bool:
        """
        Send a sample email demonstrating MJML includes functionality.
        
        Args:
            user_email: Email address to send to
            sample_data: Data for email template including first_name, company info, etc.
            use_mjml: Whether to use MJML template (default: True)
            enhance_outlook: Whether to apply Outlook enhancements (default: True)
            use_queue: Whether to queue the email (None = use template setting)
            user: User who initiated the email
            
        Returns:
            bool: True if email sent/queued successfully
        """
        return self.send_templated_email(
            template_name='sample_email',
            context=sample_data,
            to_emails=[user_email],
            subject=sample_data.get('email_title', 'Sample Email with MJML Includes'),
            use_mjml=use_mjml,
            enhance_outlook_compatibility=enhance_outlook,
            use_queue=use_queue,
            user=user
        )

    def add_placeholder_to_template(self, template_name: str, placeholder_name: str, placeholder_display_name: str = None, description: str = None) -> bool:
        """
        Helper method to add a new placeholder to a template.
        Useful for extending the dynamic content system.
        
        Args:
            template_name: Name of the email template
            placeholder_name: Name of the placeholder (e.g., 'NEW_CONTENT')
            placeholder_display_name: Human-readable name for the placeholder
            description: Description of what this placeholder is for
            
        Returns:
            bool: True if placeholder was created/associated successfully
        """
        try:
            from .models import EmailTemplate, EmailContentPlaceholder
            
            # Get or create template
            template, created = EmailTemplate.objects.get_or_create(
                name=template_name,
                defaults={
                    'display_name': template_name.replace('_', ' ').title(),
                    'description': f'Email template for {template_name}',
                    'subject_template': f'{template_name.replace("_", " ").title()} - ActEd',
                    'content_template_name': f'{template_name}_content',
                    'use_master_template': True,
                    'is_active': True
                }
            )
            
            # Get or create placeholder
            placeholder, created = EmailContentPlaceholder.objects.get_or_create(
                name=placeholder_name,
                defaults={
                    'display_name': placeholder_display_name or placeholder_name.replace('_', ' ').title(),
                    'description': description or f'Dynamic content placeholder for {placeholder_name}',
                    'is_active': True
                }
            )
            
            # Associate placeholder with template
            template.placeholders.add(placeholder)

            return True
            
        except Exception as e:
            logger.error(f"Failed to add placeholder '{placeholder_name}' to template '{template_name}': {str(e)}")
            return False

# Global email service instance
email_service = EmailService() 