import logging
import json
from typing import Dict, List, Optional
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string, get_template
from django.utils import timezone
from premailer import transform
from mjml import mjml2html
from .email_service import EmailService

logger = logging.getLogger(__name__)

class EmailTester:
    """
    Email testing utility for previewing templates and testing cross-client compatibility.
    """
    
    def __init__(self):
        self.test_data = self._get_test_data()
    
    def _get_test_data(self):
        """Generate test data for email templates."""
        order_confirmation_data = {
            'first_name': 'Eugene',
            'last_name': 'Lo',
            'student_number': '352866',
            'order_number': 'ORD-2024-001',
            'total_amount': 299.99,
            'created_at': timezone.now(),  # Top level, not nested
            'subtotal': 249.99,
            'vat_amount': 50.00,
            'discount_amount': 0,
            'is_digital': True,  # Add is_digital flag to test DIGITAL_CONTENT placeholder
            'is_invoice': False,  # Add is_invoice flag
            'is_tutorial': False,  # Add is_tutorial flag
            'payment_method': 'card',  # Add payment method
            'employer_code': None,  # Add employer code
            'user': {  # Add user object for dynamic content rules
                'country': 'United Kingdom',
                'first_name': 'Eugene',
                'last_name': 'Lo',
                'username': 'eugene.lo@example.com',
                'email': 'eugene.lo@example.com'
            },
            'items': [
                {
                    'name': 'Advanced Financial Reporting eBook',
                    'product_code': 'AFR/ST/25A',  # Add product code for dynamic content rules
                    'product_type': 'Study Text',  # Add product type for dynamic content rules
                    'subject_code': 'AFR',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 149.99,
                    'line_total': 149.99,
                    'variation': 'eBook Version',
                    'is_tutorial': False,
                    'is_digital': True,  # Make this item digital
                    'price_type': 'standard',
                },
                {
                    'name': 'Strategic Business Management',
                    'product_code': 'SBM/MOCK/25A',  # Add mock exam product code to test rules
                    'product_type': 'Mock Exam',  # Add product type
                    'subject_code': 'SBM',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 100.00,
                    'line_total': 100.00,
                    'variation': None,
                    'is_tutorial': False,
                    'is_digital': False,  # Keep this item as physical
                    'price_type': 'standard',
                }
            ],
            'item_count': 2,
            'total_items': 2,
            'base_url': 'http://127.0.0.1:3000',
        }
        
        return {
            'order_confirmation': order_confirmation_data,
            'order_confirmation_content': order_confirmation_data,
            'password_reset': {
                'user': {
                    'first_name': 'Jane',
                    'username': 'jane.smith@example.com',
                },
                'reset_url': 'http://127.0.0.1:3000/auth/reset-password?token=abc123xyz789',
                'expiry_hours': 24,
                'base_url': 'http://127.0.0.1:3000',
            },
            'password_reset_content': {
                'user': {
                    'first_name': 'Jane',
                    'username': 'jane.smith@example.com',
                },
                'reset_url': 'http://127.0.0.1:3000/auth/reset-password?token=abc123xyz789',
                'expiry_hours': 24,
                'base_url': 'http://127.0.0.1:3000',
            },
            'password_reset_completed': {
                'user': {
                    'first_name': 'Jane',
                    'username': 'jane.smith@example.com',
                },
                'reset_timestamp': timezone.now(),
                'base_url': 'http://127.0.0.1:3000',
            },
            'password_reset_completed_content': {
                'user': {
                    'first_name': 'Jane',
                    'username': 'jane.smith@example.com',
                },
                'reset_timestamp': timezone.now(),
                'base_url': 'http://127.0.0.1:3000',
            },
            'account_activation': {
                'user': {
                    'first_name': 'Mike',
                    'username': 'mike.johnson@example.com',
                },
                'activation_url': 'http://127.0.0.1:3000/auth/activate?token=def456uvw012',
                'base_url': 'http://127.0.0.1:3000',
            },
            'account_activation_content': {
                'user': {
                    'first_name': 'Mike',
                    'username': 'mike.johnson@example.com',
                },
                'activation_url': 'http://127.0.0.1:3000/auth/activate?token=def456uvw012',
                'base_url': 'http://127.0.0.1:3000',
            },
            'email_verification': {
                'user': {
                    'first_name': 'Sarah',
                    'username': 'sarah.wilson@example.com',
                },
                'verification_email': 'sarah.new@example.com',
                'verification_url': 'http://127.0.0.1:3000/auth/verify-email?token=ghi789zab345',
                'expiry_hours': 24,
                'verification_timestamp': timezone.now(),
                'base_url': 'http://127.0.0.1:3000',
            },
            'email_verification_content': {
                'user': {
                    'first_name': 'Sarah',
                    'username': 'sarah.wilson@example.com',
                },
                'verification_email': 'sarah.new@example.com',
                'verification_url': 'http://127.0.0.1:3000/auth/verify-email?token=ghi789zab345',
                'expiry_hours': 24,
                'verification_timestamp': timezone.now(),
                'base_url': 'http://127.0.0.1:3000',
            },
            'master_template': {
                'student' : 
                    {
                        'first_name': 'Eugene',
                        'last_name': 'Lo',
                        'student_number': '352866',
                    },                            
                'order_reference': 'ORD-2024-001',
                'order_type': 'Material',
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
                        'name': 'Advanced Financial Reporting',
                        'subject_code': 'AFR',
                        'session_code': 'DEC24',
                        'quantity': 1,
                        'actual_price': 149.99,
                        'line_total': 149.99,
                    },
                    {
                        'name': 'Strategic Business Management',
                        'subject_code': 'SBM',
                        'session_code': 'DEC24',
                        'quantity': 1,
                        'actual_price': 100.00,
                        'line_total': 100.00,
                    }
                ],
                'base_url': 'http://127.0.0.1:3000',
            },
        }
    
    def preview_template(self, template_name: str, output_format: str = 'html', use_mjml: bool = True, enhance_outlook: bool = False) -> str:
        """
        Preview an email template with test data.
        
        Args:
            template_name: Name of the template to preview
            output_format: 'html', 'text', 'inlined', 'mjml', or 'outlook'
            use_mjml: Whether to use MJML template if available
            enhance_outlook: Apply Outlook compatibility enhancements to MJML output
            
        Returns:
            str: Rendered template content
        """
        try:
            context = self.test_data.get(template_name, {})
            
            # Add development mode context for preview (simulate email service behavior)
            from django.conf import settings
            dev_override = getattr(settings, 'DEV_EMAIL_OVERRIDE', False)
            dev_recipients = getattr(settings, 'DEV_EMAIL_RECIPIENTS', [])
            
            if dev_override and dev_recipients and settings.DEBUG:
                # Simulate original recipients for preview
                test_recipient = 'student@example.com'
                context['dev_original_recipients'] = [test_recipient]
                context['dev_mode_active'] = True
            else:
                context['dev_mode_active'] = False
            
            if output_format == 'text':
                template_path = f'emails/{template_name}.txt'
                return render_to_string(template_path, context)
            
            elif output_format == 'mjml':
                # Return raw MJML content
                mjml_template_path = f'emails/mjml/{template_name}.mjml'
                return render_to_string(mjml_template_path, context)
            
            elif output_format in ['html', 'inlined', 'outlook']:
                # Try MJML first if use_mjml is True
                if use_mjml:
                    try:
                        # Check if we should use the master template system for core email types
                        if template_name in ['order_confirmation', 'password_reset', 'password_reset_completed', 'account_activation', 'email_verification']:
                            # Use the new master template system
                            content_template_map = {
                                'order_confirmation': 'order_confirmation_content',
                                'password_reset': 'password_reset_content',
                                'password_reset_completed': 'password_reset_completed_content',
                                'account_activation': 'account_activation_content',
                                'email_verification': 'email_verification_content',
                                'email_verification': 'email_verification_content'
                            }
                            
                            # For order_confirmation, apply the same date formatting logic as send_order_confirmation
                            if template_name == 'order_confirmation':
                                # Format the order date in Python to avoid MJML template filter issues
                                order_created_at = context.get('created_at')
                                if order_created_at:
                                    if hasattr(order_created_at, 'strftime'):
                                        # Format datetime to readable string
                                        formatted_date = order_created_at.strftime("%B %d, %Y at %I:%M %p")
                                    else:
                                        formatted_date = str(order_created_at)
                                else:
                                    formatted_date = "Date not available"
                                
                                # Create order object for template compatibility (same as email service)
                                order_obj = {
                                    'created_at': order_created_at,  # Keep original for any other uses
                                    'created_at_formatted': formatted_date,  # Pre-formatted string for display
                                    'subtotal': context.get('subtotal', 0),
                                    'vat_amount': context.get('vat_amount', 0),
                                    'discount_amount': context.get('discount_amount', 0),
                                }
                                
                                # Update context with properly formatted order object
                                context['order'] = order_obj
                            
                            email_service = EmailService()
                            mjml_content = email_service._render_email_with_master_template(
                                content_template=content_template_map[template_name],
                                context=context,
                                email_title=f"{template_name.replace('_', ' ').title()} - ActEd",
                                email_preview=f"Preview of {template_name.replace('_', ' ')} email"
                            )
                        else:
                            # Try standalone MJML template
                            mjml_template_path = f'emails/mjml/{template_name}.mjml'
                            get_template(mjml_template_path)  # Check if MJML template exists
                            
                            # Render MJML template with context
                            mjml_content = render_to_string(mjml_template_path, context)
                        
                        # Convert MJML to HTML using mjml-python
                        try:
                            # Set up include loader for MJML includes
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
                                    include_template_path = f'emails/mjml/{normalized_path}'
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
                            
                            html_content = mjml2html(mjml_content, include_loader=include_loader)
                            
                            # Apply Outlook enhancements if requested
                            if enhance_outlook or output_format == 'outlook':
                                email_service = EmailService()
                                html_content = email_service._enhance_outlook_compatibility(html_content)
                            
                            return html_content
                        except Exception as e:
                            logger.error(f"MJML compilation error: {str(e)}")
                            # Fallback to HTML template
                            use_mjml = False
                    except Exception as e:
                        logger.info(f"MJML template not found for {template_name}: {str(e)}, falling back to HTML")
                        use_mjml = False
                
                # Fallback to HTML template
                if not use_mjml:
                    template_path = f'emails/{template_name}.html'
                    html_content = render_to_string(template_path, context)
                    
                    if output_format in ['inlined', 'outlook']:
                        html_content = transform(
                            html_content,
                            base_url='http://127.0.0.1:8888',
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
    
    def save_preview_to_file(self, template_name: str, output_dir: str = './email_previews/', use_mjml: bool = True, include_outlook_enhanced: bool = True):
        """Save email previews to files for testing in different email clients."""
        import os
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        formats = ['html', 'text', 'inlined']
        if use_mjml:
            formats.append('mjml')
        
        # Add Outlook-enhanced version if requested
        if include_outlook_enhanced and use_mjml:
            formats.append('outlook')
        
        for fmt in formats:
            try:
                if fmt == 'outlook':
                    content = self.preview_template(template_name, 'html', use_mjml, enhance_outlook=True)
                    filename = f"{template_name}_outlook_enhanced.html"
                else:
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
            email_service = EmailService()
            context = self.test_data.get(template_name, {})
            
            if template_name == 'order_confirmation':
                # Use the same method call and data structure as the real checkout process
                # This ensures testing matches the actual production behavior
                return email_service.send_order_confirmation(
                    user_email=recipient_email, 
                    order_data=context,  # Pass the full order_data structure
                    use_mjml=True,
                    enhance_outlook=True,
                    use_queue=False,  # Send immediately for testing
                    user=None
                )
            
            elif template_name == 'password_reset':
                return email_service.send_password_reset(recipient_email, context)
            
            elif template_name == 'password_reset_completed':
                return email_service.send_password_reset_completed(recipient_email, context)
            
            elif template_name == 'account_activation':
                return email_service.send_account_activation(recipient_email, context)
            
            elif template_name == 'email_verification':
                return email_service.send_email_verification(recipient_email, context)
            
            elif template_name == 'email_verification':
                return email_service.send_email_verification(recipient_email, context)
            
            elif template_name == 'sample_email':
                return email_service.send_sample_email(recipient_email, context)
            elif template_name == 'master_template':
                return email_service.send_master_template_email(recipient_email, context)
            
            else:
                logger.error(f"Unknown template: {template_name}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send test email: {str(e)}")
            raise Exception(f"Failed to send test email: {str(e)}")
    
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

    def test_outlook_compatibility(self, template_name: str) -> Dict[str, str]:
        """
        Generate comparison between regular MJML and Outlook-enhanced versions.
        
        Args:
            template_name: Name of the template to test
            
        Returns:
            dict: Comparison results with both versions
        """
        try:
            results = {}
            
            # Regular MJML version
            results['mjml_regular'] = self.preview_template(template_name, 'html', use_mjml=True, enhance_outlook=False)
            
            # Outlook-enhanced version
            results['mjml_outlook_enhanced'] = self.preview_template(template_name, 'html', use_mjml=True, enhance_outlook=True)
            
            # Calculate differences
            regular_size = len(results['mjml_regular'])
            enhanced_size = len(results['mjml_outlook_enhanced'])
            
            results['comparison'] = {
                'regular_size': regular_size,
                'enhanced_size': enhanced_size,
                'size_difference': enhanced_size - regular_size,
                'enhancement_applied': enhanced_size > regular_size
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to test Outlook compatibility for {template_name}: {str(e)}")
            return {'error': str(e)}

# Global email tester instance
email_tester = EmailTester() 