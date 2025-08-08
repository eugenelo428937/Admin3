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
        
    def evaluate_rules(self, entry_point_code: str = None, trigger_type: str = None, user=None, **context_data) -> Dict[str, Any]:
        """
        Main entry point for rule evaluation
        
        Args:
            entry_point_code: The entry point code (new system)
            trigger_type: The type of trigger (legacy system, for backward compatibility)
            user: The user triggering the rules (if any)
            **context_data: Additional context data
            
        Returns:
            Dict containing messages, acknowledgments, and other results
        """
        try:
            # Support both new entry_point_code and legacy trigger_type
            if entry_point_code:
                context = RuleContext(entry_point_code, user, trigger_type, **context_data)
            elif trigger_type:
                context = RuleContext(trigger_type, user, trigger_type, **context_data)
            else:
                raise ValueError("Either entry_point_code or trigger_type must be provided")
            
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
            
    # Maintain backward compatibility
    def evaluate_rules_by_trigger(self, trigger_type: str, user=None, **context_data) -> Dict[str, Any]:
        """Legacy method for backward compatibility"""
        return self.evaluate_rules(trigger_type=trigger_type, user=user, **context_data)
            
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
            
        result = {
            'success': True,
            'messages': messages,
            'acknowledgments': acknowledgments,
            'calculations': calculations,
            'can_proceed': can_proceed,
            'blocking_rules': [rule.id for rule in blocking_rules],
            'context': {
                'trigger_type': str(context.trigger_type) if context.trigger_type else '',
                'timestamp': context.timestamp.isoformat()
            }
        }
        
        return result
        
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
                    'ip_address': ip_address or '127.0.0.1',
                    'user_agent': user_agent or 'Django Shell/Testing',
                    'acknowledgment_type': 'required',
                    'is_selected': True
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
    
    # Get cart object and cart_id from cart_items or kwargs
    cart_id = kwargs.get('cart_id')
    cart = None
    
    if not cart_id and cart_items:
        # Try to get cart_id from first cart item
        first_item = cart_items[0] if cart_items else None
        if hasattr(first_item, 'cart_id'):
            cart_id = first_item.cart_id
        elif hasattr(first_item, 'cart'):
            cart = first_item.cart
            cart_id = cart.id
    
    # If we don't have the cart object but have cart_id, fetch it
    if not cart and cart_id:
        try:
            from cart.models import Cart
            cart = Cart.objects.get(id=cart_id)
        except Cart.DoesNotExist:
            pass
    
    context = {
        'cart_items': cart_items or [],
        'cart_item_count': len(cart_items) if cart_items else 0,
        'cart_id': cart_id,
        'cart': cart,  # Add cart object for cart-level flags
        'business_days_to_next_holiday': business_days_to_next_holiday,
        'user_country': user_country,  # Make user_country directly accessible
        'payment_method': kwargs.get('payment_method', 'credit_card'),
        **kwargs
    }
    
    # Add user context for new condition types
    if user:
        # Get addresses safely (they might be related objects)
        home_address = ''
        work_address = ''
        
        # Check if user has a profile with addresses
        if hasattr(user, 'profile') and user.profile:
            home_addr_obj = user.profile.addresses.filter(address_type='HOME').first()
            if home_addr_obj:
                home_address = str(home_addr_obj.address_data) if hasattr(home_addr_obj, 'address_data') else str(home_addr_obj)
                
            work_addr_obj = user.profile.addresses.filter(address_type='WORK').first()
            if work_addr_obj:
                work_address = str(work_addr_obj.address_data) if hasattr(work_addr_obj, 'address_data') else str(work_addr_obj)
        
        context['user_data'] = {
            'country': str(getattr(user, 'country', '')),
            'home_address': home_address,
            'home_email': str(getattr(user, 'home_email', '')),
            'work_address': work_address,
            'work_email': str(getattr(user, 'work_email', '')),
            'is_reduced_rate': bool(getattr(user, 'is_reduced_rate', False)),
            'is_apprentice': bool(getattr(user, 'is_apprentice', False)),
            'is_caa': bool(getattr(user, 'is_caa', False)),
            'is_study_plus': bool(getattr(user, 'is_study_plus', False)),
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
        
        # Format cart items for custom functions with detailed deadline info
        context['cart_items'] = []
        for item in cart_items:
            item_data = {
                'id': item.id,
                'product_id': item.product.product.id,  # This is the ID from acted_products table
                'subject_code': item.product.exam_session_subject.subject.code,
                'product_name': item.product.product.fullname,
                'product_code': item.product.product.code,
                'product_type': getattr(item.product, 'type', None),
                'quantity': item.quantity,
                'price_type': item.price_type,
                'actual_price': str(item.actual_price) if item.actual_price else None,
                'is_marking': getattr(item, 'is_marking', False),
                'has_expired_deadline': getattr(item, 'has_expired_deadline', False),
                'is_marking_and_expired': getattr(item, 'is_marking', False) and getattr(item, 'has_expired_deadline', False),
                'metadata': item.metadata
            }
            
            # Add detailed deadline info for marking products with expired deadlines
            if item_data['is_marking_and_expired']:
                try:
                    from marking.models import MarkingPaper
                    marking_papers = MarkingPaper.objects.filter(exam_session_subject_product=item.product)
                    total_papers = marking_papers.count()
                    expired_count = marking_papers.filter(deadline__lt=timezone.now()).count()
                    
                    item_data['expired_count'] = expired_count
                    item_data['total_papers'] = total_papers
                except Exception as e:
                    # Fallback to defaults if we can't get the counts
                    item_data['expired_count'] = 1
                    item_data['total_papers'] = 1
            
            context['cart_items'].append(item_data)
    
    return rules_engine.evaluate_rules(entry_point_code='checkout_start', user=user, **context)


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
    
    return rules_engine.evaluate_rules(entry_point_code='add_to_cart', user=user, **context)


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
    
    return rules_engine.evaluate_rules(entry_point_code='product_list_mount', user=user, **context) 