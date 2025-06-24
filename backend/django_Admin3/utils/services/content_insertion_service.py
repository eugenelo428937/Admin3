import logging
import re
from typing import Dict, List, Tuple
from django.template import Template, Context
from ..models import EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder

logger = logging.getLogger(__name__)


class EmailContentInsertionService:
    """
    Service for processing dynamic content insertion rules in email templates.
    
    This service evaluates content rules based on email context and inserts
    appropriate content into placeholders within email templates.
    """
    
    def __init__(self):
        self.placeholder_pattern = re.compile(r'\{\{\s*([A-Z_]+)\s*\}\}')
    
    def process_template_content(self, template_name: str, content: str, context: Dict) -> str:
        """
        Process email template content by evaluating content rules and inserting dynamic content.
        
        Args:
            template_name (str): Name of the email template
            content (str): Original template content
            context (Dict): Email template context data
            
        Returns:
            str: Processed content with dynamic content inserted
        """
        try:
            # Find all placeholders in the content
            placeholders = self._find_placeholders(content)
            
            if not placeholders:
                return content
            
            # Get content rules for this template
            rules = self._get_template_content_rules(template_name)
            
            # Process each placeholder
            processed_content = content
            for placeholder_name in placeholders:
                dynamic_content = self._generate_dynamic_content(
                    placeholder_name, rules, context
                )
                
                # Replace placeholder with generated content
                placeholder_pattern = f'{{{{{placeholder_name}}}}}'
                processed_content = processed_content.replace(placeholder_pattern, dynamic_content)
            
            logger.info(f"Processed {len(placeholders)} placeholders in template {template_name}")
            return processed_content
            
        except Exception as e:
            logger.error(f"Error processing template content for {template_name}: {str(e)}")
            return content
    
    def _find_placeholders(self, content: str) -> List[str]:
        """Find all placeholders in template content."""
        matches = self.placeholder_pattern.findall(content)
        return list(set(matches))  # Remove duplicates
    
    def _get_template_content_rules(self, template_name: str) -> List[EmailTemplateContentRule]:
        """Get active content rules for a specific template."""
        try:
            return EmailTemplateContentRule.objects.filter(
                template__name=template_name,
                template__is_active=True,
                content_rule__is_active=True,
                is_enabled=True
            ).select_related('content_rule', 'template').order_by(
                '-priority_override', 
                '-content_rule__priority'
            )
        except Exception as e:
            logger.error(f"Error fetching content rules for template {template_name}: {str(e)}")
            return []
    
    def _generate_dynamic_content(self, placeholder_name: str, rules: List[EmailTemplateContentRule], context: Dict) -> str:
        """
        Generate dynamic content for a specific placeholder based on rules and context.
        
        Args:
            placeholder_name (str): Name of the placeholder to generate content for
            rules (List[EmailTemplateContentRule]): Template content rules
            context (Dict): Email template context data
            
        Returns:
            str: Generated dynamic content
        """
        try:
            # Get placeholder configuration
            placeholder = self._get_placeholder_config(placeholder_name)
            if not placeholder:
                return ''
            
            # Filter rules for this specific placeholder and sort by priority
            applicable_rules = [
                rule_association for rule_association in rules
                if rule_association.content_rule.placeholder.name == placeholder_name and 
                   rule_association.content_rule.is_active and 
                   rule_association.is_enabled
            ]
            
            applicable_rules.sort(key=lambda x: x.effective_priority, reverse=True)
            
            contents = []
            
            for rule_association in applicable_rules:
                rule = rule_association.content_rule
                
                # Evaluate rule condition
                if rule.evaluate_condition(context):
                    logger.debug(f"Rule '{rule.name}' matched for placeholder '{placeholder_name}'")
                    
                    # Use override content template if available
                    content_template = rule_association.get_content_template()
                    
                    # Get variables from the placeholder (moved from rule)
                    variables = placeholder.content_variables
                    
                    # Render content
                    rendered_content = self._render_content_template(
                        content_template, context, variables
                    )
                    
                    if rendered_content:
                        contents.append(rendered_content)
                    
                    # Stop if rule is exclusive
                    if rule.is_exclusive:
                        break
            
            # Combine contents if multiple rules matched (moved outside the for loop)
            if contents:
                separator = placeholder.content_separator if placeholder else '\n'
                if placeholder and not placeholder.allow_multiple_rules and len(contents) > 1:
                    # Use only the first (highest priority) content
                    return contents[0]
                else:
                    return separator.join(contents)
            
            # Return default content if no rules matched (but only if we want default content for unmatched rules)
            # For conditional placeholders, we don't want default content when no rules match
            # if placeholder and placeholder.default_content_template:
            #     return self._render_content_template(
            #         placeholder.default_content_template, context, {}
            #     )
            
            return ''  # Empty string if no content generated
            
        except Exception as e:
            logger.error(f"Error generating dynamic content for placeholder {placeholder_name}: {str(e)}")
            return ''
    
    def _get_placeholder_config(self, placeholder_name: str) -> EmailContentPlaceholder:
        """Get placeholder configuration."""
        try:
            return EmailContentPlaceholder.objects.get(name=placeholder_name, is_active=True)
        except EmailContentPlaceholder.DoesNotExist:
            logger.warning(f"Placeholder configuration not found for: {placeholder_name}")
            return None
        except Exception as e:
            logger.error(f"Error fetching placeholder config for {placeholder_name}: {str(e)}")
            return None
    
    def _render_content_template(self, template_content: str, context: Dict, variables: Dict) -> str:
        """
        Render content template with context and variables.
        
        Args:
            template_content (str): Template content to render
            context (Dict): Email template context
            variables (Dict): Additional variables for the content template
            
        Returns:
            str: Rendered content
        """
        try:
            # Merge context and variables
            render_context = {**context, **variables}
            
            # Create Django template and render
            template = Template(template_content)
            django_context = Context(render_context)
            
            return template.render(django_context)
            
        except Exception as e:
            logger.error(f"Error rendering content template: {str(e)}")
            return f"<!-- Error rendering content: {str(e)} -->"
    
    def validate_template_placeholders(self, template_name: str, content: str) -> Dict:
        """
        Validate that all placeholders in template content have corresponding configurations.
        
        Args:
            template_name (str): Name of the email template
            content (str): Template content to validate
            
        Returns:
            Dict: Validation results with any issues found
        """
        try:
            placeholders = self._find_placeholders(content)
            validation_results = {
                'valid': True,
                'placeholders_found': placeholders,
                'issues': [],
                'warnings': []
            }
            
            for placeholder_name in placeholders:
                # Check if placeholder configuration exists
                placeholder = self._get_placeholder_config(placeholder_name)
                
                if not placeholder:
                    validation_results['issues'].append(
                        f"Placeholder '{placeholder_name}' has no configuration"
                    )
                    validation_results['valid'] = False
                elif placeholder.is_required and not self._has_content_rules(template_name, placeholder_name):
                    validation_results['warnings'].append(
                        f"Required placeholder '{placeholder_name}' has no content rules"
                    )
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Error validating template placeholders: {str(e)}")
            return {
                'valid': False,
                'error': str(e),
                'placeholders_found': [],
                'issues': [f"Validation error: {str(e)}"],
                'warnings': []
            }
    
    def _has_content_rules(self, template_name: str, placeholder_name: str) -> bool:
        """Check if a template has any content rules for a specific placeholder."""
        try:
            return EmailTemplateContentRule.objects.filter(
                template__name=template_name,
                content_rule__placeholder__name=placeholder_name,
                content_rule__is_active=True,
                is_enabled=True
            ).exists()
        except Exception:
            return False
    
    def get_available_placeholders(self, template_name: str = None) -> List[Dict]:
        """
        Get list of available placeholders, optionally filtered by template.
        
        Args:
            template_name (str): Optional template name to filter by
            
        Returns:
            List[Dict]: List of placeholder information
        """
        try:
            placeholders_query = EmailContentPlaceholder.objects.filter(is_active=True)
            
            if template_name:
                placeholders_query = placeholders_query.filter(
                    templates__name=template_name
                )
            
            placeholders = []
            for placeholder in placeholders_query:
                placeholders.append({
                    'name': placeholder.name,
                    'display_name': placeholder.display_name,
                    'description': placeholder.description,
                    'is_required': placeholder.is_required,
                    'allow_multiple_rules': placeholder.allow_multiple_rules,
                    'default_content_template': placeholder.default_content_template
                })
            
            return placeholders
            
        except Exception as e:
            logger.error(f"Error fetching available placeholders: {str(e)}")
            return []
    
    def preview_dynamic_content(self, template_name: str, context: Dict) -> Dict:
        """
        Preview what dynamic content would be generated for a template and context.
        
        Args:
            template_name (str): Name of the email template
            context (Dict): Email template context data
            
        Returns:
            Dict: Preview results with generated content for each placeholder
        """
        try:
            rules = self._get_template_content_rules(template_name)
            placeholders = self.get_available_placeholders(template_name)
            
            preview_results = {
                'template_name': template_name,
                'placeholders': {},
                'matched_rules': [],
                'context_summary': self._summarize_context(context)
            }
            
            for placeholder in placeholders:
                placeholder_name = placeholder['name']
                
                # Generate content for this placeholder
                dynamic_content = self._generate_dynamic_content(
                    placeholder_name, rules, context
                )
                
                # Find which rules matched
                matched_rules = []
                for rule_association in rules:
                    rule = rule_association.content_rule
                    if rule.placeholder.name == placeholder_name and rule.evaluate_condition(context):
                        matched_rules.append({
                            'rule_name': rule.name,
                            'rule_type': rule.rule_type,
                            'priority': rule_association.effective_priority
                        })
                
                preview_results['placeholders'][placeholder_name] = {
                    'generated_content': dynamic_content,
                    'matched_rules': matched_rules,
                    'has_content': bool(dynamic_content.strip()),
                    'placeholder_config': placeholder
                }
            
            return preview_results
            
        except Exception as e:
            logger.error(f"Error generating content preview: {str(e)}")
            return {
                'template_name': template_name,
                'error': str(e),
                'placeholders': {},
                'matched_rules': [],
                'context_summary': {}
            }
    
    def _summarize_context(self, context: Dict) -> Dict:
        """Create a summary of context data for debugging."""
        try:
            summary = {}
            
            # Summarize key fields
            if 'items' in context:
                items = context['items']
                summary['items_count'] = len(items)
                summary['product_ids'] = [item.get('product_id') for item in items]
                summary['product_names'] = [item.get('product_name') for item in items]
            
            if 'user' in context:
                user = context['user']
                summary['user_country'] = user.get('country')
                summary['user_type'] = user.get('user_type')
            
            if 'order' in context:
                order = context['order']
                summary['order_total'] = order.get('total_amount')
                summary['order_date'] = str(order.get('created_at'))
            
            # Add other relevant fields
            for key in ['customer_name', 'student_number', 'order_number', 'total_amount']:
                if key in context:
                    summary[key] = context[key]
            
            return summary
            
        except Exception as e:
            logger.error(f"Error summarizing context: {str(e)}")
            return {'error': str(e)}


# Global service instance
content_insertion_service = EmailContentInsertionService() 