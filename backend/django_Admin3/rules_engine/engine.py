from typing import List, Dict, Any
from .handlers import (
    RuleContext, RuleResult, ProductRuleHandler, CheckoutRuleHandler, 
    HolidayRuleHandler, UserRuleHandler
)
from .models import UserAcknowledgment
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class RulesEngine:
    """Main rules engine that coordinates all rule handlers"""
    
    def __init__(self):
        self._setup_chain()
        
    def _setup_chain(self):
        """Setup the chain of responsibility"""
        # Create handlers
        self.product_handler = ProductRuleHandler()
        self.checkout_handler = CheckoutRuleHandler()
        self.holiday_handler = HolidayRuleHandler()
        self.user_handler = UserRuleHandler()
        
        # Chain them together
        self.product_handler.set_next(self.checkout_handler) \
                           .set_next(self.holiday_handler) \
                           .set_next(self.user_handler)
        
        # Set the first handler as entry point
        self.chain_start = self.product_handler
        
    def evaluate_rules(self, trigger_type: str, user=None, **context_data) -> Dict[str, Any]:
        """
        Main entry point for rule evaluation
        
        Args:
            trigger_type: The type of trigger (cart_add, checkout_start, etc.)
            user: The user triggering the rules (if any)
            **context_data: Additional context data
            
        Returns:
            Dict containing messages, acknowledgments, and other results
        """
        try:
            # Create context
            context = RuleContext(trigger_type, user, **context_data)
            
            # Execute the chain
            results = self.chain_start.handle(context)
            
            # Process results
            return self._process_results(results, context)
            
        except Exception as e:
            logger.error(f"Error in rules engine: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'messages': [],
                'acknowledgments': [],
                'can_proceed': True
            }
            
    def _process_results(self, results: List[RuleResult], context: RuleContext) -> Dict[str, Any]:
        """Process rule results into a response format"""
        messages = []
        acknowledgments = []
        blocking_rules = []
        calculations = []
        can_proceed = True
        
        for result in results:
            if result.triggered and result.actions:
                for action in result.actions:
                    action_result = action.get('result', {})
                    
                    if action_result.get('type') == 'message':
                        messages.append(action_result)
                        
                        # Check if this is a blocking rule
                        if action_result.get('requires_acknowledgment'):
                            blocking_rules.append(result.rule)
                            
                    elif action_result.get('type') == 'acknowledgment':
                        acknowledgments.append(action_result)
                        blocking_rules.append(result.rule)
                        
                    elif action_result.get('type') == 'calculation':
                        # Handle calculation results (VAT, discounts, fees)
                        calculations.append({
                            'rule_id': result.rule.id,
                            'rule_name': result.rule.name,
                            'calculation_type': action_result.get('calculation_type'),
                            'result': action_result.get('calculation_result', {}),
                            'applied_at': timezone.now().isoformat()
                        })
        
        # Check if user can proceed
        if blocking_rules:
            can_proceed = self._check_acknowledgments(blocking_rules, context.user)
            
        return {
            'success': True,
            'messages': messages,
            'acknowledgments': acknowledgments,
            'calculations': calculations,
            'can_proceed': can_proceed,
            'blocking_rules': [rule.id for rule in blocking_rules],
            'context': {
                'trigger_type': context.trigger_type,
                'timestamp': context.timestamp.isoformat()
            }
        }
        
    def _check_acknowledgments(self, blocking_rules: List, user) -> bool:
        """Check if user has acknowledged all blocking rules"""
        if not user:
            return False
            
        for rule in blocking_rules:
            if not UserAcknowledgment.objects.filter(user=user, rule=rule).exists():
                return False
                
        return True
        
    def acknowledge_rule(self, user, rule_id: int, template_id: int = None, 
                        ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """Record user acknowledgment of a rule"""
        try:
            from .models import Rule, MessageTemplate
            
            rule = Rule.objects.get(id=rule_id)
            template = None
            
            if template_id:
                template = MessageTemplate.objects.get(id=template_id)
                
            # Create or update acknowledgment
            acknowledgment, created = UserAcknowledgment.objects.get_or_create(
                user=user,
                rule=rule,
                message_template=template,
                defaults={
                    'ip_address': ip_address,
                    'user_agent': user_agent
                }
            )
            
            return {
                'success': True,
                'acknowledged': True,
                'acknowledgment_id': acknowledgment.id,
                'timestamp': acknowledgment.acknowledged_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error acknowledging rule {rule_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def get_pending_acknowledgments(self, user, trigger_type: str = None) -> List[Dict]:
        """Get rules that require acknowledgment from the user"""
        try:
            from .models import Rule
            
            # Get rules that require acknowledgment
            query = Rule.objects.filter(
                is_active=True,
                is_blocking=True
            )
            
            if trigger_type:
                query = query.filter(trigger_type=trigger_type)
                
            blocking_rules = query.all()
            
            # Filter out already acknowledged rules
            pending = []
            for rule in blocking_rules:
                if not UserAcknowledgment.objects.filter(user=user, rule=rule).exists():
                    pending.append({
                        'rule_id': rule.id,
                        'rule_name': rule.name,
                        'trigger_type': rule.trigger_type,
                        'description': rule.description
                    })
                    
            return pending
            
        except Exception as e:
            logger.error(f"Error getting pending acknowledgments: {str(e)}")
            return []


# Singleton instance
rules_engine = RulesEngine()


def evaluate_checkout_rules(user, cart_items=None, **kwargs):
    """Convenience function for checkout rule evaluation"""
    
    # Extract user_country from kwargs for context
    user_country = kwargs.get('user_country', 'GB')
    
    # Add holiday context data
    from datetime import timedelta
    from django.utils import timezone
    from .models import HolidayCalendar
    
    now = timezone.now().date()
    upcoming_holidays = HolidayCalendar.objects.filter(
        date__gte=now,
        date__lte=now + timedelta(days=30)
    ).order_by('date')
    
    # Calculate business days until next holiday
    business_days_to_next_holiday = 0
    if upcoming_holidays.exists():
        next_holiday = upcoming_holidays.first()
        current_date = now
        while current_date < next_holiday.date:
            if current_date.weekday() < 5:  # Monday = 0, Sunday = 6
                business_days_to_next_holiday += 1
            current_date += timedelta(days=1)
    
    # Get cart_id from cart_items or kwargs
    cart_id = kwargs.get('cart_id')
    if not cart_id and cart_items:
        # Try to get cart_id from first cart item
        first_item = cart_items[0] if cart_items else None
        if hasattr(first_item, 'cart_id'):
            cart_id = first_item.cart_id
        elif hasattr(first_item, 'cart'):
            cart_id = first_item.cart.id
    
    context = {
        'cart_items': cart_items or [],
        'cart_item_count': len(cart_items) if cart_items else 0,
        'cart_id': cart_id,
        'business_days_to_next_holiday': business_days_to_next_holiday,
        'user_country': user_country,  # Make user_country directly accessible
        'payment_method': kwargs.get('payment_method', 'credit_card'),
        **kwargs
    }
    
    # Calculate cart value if items provided
    if cart_items:
        total_value = sum(
            float(item.actual_price or 0) * item.quantity 
            for item in cart_items 
            if item.actual_price
        )
        context['cart_value'] = total_value
        
        # Add product information
        context['products'] = [
            {
                'id': item.product.id,
                'product_id': item.product.product.id,
                'type': getattr(item.product, 'type', None),
                'subject_code': getattr(item.product, 'subject_code', None),
                'metadata': item.metadata
            }
            for item in cart_items
        ]
        
        # Format cart items for custom functions
        context['cart_items'] = [
            {
                'id': item.id,
                'product_id': item.product.product.id,  # This is the ID from acted_products table
                'subject_code': item.product.exam_session_subject.subject.code,
                'product_name': item.product.product.fullname,
                'product_code': item.product.product.code,
                'product_type': getattr(item.product, 'type', None),
                'quantity': item.quantity,
                'price_type': item.price_type,
                'actual_price': str(item.actual_price) if item.actual_price else None,
                'metadata': item.metadata
            }
            for item in cart_items
        ]
    
    return rules_engine.evaluate_rules('checkout_start', user, **context)


def evaluate_cart_add_rules(user, product, **kwargs):
    """Convenience function for cart add rule evaluation"""
    context = {
        'product': {
            'id': product.id,
            'type': getattr(product, 'type', None),
            'subject_code': getattr(product, 'subject_code', None),
            'product_name': getattr(product, 'product_name', None)
        },
        **kwargs
    }
    
    return rules_engine.evaluate_rules('cart_add', user, **context)


def evaluate_product_view_rules(user, product, **kwargs):
    """Convenience function for product view rule evaluation"""
    context = {
        'product': {
            'id': product.id,
            'type': getattr(product, 'type', None),
            'subject_code': getattr(product, 'subject_code', None),
            'product_name': getattr(product, 'product_name', None)
        },
        **kwargs
    }
    
    return rules_engine.evaluate_rules('product_view', user, **context) 