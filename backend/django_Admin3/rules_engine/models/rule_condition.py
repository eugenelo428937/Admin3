"""
Rule Condition Model
"""
from .base import models, json, logger
from .rule import Rule


class RuleCondition(models.Model):
    """Individual conditions that must be met for a rule to trigger"""
    CONDITION_TYPES = [
        ('product_category', 'Product Category'),
        ('product_code', 'Product Code'),
        ('product_type', 'Product Type'),
        ('user_type', 'User Type'),
        ('date_range', 'Date Range'),
        ('holiday_proximity', 'Holiday Proximity'),
        ('cart_value', 'Cart Value'),
        ('cart_item_count', 'Cart Item Count'),
        ('user_order_history', 'User Order History'),
        ('custom_field', 'Custom Field'),
        # New condition types from refinement requirements
        ('user_country', 'User Country'),
        ('user_home_address', 'User Home Address'),
        ('user_home_email', 'User Home Email'),
        ('user_work_address', 'User Work Address'),
        ('user_work_email', 'User Work Email'),
        ('user_is_reduced_rate', 'User Is Reduced Rate'),
        ('user_is_apprentice', 'User Is Apprentice'),
        ('user_is_caa', 'User Is CAA'),
        ('user_is_study_plus', 'User Is Study Plus'),
        ('cart_has_material', 'Cart Has Material'),
        ('cart_has_marking', 'Cart Has Marking'),
        ('cart_has_tutorial', 'Cart Has Tutorial'),
        ('product_variations', 'Product Variations'),
        ('material_despatch_date', 'Material Despatch Date'),
        ('marking_expired_deadlines', 'Marking Expired Deadlines'),
        ('tutorial_has_started', 'Tutorial Has Started'),
        ('exam_session_transition_period', 'Exam Session Transition Period'),
        ('date_xmas', 'Christmas Period'),
        ('date_easter', 'Easter Period'),
        ('checkout_payment_method', 'Checkout Payment Method'),
        ('checkout_employer_code', 'Checkout Employer Code'),
        ('cart_item_expired_deadline', 'Cart Item Has Expired Deadline'),
    ]

    OPERATORS = [
        ('equals', 'Equals'),
        ('not_equals', 'Not Equals'),
        ('contains', 'Contains'),
        ('not_contains', 'Does Not Contain'),
        ('greater_than', 'Greater Than'),
        ('less_than', 'Less Than'),
        ('between', 'Between'),
        ('in_list', 'In List'),
        ('not_in_list', 'Not In List'),
        ('regex', 'Regular Expression'),
        ('custom_function', 'Custom Function'),
    ]

    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='conditions')
    condition_group = models.ForeignKey(
        'RuleConditionGroup',
        on_delete=models.CASCADE,
        related_name='conditions',
        null=True,
        blank=True,
        help_text="Optional condition group this condition belongs to"
    )
    condition_type = models.CharField(max_length=30, choices=CONDITION_TYPES)
    field_name = models.CharField(max_length=100, help_text="Field to evaluate (e.g., 'product.type', 'user.email')")
    operator = models.CharField(max_length=20, choices=OPERATORS)
    value = models.TextField(help_text="Value to compare against (can be JSON for complex values)")
    is_negated = models.BooleanField(default=False, help_text="Negate the condition result")

    class Meta:
        db_table = 'acted_rule_conditions'
        verbose_name = 'Rule Condition'
        verbose_name_plural = 'Rule Conditions'

    def __str__(self):
        return f"{self.rule.name}: {self.field_name} {self.operator} {self.value}"

    def evaluate(self, context):
        """Evaluate this condition against the provided context"""
        try:
            # Special handling for cart item expired deadline condition
            if self.condition_type == 'cart_item_expired_deadline':
                return self._evaluate_cart_item_condition(context)
            
            # Get the field value from context using dot notation or condition type mapping
            field_value = self._get_field_value(context)
            comparison_value = self._parse_value(self.value)
            
            if self.operator == 'custom_function':
                from . import custom_functions
                if isinstance(comparison_value, dict) and 'function' in comparison_value:
                    function_name = comparison_value['function']
                    params = comparison_value.get('params', {})
                    
                    # Get the custom function by name
                    custom_function = getattr(custom_functions, function_name, None)
                    if custom_function:
                        # For expired deadline check, we need cart items
                        if function_name == 'check_expired_marking_deadlines':
                            # Get context data safely
                            context_data = context.data if hasattr(context, 'data') else context
                            cart_items = context_data.get('cart_items', [])
                            result_data = custom_function(cart_items, params)
                            
                            # Store the result in context for message template variables
                            if hasattr(context, 'data'):
                                context.data['expired_deadline_result'] = result_data
                            else:
                                context['expired_deadline_result'] = result_data
                                
                            result = result_data.get('has_expired_deadlines', False)
                        else:
                            # For other custom functions, use the original approach
                            enhanced_params = params.copy()
                            context_data = context.data if hasattr(context, 'data') else context
                            enhanced_params.update(context_data)
                            result = custom_function(field_value, enhanced_params)
                    else:
                        logger.error(f"Custom function '{function_name}' not found")
                        result = False
                else:
                    result = False
            else:
                result = self._apply_operator(field_value, comparison_value)
                
            return not result if self.is_negated else result
        except Exception as e:
            # Log error and return False for safety
            logger.error(f"Error evaluating condition: {str(e)}")
            return False
    
    def _evaluate_cart_item_condition(self, context):
        """Evaluate cart item specific conditions"""
        try:
            context_data = context.data if hasattr(context, 'data') else context
            cart_items = context_data.get('cart_items', [])
            
            # Group expired items by product to avoid duplicates
            expired_products_dict = {}
            
            # Check each cart item for expired deadlines
            for item in cart_items:
                # Handle both Django objects and dictionaries
                if hasattr(item, 'get'):
                    # Dictionary format
                    is_marking_and_expired = item.get('is_marking_and_expired', False)
                    product_name = item.get('product_name', 'Unknown')
                    expired_count = item.get('expired_count', 1)
                    total_papers = item.get('total_papers', 1)
                    subject_code = item.get('subject_code', '')
                    product_id = item.get('product_id')
                else:
                    # Django object format
                    is_marking = getattr(item, 'is_marking', False)
                    has_expired_deadline = getattr(item, 'has_expired_deadline', False)
                    is_marking_and_expired = is_marking and has_expired_deadline
                    product_name = item.product.product.fullname
                    subject_code = item.product.exam_session_subject.subject.code
                    product_id = item.product.product.id
                    
                    # Get deadline counts for marking products
                    if is_marking_and_expired:
                        try:
                            from marking.models import MarkingPaper
                            from django.utils import timezone
                            marking_papers = MarkingPaper.objects.filter(exam_session_subject_product=item.product)
                            total_papers = marking_papers.count()
                            expired_count = marking_papers.filter(deadline__lt=timezone.now()).count()
                        except Exception:
                            expired_count = 1
                            total_papers = 1
                    else:
                        expired_count = 0
                        total_papers = 1
                
                if is_marking_and_expired:
                    # Use exam_session_subject_product.id as unique key (current_product from cart item)
                    if hasattr(item, 'product'):
                        # Django object format
                        unique_key = item.product.id  # ExamSessionSubjectProduct ID
                    else:
                        # Dictionary format
                        unique_key = item.get('product_id')  # ExamSessionSubjectProduct ID from dict
                    
                    # If this unique product isn't already in the dict, add it with counts
                    if unique_key not in expired_products_dict:
                        expired_products_dict[unique_key] = {
                            'product_name': product_name,
                            'expired_count': expired_count,
                            'total_papers': total_papers,
                            'subject_code': subject_code,
                            'product_id': product_id,
                            'exam_session_subject_product_id': unique_key
                        }
            
            expired_products = list(expired_products_dict.values())
            
            # Store expired products data in context for template variables
            if expired_products:
                # Create formatted text for all expired products
                product_lines = []
                for product in expired_products:
                    line = f"{product['subject_code']} {product['product_name']} : {product['expired_count']}/{product['total_papers']} deadlines expired."
                    product_lines.append(line)
                
                # Join with HTML line breaks for proper rendering
                all_expired_products_text = '<br/>'.join(product_lines)
                
                # Create a combined product name that includes all products
                combined_product_name = all_expired_products_text.replace('<br/>', '\n')
                
                expired_data = {
                    'expired_products': expired_products,
                    'all_expired_products': all_expired_products_text,
                    # Use combined data that includes all products
                    'product_name': combined_product_name,  # This will contain all products
                    'expired_count': sum(p['expired_count'] for p in expired_products),
                    'total_papers': sum(p['total_papers'] for p in expired_products),
                    'subject_code': ', '.join(p['subject_code'] for p in expired_products)
                }
                
                if hasattr(context, 'data'):
                    context.data['expired_deadline_result'] = expired_data
                    # Also set individual variables directly for easier lookup
                    context.data.update(expired_data)
                else:
                    context['expired_deadline_result'] = expired_data
                    context.update(expired_data)
            
            # Return True if any cart items have expired deadlines
            return len(expired_products) > 0
            
        except Exception as e:
            logger.error(f"Error evaluating cart item condition: {str(e)}")
            return False

    def _get_field_value(self, context):
        """Get field value based on condition type or field name"""
        # Map condition types to context paths for the new refined fields
        condition_mappings = {
            'user_country': 'user.country',
            'user_home_address': 'user.home_address',
            'user_home_email': 'user.home_email',
            'user_work_address': 'user.work_address',
            'user_work_email': 'user.work_email',
            'user_is_reduced_rate': 'user.is_reduced_rate',
            'user_is_apprentice': 'user.is_apprentice',
            'user_is_caa': 'user.is_caa',
            'user_is_study_plus': 'user.is_study_plus',
            'cart_has_material': 'cart.has_material',
            'cart_has_marking': 'cart.has_marking',
            'cart_has_tutorial': 'cart.has_tutorial',
            'product_variations': 'product.product_variations',
            'material_despatch_date': 'product.material_product.despatch_date',
            'marking_expired_deadlines': 'product.marking_product.has_expired_deadlines',
            'tutorial_has_started': 'product.tutorial.has_started',
            'exam_session_transition_period': 'exam_session.transition_period',
            'date_xmas': 'date.xmas',
            'date_easter': 'date.easter',
            'checkout_payment_method': 'checkout.payment_method',
            'checkout_employer_code': 'checkout.employer_code',
            'cart_item_expired_deadline': 'cart_item.is_marking_and_expired',
        }
        
        # Use condition type mapping if available, otherwise use field_name
        field_path = condition_mappings.get(self.condition_type, self.field_name)
        return self._get_nested_value(context, field_path)
    
    def _get_nested_value(self, obj, path):
        """Get nested value from object using dot notation (e.g., 'user.profile.type')"""
        keys = path.split('.')
        value = obj
        for key in keys:
            if hasattr(value, key):
                value = getattr(value, key)
            elif isinstance(value, dict) and key in value:
                value = value[key]
            else:
                # Log the missing field for debugging
                logger.debug(f"Field '{key}' not found in path '{path}', returning None")
                return None
        return value

    def _parse_value(self, value):
        """Parse value string, handling JSON where appropriate"""
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    def _apply_operator(self, field_value, comparison_value):
        """Apply the operator to compare field_value with comparison_value"""
        if self.operator == 'equals':
            return field_value == comparison_value
        elif self.operator == 'not_equals':
            return field_value != comparison_value
        elif self.operator == 'contains':
            if field_value is None:
                return False
            return str(comparison_value) in str(field_value)
        elif self.operator == 'not_contains':
            if field_value is None:
                return True
            return str(comparison_value) not in str(field_value)
        elif self.operator == 'greater_than':
            if field_value is None:
                return False
            try:
                return float(field_value) > float(comparison_value)
            except (ValueError, TypeError):
                return False
        elif self.operator == 'less_than':
            if field_value is None:
                return False
            try:
                return float(field_value) < float(comparison_value)
            except (ValueError, TypeError):
                return False
        elif self.operator == 'between':
            if field_value is None:
                return False
            try:
                if isinstance(comparison_value, list) and len(comparison_value) == 2:
                    # Try numeric comparison first
                    try:
                        return comparison_value[0] <= float(field_value) <= comparison_value[1]
                    except (ValueError, TypeError):
                        # Fall back to string comparison (for dates, etc.)
                        return comparison_value[0] <= str(field_value) <= comparison_value[1]
            except (ValueError, TypeError):
                pass
            return False
        elif self.operator == 'in_list':
            if isinstance(comparison_value, list):
                return field_value in comparison_value
            return field_value == comparison_value
        elif self.operator == 'not_in_list':
            if isinstance(comparison_value, list):
                return field_value not in comparison_value
            return field_value != comparison_value
        elif self.operator == 'regex':
            if field_value is None:
                return False
            import re
            return bool(re.search(str(comparison_value), str(field_value)))
        return False
    
    def get_condition_description(self):
        """Get a human-readable description of this condition"""
        operator_map = {
            'equals': 'equals',
            'not_equals': 'does not equal',
            'contains': 'contains',
            'not_contains': 'does not contain',
            'greater_than': 'is greater than',
            'less_than': 'is less than',
            'between': 'is between',
            'in_list': 'is in',
            'not_in_list': 'is not in',
            'regex': 'matches pattern',
            'custom_function': 'custom evaluation'
        }
        
        operator_text = operator_map.get(self.operator, self.operator)
        negation = 'NOT ' if self.is_negated else ''
        
        return f"{negation}{self.get_condition_type_display()} {operator_text} {self.value}"