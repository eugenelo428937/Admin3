import logging
import os
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string, get_template
from django.conf import settings
from premailer import transform
from mjml import mjml_to_html
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class EmailService:
    """
    Email service with responsive template support and cross-client compatibility.
    Handles confirmation emails, password resets, and order notifications.
    """
    
    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@admin3.com')
        self.base_template_dir = 'emails'
        self.mjml_template_dir = 'emails/mjml'
        
    def send_templated_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None,
        use_mjml: bool = True
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
            
        Returns:
            bool: True if email sent successfully
        """
        if use_mjml:
            # Try MJML template first
            try:
                mjml_template_path = f'{self.mjml_template_dir}/{template_name}.mjml'
                get_template(mjml_template_path)  # Check if MJML template exists
                return self._send_mjml_email(template_name, context, to_emails, subject, from_email)
            except Exception as e:
                logger.info(f"MJML template not found for {template_name}: {str(e)}, falling back to HTML")
        
        # Fallback to regular HTML template
        return self._send_html_email(template_name, context, to_emails, subject, from_email)
    
    def _send_mjml_email(
        self,
        template_name: str,
        context: Dict,
        to_emails: List[str],
        subject: str,
        from_email: Optional[str] = None
    ) -> bool:
        """Send email using MJML template with automatic HTML conversion."""
        try:
            # Render MJML template with Django context
            mjml_template = f'{self.mjml_template_dir}/{template_name}.mjml'
            mjml_content = render_to_string(mjml_template, context)
            
            # Convert MJML to HTML
            html_result = mjml_to_html(mjml_content)
            
            if html_result.get('errors'):
                logger.error(f"MJML compilation errors: {html_result['errors']}")
                return False
                
            html_content = html_result['html']
            
            # MJML already handles CSS inlining and optimization, so we skip Premailer
            # to avoid potential issues with the CSS inlining dependencies
            
            # Render plain text version
            try:
                text_template = f'{self.base_template_dir}/{template_name}.txt'
                text_content = render_to_string(text_template, context)
            except:
                # If no text template, create simple text version
                text_content = self._html_to_text(html_content)
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email or self.from_email,
                to=to_emails
            )
            
            # Attach HTML version
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"MJML email sent successfully to {to_emails} using template {template_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send MJML email to {to_emails}: {str(e)}")
            return False
    
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
            # Render HTML template
            html_template = f'{self.base_template_dir}/{template_name}.html'
            html_content = render_to_string(html_template, context)
            
            # Inline CSS for better email client compatibility
            html_content = transform(
                html_content,
                base_url=getattr(settings, 'BASE_URL', 'http://localhost:8888'),
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
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email or self.from_email,
                to=to_emails
            )
            
            # Attach HTML version
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"HTML email sent successfully to {to_emails} using template {template_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send HTML email to {to_emails}: {str(e)}")
            return False
    
    def send_order_confirmation(self, user_email: str, order_data: Dict, use_mjml: bool = True) -> bool:
        """Send order confirmation email using MJML or HTML template."""
        context = {
            'order': order_data,
            'customer_name': order_data.get('customer_name', ''),
            'order_number': order_data.get('order_number', ''),
            'order_total': order_data.get('total_amount', 0),
            'order_items': order_data.get('items', []),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
        }
        
        return self.send_templated_email(
            template_name='order_confirmation',
            context=context,
            to_emails=[user_email],
            subject=f"Order Confirmation - #{order_data.get('order_number', '')}",
            use_mjml=use_mjml
        )
    
    def send_password_reset(self, user_email: str, reset_data: Dict, use_mjml: bool = True) -> bool:
        """Send password reset email using MJML or HTML template."""
        context = {
            'user': reset_data.get('user'),
            'reset_url': reset_data.get('reset_url'),
            'expiry_hours': reset_data.get('expiry_hours', 24),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
        }
        
        return self.send_templated_email(
            template_name='password_reset',
            context=context,
            to_emails=[user_email],
            subject="Password Reset Request - Admin3",
            use_mjml=use_mjml
        )
    
    def send_account_activation(self, user_email: str, activation_data: Dict, use_mjml: bool = True) -> bool:
        """Send account activation email using MJML or HTML template."""
        context = {
            'user': activation_data.get('user'),
            'activation_url': activation_data.get('activation_url'),
            'base_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
        }
        
        return self.send_templated_email(
            template_name='account_activation',
            context=context,
            to_emails=[user_email],
            subject="Activate Your Admin3 Account",
            use_mjml=use_mjml
        )
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text for email fallback."""
        from html2text import html2text
        return html2text(html_content)

# Global email service instance
email_service = EmailService() 