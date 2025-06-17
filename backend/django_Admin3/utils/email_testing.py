import logging
import json
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string, get_template
from django.utils import timezone
from premailer import transform
from mjml import mjml_to_html
from .email_service import email_service

logger = logging.getLogger(__name__)

class EmailTester:
    """
    Email testing utility for previewing templates and testing cross-client compatibility.
    """
    
    def __init__(self):
        self.test_data = self._get_test_data()
    
    def _get_test_data(self):
        """Generate test data for email templates."""
        return {
            'order_confirmation': {
                'customer_name': 'John Doe',
                'order_number': 'ORD-2024-001',
                'order_total': 299.99,
                'order': {
                    'created_at': timezone.now(),
                    'subtotal': 249.99,
                    'vat_amount': 50.00,
                    'vat_rate': 20.0,
                    'discount_amount': 0,
                },
                'order_items': [
                    {
                        'product_name': 'Advanced Financial Reporting',
                        'subject_code': 'AFR',
                        'session_code': 'DEC24',
                        'quantity': 1,
                        'actual_price': 149.99,
                        'line_total': 149.99,
                    },
                    {
                        'product_name': 'Strategic Business Management',
                        'subject_code': 'SBM',
                        'session_code': 'DEC24',
                        'quantity': 1,
                        'actual_price': 100.00,
                        'line_total': 100.00,
                    }
                ],
                'base_url': 'http://localhost:3000',
            },
            'password_reset': {
                'user': {
                    'first_name': 'Jane',
                    'username': 'jane.smith@example.com',
                },
                'reset_url': 'http://localhost:3000/auth/reset-password?token=abc123xyz789',
                'expiry_hours': 24,
                'base_url': 'http://localhost:3000',
            },
            'account_activation': {
                'user': {
                    'first_name': 'Mike',
                    'username': 'mike.johnson@example.com',
                },
                'activation_url': 'http://localhost:3000/auth/activate?token=def456uvw012',
                'base_url': 'http://localhost:3000',
            }
        }
    
    def preview_template(self, template_name: str, output_format: str = 'html', use_mjml: bool = True) -> str:
        """
        Preview an email template with test data.
        
        Args:
            template_name: Name of the template to preview
            output_format: 'html', 'text', 'inlined', or 'mjml'
            use_mjml: Whether to use MJML template if available
            
        Returns:
            str: Rendered template content
        """
        try:
            context = self.test_data.get(template_name, {})
            
            if output_format == 'text':
                template_path = f'emails/{template_name}.txt'
                return render_to_string(template_path, context)
            
            elif output_format == 'mjml':
                # Return raw MJML content
                mjml_template_path = f'emails/mjml/{template_name}.mjml'
                return render_to_string(mjml_template_path, context)
            
            elif output_format in ['html', 'inlined']:
                # Try MJML first if use_mjml is True
                if use_mjml:
                    try:
                        mjml_template_path = f'emails/mjml/{template_name}.mjml'
                        get_template(mjml_template_path)  # Check if MJML template exists
                        
                        # Render MJML template with context
                        mjml_content = render_to_string(mjml_template_path, context)
                        
                        # Convert MJML to HTML
                        html_result = mjml_to_html(mjml_content)
                        
                        if html_result.get('errors'):
                            logger.error(f"MJML compilation errors: {html_result['errors']}")
                            # Fallback to HTML template
                            use_mjml = False
                        else:
                            html_content = html_result['html']
                            
                            # MJML already handles CSS inlining, so we skip additional inlining for MJML templates
                            # Only apply Premailer if specifically requested for MJML (which is rare)
                            
                            return html_content
                    except Exception as e:
                        logger.info(f"MJML template not found for {template_name}: {str(e)}, falling back to HTML")
                        use_mjml = False
                
                # Fallback to HTML template
                if not use_mjml:
                    template_path = f'emails/{template_name}.html'
                    html_content = render_to_string(template_path, context)
                    
                    if output_format == 'inlined':
                        html_content = transform(
                            html_content,
                            base_url='http://localhost:8888',
                            remove_classes=True,
                            strip_important=False,
                            keep_style_tags=False,
                        )
                    
                    return html_content
            
            else:
                raise ValueError(f"Invalid output format: {output_format}")
                
        except Exception as e:
            logger.error(f"Failed to preview template {template_name}: {str(e)}")
            return f"Error: {str(e)}"
    
    def save_preview_to_file(self, template_name: str, output_dir: str = './email_previews/', use_mjml: bool = True):
        """Save email previews to files for testing in different email clients."""
        import os
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        formats = ['html', 'text', 'inlined']
        if use_mjml:
            formats.append('mjml')
        
        for fmt in formats:
            try:
                content = self.preview_template(template_name, fmt, use_mjml)
                if fmt == 'mjml':
                    filename = f"{template_name}_{fmt}.mjml"
                else:
                    filename = f"{template_name}_{fmt}.{'html' if fmt != 'text' else 'txt'}"
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                logger.info(f"Saved preview: {filepath}")
                
            except Exception as e:
                logger.error(f"Failed to save preview for {template_name} ({fmt}): {str(e)}")
    
    def test_send_email(self, template_name: str, recipient_email: str) -> bool:
        """
        Send a test email using the specified template.
        
        Args:
            template_name: Name of the email template
            recipient_email: Email address to send test to
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            context = self.test_data.get(template_name, {})
            
            if template_name == 'order_confirmation':
                return email_service.send_order_confirmation(recipient_email, context)
            
            elif template_name == 'password_reset':
                return email_service.send_password_reset(recipient_email, context)
            
            elif template_name == 'account_activation':
                return email_service.send_account_activation(recipient_email, context)
            
            else:
                logger.error(f"Unknown template: {template_name}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send test email: {str(e)}")
            return False
    
    def validate_email_compatibility(self, template_name: str) -> dict:
        """
        Validate email template compatibility across different email clients.
        
        Returns:
            dict: Compatibility report
        """
        try:
            html_content = self.preview_template(template_name, 'html')
            inlined_content = self.preview_template(template_name, 'inlined')
            
            report = {
                'template': template_name,
                'validation_timestamp': timezone.now().isoformat(),
                'issues': [],
                'recommendations': [],
                'compatibility_score': 0,
            }
            
            # Check for common email client compatibility issues
            issues = []
            
            # Check for CSS that might not work in Outlook
            if 'display: flex' in html_content.lower():
                issues.append("Flexbox layout detected - may not work in Outlook 2016+")
            
            if 'border-radius' in html_content.lower():
                issues.append("Border-radius detected - limited support in older Outlook versions")
            
            if '@media' in html_content.lower() and 'max-width' in html_content.lower():
                report['recommendations'].append("Responsive design detected - good for mobile compatibility")
            
            # Check for proper table structure
            if '<table' not in html_content.lower():
                issues.append("No table structure detected - consider using tables for better layout compatibility")
            
            # Check for external stylesheets
            if 'link rel="stylesheet"' in html_content.lower():
                issues.append("External stylesheets detected - CSS should be inlined for email clients")
            
            # Check for images without alt text
            if '<img' in html_content.lower() and 'alt=' not in html_content.lower():
                issues.append("Images without alt text detected - add alt attributes for accessibility")
            
            report['issues'] = issues
            report['compatibility_score'] = max(0, 100 - (len(issues) * 10))
            
            # Add recommendations based on score
            if report['compatibility_score'] < 70:
                report['recommendations'].extend([
                    "Consider using table-based layout for better cross-client compatibility",
                    "Inline all CSS styles",
                    "Test in multiple email clients before sending"
                ])
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to validate email compatibility: {str(e)}")
            return {'error': str(e)}
    
    def generate_test_report(self, template_names: list = None) -> dict:
        """Generate a comprehensive test report for email templates."""
        if template_names is None:
            template_names = ['order_confirmation', 'password_reset', 'account_activation']
        
        report = {
            'test_timestamp': timezone.now().isoformat(),
            'templates_tested': len(template_names),
            'overall_score': 0,
            'template_reports': []
        }
        
        total_score = 0
        
        for template_name in template_names:
            template_report = self.validate_email_compatibility(template_name)
            report['template_reports'].append(template_report)
            
            if 'compatibility_score' in template_report:
                total_score += template_report['compatibility_score']
        
        if template_names:
            report['overall_score'] = total_score / len(template_names)
        
        return report

# Global email tester instance
email_tester = EmailTester() 