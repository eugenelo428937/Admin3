from django.db import models
from django.contrib.auth.models import User
import logging

from .template import EmailTemplate

logger = logging.getLogger(__name__)


class EmailContentRule(models.Model):
    """Rules for triggering dynamic content insertion. Focuses purely on conditions and triggering logic."""

    RULE_TYPES = [
        ('product_based', 'Product-Based Content'),
        ('user_attribute', 'User Attribute-Based'),
        ('order_value', 'Order Value-Based'),
        ('location_based', 'Location/Country-Based'),
        ('date_based', 'Date/Time-Based'),
        ('custom_condition', 'Custom Condition'),
    ]

    CONDITION_OPERATORS = [
        ('equals', 'Equals'),
        ('not_equals', 'Not Equals'),
        ('in', 'In List'),
        ('not_in', 'Not In List'),
        ('greater_than', 'Greater Than'),
        ('less_than', 'Less Than'),
        ('greater_equal', 'Greater Than or Equal'),
        ('less_equal', 'Less Than or Equal'),
        ('contains', 'Contains'),
        ('not_contains', 'Does Not Contain'),
        ('starts_with', 'Starts With'),
        ('ends_with', 'Ends With'),
        ('regex_match', 'Regular Expression Match'),
        ('exists', 'Field Exists'),
        ('not_exists', 'Field Does Not Exist'),
    ]

    # Rule identification
    name = models.CharField(max_length=200, help_text="Rule name for identification")
    description = models.TextField(blank=True, help_text="Rule description and purpose")
    rule_type = models.CharField(max_length=30, choices=RULE_TYPES, help_text="Type of rule condition")

    # Target placeholder (replaces placeholder_name string)
    placeholder = models.ForeignKey(
        'EmailContentPlaceholder',  # String reference to avoid forward reference issue
        on_delete=models.CASCADE,
        related_name='content_rules',
        help_text="Placeholder that this rule targets"
    )

    # Associated templates
    templates = models.ManyToManyField(EmailTemplate, through='EmailTemplateContentRule', related_name='content_rules')

    # Condition configuration (core responsibility of this model)
    condition_field = models.CharField(max_length=100, help_text="Field name to evaluate (e.g., 'items.product_code', 'user.country')")
    condition_operator = models.CharField(max_length=20, choices=CONDITION_OPERATORS, help_text="Comparison operator")
    condition_value = models.JSONField(help_text="Value(s) to compare against")

    # Advanced conditions
    additional_conditions = models.JSONField(default=list, blank=True, help_text="Additional AND/OR conditions")
    custom_logic = models.TextField(blank=True, help_text="Custom Python logic for complex conditions")

    # Priority and ordering
    priority = models.IntegerField(default=0, help_text="Rule priority (higher numbers processed first)")
    is_exclusive = models.BooleanField(default=False, help_text="Stop processing other rules if this one matches")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'utils_email_content_rule'
        ordering = ['-priority', 'name']
        verbose_name = 'Email Content Rule'
        verbose_name_plural = 'Email Content Rules'

    def __str__(self):
        return f"{self.name} → {self.placeholder.name} ({self.rule_type})"

    def evaluate_condition(self, context):
        """
        Evaluate if this rule's condition matches the given context.

        Args:
            context (dict): Email template context data

        Returns:
            bool: True if condition matches, False otherwise
        """
        try:
            # Extract field value from context using dot notation
            field_value = self._get_nested_field_value(context, self.condition_field)

            # Handle special case for product-based rules where we need to check items
            if self.rule_type == 'product_based' and 'items' in context:
                return self._evaluate_product_condition(context['items'])

            # Evaluate the main condition
            result = self._evaluate_operator(field_value, self.condition_operator, self.condition_value)

            # Evaluate additional conditions if present
            if self.additional_conditions:
                for additional_condition in self.additional_conditions:
                    additional_result = self._evaluate_additional_condition(context, additional_condition)

                    # Handle AND/OR logic
                    if additional_condition.get('logic', 'AND') == 'AND':
                        result = result and additional_result
                    else:  # OR
                        result = result or additional_result

            return result

        except Exception as e:
            logger.error(f"Error evaluating content rule {self.name}: {str(e)}")
            return False

    def _get_nested_field_value(self, context, field_path):
        """Extract value from nested dictionary using dot notation."""
        keys = field_path.split('.')
        value = context

        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and key.isdigit():
                index = int(key)
                value = value[index] if 0 <= index < len(value) else None
            else:
                return None

        return value

    def _evaluate_product_condition(self, items):
        """Evaluate product-based conditions against order items."""
        # Extract the field name from condition_field (e.g., 'items.product_code' -> 'product_code')
        field_parts = self.condition_field.split('.')
        if len(field_parts) > 1 and field_parts[0] == 'items':
            field_name = field_parts[1]
        else:
            field_name = 'product_id'  # default fallback

        for item in items:
            field_value = item.get(field_name)
            if self._evaluate_operator(field_value, self.condition_operator, self.condition_value):
                return True
        return False

    def _evaluate_operator(self, field_value, operator, condition_value):
        """Evaluate a single condition using the specified operator."""
        if operator == 'equals':
            return field_value == condition_value
        elif operator == 'not_equals':
            return field_value != condition_value
        elif operator == 'in':
            return field_value in condition_value if isinstance(condition_value, list) else False
        elif operator == 'not_in':
            return field_value not in condition_value if isinstance(condition_value, list) else True
        elif operator == 'greater_than':
            return field_value > condition_value if field_value is not None else False
        elif operator == 'less_than':
            return field_value < condition_value if field_value is not None else False
        elif operator == 'greater_equal':
            return field_value >= condition_value if field_value is not None else False
        elif operator == 'less_equal':
            return field_value <= condition_value if field_value is not None else False
        elif operator == 'contains':
            return str(condition_value) in str(field_value) if field_value is not None else False
        elif operator == 'not_contains':
            return str(condition_value) not in str(field_value) if field_value is not None else True
        elif operator == 'starts_with':
            return str(field_value).startswith(str(condition_value)) if field_value is not None else False
        elif operator == 'ends_with':
            return str(field_value).endswith(str(condition_value)) if field_value is not None else False
        elif operator == 'exists':
            return field_value is not None
        elif operator == 'not_exists':
            return field_value is None
        elif operator == 'regex_match':
            import re
            return bool(re.match(str(condition_value), str(field_value))) if field_value is not None else False
        else:
            return False

    def _evaluate_additional_condition(self, context, condition):
        """Evaluate an additional condition."""
        field_value = self._get_nested_field_value(context, condition['field'])
        return self._evaluate_operator(field_value, condition['operator'], condition['value'])

    def render_content(self, context):
        """
        Render the content template with the given context.

        Args:
            context (dict): Email template context data

        Returns:
            str: Rendered content
        """
        try:
            from django.template import Template, Context

            # Get content template from placeholder
            content_template = self.placeholder.default_content_template
            if not content_template:
                logger.warning(f"No default content template found for placeholder {self.placeholder.name}")
                return ""

            # Combine placeholder variables with context
            combined_context = {
                **self.placeholder.content_variables,
                **context
            }

            template = Template(content_template)
            rendered_content = template.render(Context(combined_context))

            return rendered_content

        except Exception as e:
            logger.error(f"Error rendering content for rule {self.name}: {str(e)}")
            return ""


class EmailTemplateContentRule(models.Model):
    """Association between email templates and content rules."""

    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name='template_content_rules')
    content_rule = models.ForeignKey(EmailContentRule, on_delete=models.CASCADE, related_name='template_associations')

    # Rule-specific overrides
    is_enabled = models.BooleanField(default=True, help_text="Enable this rule for this template")
    priority_override = models.IntegerField(null=True, blank=True, help_text="Override rule priority for this template")

    # Template-specific content overrides (simplified since content config is now in placeholder)
    content_override = models.TextField(blank=True, help_text="Override content template for this specific template")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'utils_email_template_content_rule'
        unique_together = ['template', 'content_rule']
        ordering = ['-priority_override', '-content_rule__priority']
        verbose_name = 'Template Content Rule'
        verbose_name_plural = 'Template Content Rules'

    def __str__(self):
        return f"{self.template.name} - {self.content_rule.name} → {self.content_rule.placeholder.name}"

    @property
    def effective_priority(self):
        """Get the effective priority (override or rule default)."""
        return self.priority_override if self.priority_override is not None else self.content_rule.priority

    def get_content_template(self):
        """Get the effective content template (override or placeholder default)."""
        return self.content_override if self.content_override else self.content_rule.placeholder.default_content_template

    def get_content_variables(self):
        """Get the content variables from the associated placeholder."""
        return self.content_rule.placeholder.content_variables
