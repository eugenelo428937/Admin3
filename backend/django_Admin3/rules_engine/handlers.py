from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Rule, RuleExecution, HolidayCalendar
import logging

logger = logging.getLogger(__name__)


class RuleContext:
    """Context object containing all data needed for rule evaluation"""
    
    def __init__(self, trigger_type: str, user=None, **kwargs):
        self.trigger_type = trigger_type
        self.user = user
        self.timestamp = timezone.now()
        self.data = kwargs
        self.results = []
        
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
        
    def _evaluate_rule_conditions(self, rule: Rule, context: RuleContext) -> bool:
        """Evaluate all conditions for a rule"""
        if not rule.conditions.exists():
            return True  # No conditions means always trigger
            
        for condition in rule.conditions.all():
            if not condition.evaluate(context.data):
                return False
        return True
        
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
        if action.action_type == 'show_message':
            return self._create_message_action(action, context)
        elif action.action_type == 'require_acknowledgment':
            return self._create_acknowledgment_action(action, context)
        elif action.action_type == 'log_event':
            return self._create_log_action(action, context)
        elif action.action_type == 'calculate_vat':
            return self._create_vat_calculation_action(action, context)
        elif action.action_type == 'apply_discount':
            return self._create_discount_calculation_action(action, context)
        elif action.action_type == 'calculate_fee':
            return self._create_fee_calculation_action(action, context)
        elif action.action_type == 'custom_function':
            return self._execute_custom_function_action(action, context)
        else:
            return {'message': f'Unknown action type: {action.action_type}'}
            
    def _create_message_action(self, action, context: RuleContext) -> Dict:
        """Create a message action result"""
        message_data = {
            'type': 'message',
            'message_type': action.message_template.message_type if action.message_template else 'info',
            'title': '',
            'content': '',
            'requires_acknowledgment': action.rule.is_blocking,
            'rule_id': action.rule.id,
            'template_id': action.message_template.id if action.message_template else None
        }
        
        if action.message_template:
            # Process template variables
            title = action.message_template.title
            content = action.message_template.content
            
            # Replace variables in template
            for var_name in action.message_template.variables:
                var_value = self._get_variable_value(var_name, context)
                title = title.replace(f"{{{var_name}}}", str(var_value))
                content = content.replace(f"{{{var_name}}}", str(var_value))
                
            message_data['title'] = title
            message_data['content'] = content
        else:
            # Use parameters directly
            message_data.update(action.parameters)
            
        return message_data
        
    def _create_acknowledgment_action(self, action, context: RuleContext) -> Dict:
        """Create an acknowledgment action result"""
        return {
            'type': 'acknowledgment',
            'rule_id': action.rule.id,
            'template_id': action.message_template.id if action.message_template else None,
            'user_id': context.user.id if context.user else None,
            'requires_acknowledgment': True
        }
        
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
        
    def _get_variable_value(self, var_name: str, context: RuleContext) -> str:
        """Get variable value for template substitution"""
        # Try context data first
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
                'calculation_result': calculation_result,
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
                'calculation_result': calculation_result,
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
                'calculation_result': calculation_result,
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
                'result': result,
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
        return context.trigger_type in ['cart_add', 'product_view'] and 'product' in context.data
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle product-related rules"""
        results = []
        rules = Rule.objects.filter(
            trigger_type=context.trigger_type,
            is_active=True
        ).order_by('priority')
        
        for rule in rules:
            try:
                if self._evaluate_rule_conditions(rule, context):
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,
                        trigger_context=context.data,
                        conditions_met=True,
                        actions_executed=actions
                    )
                else:
                    results.append(RuleResult(rule, False))
                    
            except Exception as e:
                error_msg = f"Error processing rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
                # Log failed execution
                RuleExecution.objects.create(
                    rule=rule,
                    user=context.user,
                    trigger_context=context.data,
                    conditions_met=False,
                    error_message=error_msg
                )
                
        return results


class CheckoutRuleHandler(BaseRuleHandler):
    """Handle checkout-specific rules including terms & conditions"""
    
    def can_handle(self, context: RuleContext) -> bool:
        return context.trigger_type in ['checkout_start', 'checkout_confirm']
        
    def handle_rules(self, context: RuleContext) -> List[RuleResult]:
        """Handle checkout-related rules"""
        results = []
        rules = Rule.objects.filter(
            trigger_type=context.trigger_type,
            is_active=True
        ).order_by('priority')
        
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
                        'metadata': item.metadata
                    }
                    for item in cart_items
                ]
        
        for rule in rules:
            try:
                if self._evaluate_rule_conditions(rule, context):
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,
                        trigger_context=context.data,
                        conditions_met=True,
                        actions_executed=actions
                    )
                else:
                    results.append(RuleResult(rule, False))
                    
            except Exception as e:
                error_msg = f"Error processing rule {rule.id}: {str(e)}"
                logger.error(error_msg)
                results.append(RuleResult(rule, False, error=error_msg))
                
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
        
        rules = Rule.objects.filter(
            trigger_type=context.trigger_type,
            is_active=True,
            conditions__condition_type='holiday_proximity'
        ).distinct().order_by('priority')
        
        for rule in rules:
            try:
                if self._evaluate_rule_conditions(rule, context):
                    actions = self._execute_rule_actions(rule, context)
                    results.append(RuleResult(rule, True, actions))
                    
                    # Log execution
                    RuleExecution.objects.create(
                        rule=rule,
                        user=context.user,
                        trigger_context=context.data,
                        conditions_met=True,
                        actions_executed=actions
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
        
        rules = Rule.objects.filter(
            trigger_type=context.trigger_type,
            is_active=True,
            conditions__condition_type__in=['user_type', 'user_order_history']
        ).distinct().order_by('priority')
        
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