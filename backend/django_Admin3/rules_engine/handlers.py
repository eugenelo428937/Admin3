from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Rule, RuleExecution, HolidayCalendar, RuleEntryPoint
import logging

logger = logging.getLogger(__name__)


class RuleContext:
    """Context object containing all data needed for rule evaluation"""
    
    def __init__(self, entry_point_code: str, user=None, trigger_type: str = None, **kwargs):
        # Support both new entry_point_code and legacy trigger_type
        self.entry_point_code = entry_point_code
        self.trigger_type = trigger_type or entry_point_code  # Backward compatibility
        self.user = user
        self.timestamp = timezone.now()
        self.data = kwargs
        self.results = []
        
        # Debug logging (only in development)
        if logger.level <= logging.DEBUG:
            logger.debug(f"RuleContext created: entry_point={entry_point_code}, user={user.email if user else 'None'}")
        
    def add_data(self, key: str, value: Any):
        """Add data to context"""
        self.data[key] = value
        
    def get_data(self, key: str, default=None):
        """Get data from context"""
        return self.data.get(key, default)


class RuleResult:
    """Result of rule execution"""
    
    def __init__(self, rule: Rule, triggered: bool, actions: List[Dict] = None, error: str = None):
        self.rule = rule
        self.triggered = triggered
        self.actions = actions or []
        self.error = error
        self.timestamp = timezone.now()


class BaseRuleHandler(ABC):
    """Abstract base class for rule handlers implementing Chain of Responsibility"""
    
    def __init__(self):
        self._next_handler: Optional[BaseRuleHandler] = None
        
    def set_next(self, handler: 'BaseRuleHandler') -> 'BaseRuleHandler':
        """Set the next handler in the chain"""
        self._next_handler = handler
        return handler
        
    @abstractmethod
    def can_handle(self, context: RuleContext) -> bool:
        """Check if this handler can process the given context"""
        pass
        
    @abstractmethod
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle rules for this specific type"""
        pass
        
    def handle(self, context: RuleContext) -> List[RuleResult]:
        """Main entry point for handling rules"""
        results = []
        
        if self.can_handle(context):
            try:
                results.extend(self.handle_rules(context))
            except Exception as e:
                logger.error(f"Error in {self.__class__.__name__}: {str(e)}")
                
        # Continue chain
        if self._next_handler:
            results.extend(self._next_handler.handle(context))
            
        return results
        
    def _get_rules_for_context(self, context: RuleContext):
        """Get rules for the given context using chains or individual rules"""
        rules = Rule.objects.filter(is_active=True)
        
        # Try to get rules from chains first (new system)
        if hasattr(context, 'entry_point_code') and context.entry_point_code:
            try:
                entry_point = RuleEntryPoint.objects.get(code=context.entry_point_code, is_active=True)
                
                # Check if there are active chains for this entry point
                chains = entry_point.chains.filter(is_active=True)
                if chains.exists():
                    # Get rules from chains in execution order
                    from .models import RuleChainLink
                    chain_rules = []
                    for chain in chains:
                        links = RuleChainLink.objects.filter(
                            chain=chain, 
                            is_active=True
                        ).select_related('rule').order_by('execution_order')
                        chain_rules.extend([link.rule for link in links if link.rule.is_active])
                    
                    if chain_rules:
                        # Preserve order from chains
                        return chain_rules
                
                # Fall back to individual rules for this entry point
                rules = rules.filter(entry_point=entry_point)
                
            except RuleEntryPoint.DoesNotExist:
                # Fall back to trigger_type if entry_point doesn't exist
                if hasattr(context, 'trigger_type') and context.trigger_type:
                    rules = rules.filter(trigger_type=context.trigger_type)
                else:
                    return Rule.objects.none()
        elif hasattr(context, 'trigger_type') and context.trigger_type:
            # Legacy trigger_type system
            rules = rules.filter(trigger_type=context.trigger_type)
        else:
            return Rule.objects.none()
            
        return rules.order_by('priority')
    
    def _evaluate_rule_conditions(self, rule: Rule, context: RuleContext) -> bool:
        """Evaluate all conditions for a rule using composite condition groups"""
        # Check if rule has condition groups (new system)
        if rule.condition_groups.exists():
            return self._evaluate_condition_groups(rule, context)
        
        # Fallback to legacy individual conditions
        if not rule.conditions.exists():
            return True  # No conditions means always trigger
        
        condition_results = []
        for condition in rule.conditions.filter(condition_group__isnull=True):
            result = condition.evaluate(context.data)
            condition_results.append(result)
        
        # Use rule's success criteria to determine overall result
        return rule.evaluate_success_criteria(condition_results)
    
    def _evaluate_condition_groups(self, rule: Rule, context: RuleContext) -> bool:
        """Evaluate condition groups for composite conditions"""
        group_results = []
        
        # Evaluate top-level condition groups (those without parent groups)
        for group in rule.condition_groups.filter(parent_group__isnull=True, is_active=True):
            try:
                result = group.evaluate(context.data)
                group_results.append(result)
            except Exception as e:
                logger.error(f"Error evaluating condition group {group.id}: {str(e)}")
                group_results.append(False)
        
        # If no groups, return True
        if not group_results:
            return True
        
        # Use rule's success criteria to determine overall result
        return rule.evaluate_success_criteria(group_results)
        
    def _execute_rule_actions(self, rule: Rule, context: RuleContext) -> List[Dict]:
        """Execute all actions for a triggered rule"""
        executed_actions = []
        
        for action in rule.actions.all():
            try:
                result = self._execute_action(action, context)
                executed_actions.append({
                    'action_type': action.action_type,
                    'result': result,
                    'timestamp': timezone.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Error executing action {action.id}: {str(e)}")
                executed_actions.append({
                    'action_type': action.action_type,
                    'error': str(e),
                    'timestamp': timezone.now().isoformat()
                })
                
        return executed_actions
        
    def _execute_action(self, action, context: RuleContext) -> Dict:
        """Execute a specific action"""
        # Map new action types to legacy handlers for backward compatibility
        action_type = action.action_type
        if action_type == 'display':
            action_type = 'show_message'
        elif action_type == 'acknowledge':
            action_type = 'require_acknowledgment'
        elif action_type == 'custom':
            action_type = 'custom_function'
        
        if action_type == 'show_message':
            return self._create_message_action(action, context)
        elif action_type == 'require_acknowledgment':
            return self._create_acknowledgment_action(action, context)
        elif action_type == 'log_event':
            return self._create_log_action(action, context)
        elif action_type == 'calculate_vat':
            return self._create_vat_calculation_action(action, context)
        elif action_type == 'apply_discount':
            return self._create_discount_calculation_action(action, context)
        elif action_type == 'calculate_fee':
            return self._create_fee_calculation_action(action, context)
        elif action_type == 'custom_function':
            return self._execute_custom_function_action(action, context)
        else:
            return {'message': f'Unknown action type: {action.action_type}'}
            
    def _create_message_action(self, action, context: RuleContext) -> Dict:
        """Create a message action result"""
        # Check if action has a custom function to execute
        custom_function_result = {}
        if action.parameters and action.parameters.get('function'):
            try:
                # Execute the custom function to get data for template variables
                custom_function_result = self._execute_custom_function_action(action, context)
            except Exception as e:
                logger.error(f"Error executing custom function for message action: {str(e)}")
        
        message_data = {
            'type': 'message',
            'message_type': action.message_template.message_type if action.message_template else 'info',
            'title': '',
            'content': '',
            'requires_acknowledgment': action.rule.is_blocking,
            'rule_id': action.rule.id,
            'template_id': action.message_template.id if action.message_template else None,
            'custom_function_result': self._make_serializable(custom_function_result)
        }
        
        if action.message_template:
            template = action.message_template
            
            # Process template variables in title
            title = template.title
            for var_name in template.variables:
                var_value = self._get_variable_value(var_name, context, action, custom_function_result)
                title = title.replace(f"{{{var_name}}}", str(var_value))
            message_data['title'] = title
            
            # Handle different content formats
            if template.content_format == 'json' and template.json_content:
                # Use structured JSON content
                json_content = template.json_content.copy()
                
                # Process variables in JSON content recursively
                json_content = self._process_json_variables(json_content, template.variables, context, action, custom_function_result)
                
                message_data.update({
                    'content_format': 'json',
                    'json_content': self._make_serializable(json_content),
                    'content': ''  # Keep empty for backward compatibility
                })
            else:
                # Use traditional HTML/Markdown content
                content = template.content
                for var_name in template.variables:
                    var_value = self._get_variable_value(var_name, context, action, custom_function_result)
                    content = content.replace(f"{{{var_name}}}", str(var_value))
                
                message_data.update({
                    'content_format': template.content_format,
                    'content': content
                })
        else:
            # Use parameters directly
            message_data.update(action.parameters)
            
        return message_data
    
    def _process_json_variables(self, json_content, variables, context, action, custom_function_result=None):
        """Recursively process variables in JSON content structure"""
        if isinstance(json_content, dict):
            result = {}
            for key, value in json_content.items():
                result[key] = self._process_json_variables(value, variables, context, action, custom_function_result)
            return result
        elif isinstance(json_content, list):
            return [self._process_json_variables(item, variables, context, action, custom_function_result) for item in json_content]
        elif isinstance(json_content, str):
            # Process variables in string values
            processed_text = json_content
            for var_name in variables:
                var_value = self._get_variable_value(var_name, context, action, custom_function_result)
                processed_text = processed_text.replace(f"{{{var_name}}}", str(var_value))
            return processed_text
        else:
            return json_content
        
    def _create_acknowledgment_action(self, action, context: RuleContext) -> Dict:
        """Create an acknowledgment action result"""
        # Execute custom function to get data for message content if available
        custom_function_result = {}
        if action.parameters and action.parameters.get('function'):
            try:
                custom_function_result = self._execute_custom_function_action(action, context)
            except Exception as e:
                logger.error(f"Error executing custom function for acknowledgment action: {str(e)}")

        message_data = {
            'type': 'acknowledgment',
            'message_type': action.message_template.message_type if action.message_template else 'warning',
            'title': '',
            'content': '',
            'requires_acknowledgment': True,
            'rule_id': action.rule.id,
            'template_id': action.message_template.id if action.message_template else None,
            'user_id': context.user.id if context.user else None,
            'custom_function_result': self._make_serializable(custom_function_result)
        }
        
        if action.message_template:
            template = action.message_template
            
            # Process template variables in title
            title = template.title
            for var_name in template.variables:
                var_value = self._get_variable_value(var_name, context, action, custom_function_result)
                title = title.replace(f"{{{var_name}}}", str(var_value))
            message_data['title'] = title
            
            # Handle different content formats
            if template.content_format == 'json' and template.json_content:
                # Use structured JSON content
                json_content = template.json_content.copy()
                
                # Process variables in JSON content recursively
                json_content = self._process_json_variables(json_content, template.variables, context, action, custom_function_result)
                
                message_data.update({
                    'content_format': 'json',
                    'json_content': self._make_serializable(json_content),
                    'content': ''  # Keep empty for backward compatibility
                })
            else:
                # Use traditional HTML/Markdown content
                content = template.content
                for var_name in template.variables:
                    var_value = self._get_variable_value(var_name, context, action, custom_function_result)
                    content = content.replace(f"{{{var_name}}}", str(var_value))
                
                message_data.update({
                    'content_format': template.content_format,
                    'content': content
                })
        
        return message_data
        
    def _create_log_action(self, action, context: RuleContext) -> Dict:
        """Create a log action result"""
        log_data = {
            'type': 'log',
            'message': action.parameters.get('message', 'Rule triggered'),
            'level': action.parameters.get('level', 'info'),
            'timestamp': timezone.now().isoformat()
        }
        
        # Actually log the event
        getattr(logger, log_data['level'], logger.info)(
            f"Rule {action.rule.name}: {log_data['message']}"
        )
        
        return log_data
        
    def _get_variable_value(self, var_name: str, context: RuleContext, action=None, custom_function_result=None) -> str:
        """Get variable value for template substitution"""
        # Try custom function result first (highest priority for dynamic values)
        if custom_function_result and isinstance(custom_function_result, dict):
            # Check if custom function result has expired products data
            if custom_function_result.get('expired_products'):
                for product in custom_function_result['expired_products']:
                    if var_name in product:
                        return str(product[var_name])
            
            # Check direct custom function result
            if var_name in custom_function_result:
                return str(custom_function_result[var_name])
        
        # Try expired deadline result from context (stored by condition evaluation)
        if 'expired_deadline_result' in context.data:
            expired_result = context.data['expired_deadline_result']
            if isinstance(expired_result, dict):
                # Check if there are expired products with this variable
                if expired_result.get('expired_products'):
                    for product in expired_result['expired_products']:
                        if var_name in product:
                            return str(product[var_name])
                
                # Check direct values in expired result
                if var_name in expired_result:
                    return str(expired_result[var_name])
        
        # Try action parameters (high priority)
        if action and hasattr(action, 'parameters') and var_name in action.parameters:
            return str(action.parameters[var_name])
            
        # Try context data
        if var_name in context.data:
            return str(context.data[var_name])
            
        # Try user data
        if context.user and hasattr(context.user, var_name):
            return str(getattr(context.user, var_name))
            
        # Try nested values
        if '.' in var_name:
            keys = var_name.split('.')
            value = context.data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif hasattr(value, key):
                    value = getattr(value, key)
                else:
                    return f"{{{var_name}}}"  # Return placeholder if not found
            return str(value)
            
        return f"{{{var_name}}}"  # Return placeholder if not found
    
    def _make_serializable(self, data):
        """Convert data to JSON-serializable format"""
        from django.contrib.auth.models import User
        
        if isinstance(data, dict):
            result = {}
            for key, value in data.items():
                result[key] = self._make_serializable(value)
            return result
        elif isinstance(data, list):
            return [self._make_serializable(item) for item in data]
        elif isinstance(data, User):
            # Specifically handle User objects
            return {'id': data.id, 'email': str(data.email), 'type': 'User'}
        elif hasattr(data, '__dict__'):
            # Convert Django model instances to dict
            if hasattr(data, 'id'):
                return {'id': data.id, 'type': data.__class__.__name__}
            else:
                return {'type': data.__class__.__name__}
        elif hasattr(data, 'isoformat'):
            # Handle datetime objects
            return data.isoformat()
        else:
            try:
                # Try to serialize, if it fails, convert to string
                import json
                json.dumps(data)
                return data
            except (TypeError, ValueError):
                return str(data)
        
    def _create_vat_calculation_action(self, action, context: RuleContext) -> Dict:
        """Create a VAT calculation action result"""
        try:
            from . import custom_functions
            
            # Get calculation function from parameters
            function_name = action.parameters.get('function', 'calculate_vat_standard')
            cart_items = context.get_data('cart_items', [])
            
            # Get the calculation function
            calc_function = getattr(custom_functions, function_name, None)
            if not calc_function:
                raise ValueError(f"VAT calculation function '{function_name}' not found")
            
            # Execute the calculation
            calculation_result = calc_function(cart_items, action.parameters)
            
            return {
                'type': 'calculation',
                'calculation_type': 'vat',
                'function_name': function_name,
                'calculation_result': self._make_serializable(calculation_result),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in VAT calculation: {str(e)}")
            return {
                'type': 'calculation',
                'calculation_type': 'vat',
                'error': str(e),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
    def _create_discount_calculation_action(self, action, context: RuleContext) -> Dict:
        """Create a discount calculation action result"""
        try:
            from . import custom_functions
            
            function_name = action.parameters.get('function', 'calculate_discount')
            cart_items = context.get_data('cart_items', [])
            
            calc_function = getattr(custom_functions, function_name, None)
            if not calc_function:
                raise ValueError(f"Discount calculation function '{function_name}' not found")
            
            calculation_result = calc_function(cart_items, action.parameters)
            
            return {
                'type': 'calculation',
                'calculation_type': 'discount',
                'function_name': function_name,
                'calculation_result': self._make_serializable(calculation_result),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in discount calculation: {str(e)}")
            return {
                'type': 'calculation',
                'calculation_type': 'discount',
                'error': str(e),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
    def _create_fee_calculation_action(self, action, context: RuleContext) -> Dict:
        """Create a fee calculation action result"""
        try:
            from . import custom_functions
            
            function_name = action.parameters.get('function', 'calculate_fee')
            cart_items = context.get_data('cart_items', [])
            
            calc_function = getattr(custom_functions, function_name, None)
            if not calc_function:
                raise ValueError(f"Fee calculation function '{function_name}' not found")
            
            # Prepare parameters with additional context
            function_params = action.parameters.copy()
            function_params.update({
                'cart_id': context.get_data('cart_id'),
                'rule_id': action.rule.id,
                'rule_name': action.rule.name,
                'user_id': context.user.id if context.user else None,
                'timestamp': timezone.now().isoformat(),
                'payment_method': context.get_data('payment_method', 'credit_card'),
            })
            
            calculation_result = calc_function(cart_items, function_params)
            
            return {
                'type': 'calculation',
                'calculation_type': 'fee',
                'function_name': function_name,
                'calculation_result': self._make_serializable(calculation_result),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in fee calculation: {str(e)}")
            return {
                'type': 'calculation',
                'calculation_type': 'fee',
                'error': str(e),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
    def _execute_custom_function_action(self, action, context: RuleContext) -> Dict:
        """Execute a custom function action"""
        try:
            from . import custom_functions
            
            function_name = action.parameters.get('function')
            if not function_name:
                raise ValueError("Custom function name not specified")
            
            custom_function = getattr(custom_functions, function_name, None)
            if not custom_function:
                raise ValueError(f"Custom function '{function_name}' not found")
            
            # Prepare function parameters
            func_params = action.parameters.copy()
            func_params.pop('function', None)  # Remove function name from params
            
            # Execute the function
            result = custom_function(context.get_data('cart_items', []), func_params)
            
            return {
                'type': 'custom_function',
                'function_name': function_name,
                'result': self._make_serializable(result),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error executing custom function: {str(e)}")
            return {
                'type': 'custom_function',
                'error': str(e),
                'rule_id': action.rule.id,
                'timestamp': timezone.now().isoformat()
            }


class ProductRuleHandler(BaseRuleHandler):
    """Handle product-specific rules"""
    
    def can_handle(self, context: RuleContext) -> bool:
        # Support both new entry point codes and legacy trigger types
        entry_point_codes = ['add_to_cart', 'product_list_mount']
        trigger_types = ['cart_add', 'product_view']
        
        entry_point_match = hasattr(context, 'entry_point_code') and context.entry_point_code in entry_point_codes
        trigger_type_match = hasattr(context, 'trigger_type') and context.trigger_type in trigger_types
        
        return (entry_point_match or trigger_type_match) and 'product' in context.data
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle product-related rules with chain execution support"""
        results = []
        rules = self._get_rules_for_context(context)
        
        for rule in rules:
            try:
                rule_passed = self._evaluate_rule_conditions(rule, context)
                
                if rule_passed:
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution with serializable context but keep original user
                    serializable_context = self._make_serializable(context.data)
                    serializable_actions = self._make_serializable(actions)
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,  # Keep original User object
                        trigger_context=serializable_context,
                        conditions_met=True,
                        actions_executed=serializable_actions
                    )
                else:
                    results.append(RuleResult(rule, False))
                    
                    # Check if we should stop chain execution on failure
                    if rule.return_on_failure:
                        logger.info(f"Rule {rule.id} failed and return_on_failure is True, stopping chain")
                        break
                    
            except Exception as e:
                error_msg = f"Error processing rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
                # Log failed execution with serializable context but keep original user
                serializable_context = self._make_serializable(context.data)
                RuleExecution.objects.create(
                    rule=rule,
                    user=context.user,  # Keep original User object
                    trigger_context=serializable_context,
                    conditions_met=False,
                    error_message=error_msg
                )
                
                # Check if we should stop chain execution on error
                if rule.return_on_failure:
                    logger.info(f"Rule {rule.id} had error and return_on_failure is True, stopping chain")
                    break
                
        return results


class CheckoutRuleHandler(BaseRuleHandler):
    """Handle checkout-specific rules including terms & conditions"""
    
    def can_handle(self, context: RuleContext) -> bool:
        # Support both new entry point codes and legacy trigger types
        entry_point_codes = ['checkout_start', 'checkout_terms', 'checkout_details', 
                           'checkout_payment_start', 'checkout_payment_end', 'checkout_order_placed']
        trigger_types = ['checkout_start', 'checkout_confirm']
        
        entry_point_match = hasattr(context, 'entry_point_code') and context.entry_point_code in entry_point_codes
        trigger_type_match = hasattr(context, 'trigger_type') and context.trigger_type in trigger_types
        
        return entry_point_match or trigger_type_match
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle checkout-related rules"""
        results = []
        rules = self._get_rules_for_context(context)
        
        # Serialize cart items if present
        if 'cart_items' in context.data:
            cart_items = context.data['cart_items']
            if hasattr(cart_items, '__iter__') and not isinstance(cart_items, (list, dict)):
                context.data['cart_items'] = [
                    {
                        'id': item.id,
                        'product_id': item.product.id,
                        'product_name': item.product.product.fullname,
                        'product_code': item.product.product.code,
                        'subject_code': item.product.exam_session_subject.subject.code,
                        'exam_session_code': item.product.exam_session_subject.exam_session.session_code,
                        'quantity': item.quantity,
                        'price_type': item.price_type,
                        'actual_price': str(item.actual_price) if item.actual_price else None,
                        'is_marking': getattr(item, 'is_marking', False),
                        'has_expired_deadline': getattr(item, 'has_expired_deadline', False),
                        'is_marking_and_expired': getattr(item, 'is_marking', False) and getattr(item, 'has_expired_deadline', False),
                        'metadata': item.metadata
                    }
                    for item in cart_items
                ]
                
                # Add cart-level context data
                if 'cart' in context.data and hasattr(context.data['cart'], 'has_marking'):
                    cart = context.data['cart']
                    context.data['cart'] = {
                        'has_marking': getattr(cart, 'has_marking', False),
                        'has_material': any(not item.get('is_marking', False) for item in context.data['cart_items']),
                        'has_tutorial': any('tutorial' in item.get('metadata', {}).get('type', '') for item in context.data['cart_items']),
                        'item_count': len(context.data['cart_items']),
                        'total_value': sum(float(item.get('actual_price', 0)) * item.get('quantity', 1) for item in context.data['cart_items'])
                    }
        
        for rule in rules:
            try:
                rule_passed = self._evaluate_rule_conditions(rule, context)
                
                if rule_passed:
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution with serializable context but keep original user
                    serializable_context = self._make_serializable(context.data)
                    serializable_actions = self._make_serializable(actions)
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,  # Keep original User object
                        trigger_context=serializable_context,
                        conditions_met=True,
                        actions_executed=serializable_actions
                    )
                else:
                    results.append(RuleResult(rule, False))
                    
                    # Check if we should stop chain execution on failure
                    if rule.return_on_failure:
                        logger.info(f"Checkout rule {rule.id} failed and return_on_failure is True, stopping chain")
                        break
                    
            except Exception as e:
                error_msg = f"Error processing rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
                # Check if we should stop chain execution on error
                if rule.return_on_failure:
                    logger.info(f"Checkout rule {rule.id} had error and return_on_failure is True, stopping chain")
                    break
                
        return results


class HolidayRuleHandler(BaseRuleHandler):
    """Handle holiday and date-specific rules"""
    
    def can_handle(self, context: RuleContext) -> bool:
        return True  # Can handle any context to check for holiday conditions
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle holiday-related rules"""
        results = []
        
        # Add holiday context data
        self._add_holiday_context(context)
        
        # Get rules that have holiday_proximity OR date_range conditions (for holiday periods)
        base_rules = self._get_rules_for_context(context)
        rules = base_rules.filter(
            conditions__condition_type__in=['holiday_proximity', 'date_range']
        ).distinct()
        
        for rule in rules:
            try:
                if self._evaluate_rule_conditions(rule, context):
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution with serializable context but keep original user
                    serializable_context = self._make_serializable(context.data)
                    serializable_actions = self._make_serializable(actions)
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,  # Keep original User object
                        trigger_context=serializable_context,
                        conditions_met=True,
                        actions_executed=serializable_actions
                    )
                    
            except Exception as e:
                error_msg = f"Error processing holiday rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
        return results
        
    def _add_holiday_context(self, context: RuleContext):
        """Add holiday-related data to context"""
        now = timezone.now().date()
        
        # Find upcoming holidays within 30 days
        upcoming_holidays = HolidayCalendar.objects.filter(
            date__gte=now,
            date__lte=now + timedelta(days=30)
        ).order_by('date')
        
        # Find recent holidays within 7 days
        recent_holidays = HolidayCalendar.objects.filter(
            date__gte=now - timedelta(days=7),
            date__lt=now
        ).order_by('date')
        
        context.add_data('upcoming_holidays', list(upcoming_holidays.values()))
        context.add_data('recent_holidays', list(recent_holidays.values()))
        context.add_data('current_date', now.isoformat())
        
        # Calculate business days until next holiday
        if upcoming_holidays.exists():
            next_holiday = upcoming_holidays.first()
            business_days = self._calculate_business_days(now, next_holiday.date)
            context.add_data('business_days_to_next_holiday', business_days)
            context.add_data('next_holiday_name', next_holiday.name)
            context.add_data('next_holiday_date', next_holiday.date.isoformat())
            
    def _calculate_business_days(self, start_date, end_date):
        """Calculate business days between two dates"""
        business_days = 0
        current_date = start_date
        
        while current_date < end_date:
            if current_date.weekday() < 5:  # Monday = 0, Sunday = 6
                business_days += 1
            current_date += timedelta(days=1)
            
        return business_days


class UserRuleHandler(BaseRuleHandler):
    """Handle user-specific rules"""
    
    def can_handle(self, context: RuleContext) -> bool:
        return context.user is not None
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle user-related rules"""
        results = []
        
        # Add user context data
        self._add_user_context(context)
        
        # Get rules that have user-related conditions
        base_rules = self._get_rules_for_context(context)
        rules = base_rules.filter(
            conditions__condition_type__in=['user_type', 'user_order_history']
        ).distinct()
        
        for rule in rules:
            try:
                if self._evaluate_rule_conditions(rule, context):
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
            except Exception as e:
                error_msg = f"Error processing user rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
        return results
        
    def _add_user_context(self, context: RuleContext):
        """Add user-related data to context"""
        user = context.user
        
        # Add user data
        context.add_data('user_id', user.id)
        context.add_data('user_email', user.email)
        context.add_data('user_is_staff', user.is_staff)
        context.add_data('user_date_joined', user.date_joined.isoformat())
        
        # Add order history data (requires ActedOrder model)
        try:
            from cart.models import ActedOrder
            user_orders = ActedOrder.objects.filter(user=user)
            context.add_data('user_order_count', user_orders.count())
            context.add_data('user_is_returning_customer', user_orders.count() > 0)
            
            if user_orders.exists():
                latest_order = user_orders.latest('created_at')
                context.add_data('user_latest_order_date', latest_order.created_at.isoformat())
                
        except ImportError:
            pass