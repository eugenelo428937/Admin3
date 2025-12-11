"""
New Rules Engine Implementation According to Specification
"""
import time
import uuid
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from django.core.cache import cache
from django.utils import timezone
import jsonschema

from ..models import ActedRule, ActedRulesFields, ActedRuleExecution
from .template_processor import TemplateProcessor

logger = logging.getLogger(__name__)


class ValidationResult:
    """Result of context validation"""
    def __init__(self, is_valid: bool, errors: List[str] = None):
        self.is_valid = is_valid
        self.errors = errors or []


class RuleRepository:
    """Repository for rule CRUD operations with caching"""
    
    def __init__(self):
        self.cache_timeout = 300  # 5 minutes
    
    def get_active_rules(self, entry_point: str) -> List[ActedRule]:
        """Get active rules for entry point with caching"""
        # Use safe cache key by replacing spaces with underscores
        safe_entry_point = entry_point.replace(' ', '_').lower()
        cache_key = f"rules:{safe_entry_point}"
        rules = cache.get(cache_key)
        
        if rules is None:
            logger.debug(f"Cache miss for rules:{entry_point}")
            rules = list(ActedRule.objects.filter(
                entry_point=entry_point,
                active=True
            ).order_by('-priority', '-created_at'))
            
            cache.set(cache_key, rules, timeout=self.cache_timeout)
            logger.debug(f"Cached {len(rules)} rules for {entry_point}")
        else:
            logger.debug(f"Cache hit for rules:{entry_point}: {len(rules)} rules")
        
        return rules
    
    def invalidate_cache(self, entry_point: str):
        """Invalidate cache for entry point"""
        # Use safe cache key by replacing spaces with underscores
        safe_entry_point = entry_point.replace(' ', '_').lower()
        cache_key = f"rules:{safe_entry_point}"
        cache.delete(cache_key)
        logger.debug(f"Invalidated cache for {entry_point}")


class Validator:
    """Context validation using JSON Schema"""
    
    def __init__(self):
        self._schema_cache = {}
    
    def validate_context(self, context: Dict[str, Any], rules_fields_code: Optional[str] = None) -> ValidationResult:
        """Validate context against schema and return detailed result"""
        if not isinstance(context, dict):
            error_msg = f"Context is not a dict: {type(context)}"
            logger.warning(error_msg)
            return ValidationResult(False, [error_msg])
        
        # If no schema ID provided, do basic validation
        if not rules_fields_code:
            logger.debug(f"No schema validation - context keys: {list(context.keys())}")
            return ValidationResult(True)
        
        try:
            # Try to get schema from cache first
            if rules_fields_code in self._schema_cache:
                schema = self._schema_cache[rules_fields_code]
            else:
                # Get the schema from database and cache it
                rules_fields = ActedRulesFields.objects.get(
                    fields_code=rules_fields_code,
                    is_active=True
                )
                schema = rules_fields.schema
                self._schema_cache[rules_fields_code] = schema
            
            # Validate context against schema
            jsonschema.validate(context, schema)
            logger.debug(f" Schema validation passed for {rules_fields_code}")
            return ValidationResult(True)
            
        except ActedRulesFields.DoesNotExist:
            error_msg = f"RulesFields schema not found: {rules_fields_code}"
            logger.error(error_msg)
            return ValidationResult(False, [error_msg])
        except jsonschema.ValidationError as e:
            error_path = ' -> '.join(str(p) for p in e.absolute_path) if e.absolute_path else 'root'
            error_msg = f"Schema validation failed at '{error_path}': {e.message}"
            logger.warning(f" Schema validation failed for {rules_fields_code}: {e.message}")
            logger.debug(f"Validation error path: {error_path}")
            return ValidationResult(False, [error_msg])
        except Exception as e:
            error_msg = f"Unexpected error during schema validation: {e}"
            logger.error(error_msg)
            return ValidationResult(False, [error_msg])


class ConditionEvaluator:
    """JSONLogic condition evaluation"""
    
    def evaluate(self, condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Evaluate JSONLogic condition against context"""
        try:
            # Handle the special "always" condition for testing
            if condition == {"always": True}:
                logger.debug("Always-true condition evaluated to True")
                return True

            # Handle "always_true" type condition
            if condition.get("type") == "always_true":
                logger.debug("Always-true type condition evaluated to True")
                return True

            # Handle "type" based conditions
            if "type" in condition:
                condition_type = condition["type"]
                if condition_type == "always_true":
                    logger.debug("Always-true condition evaluated to True")
                    return True
                elif condition_type == "always_false":
                    logger.debug("Always-false condition evaluated to False")
                    return False
                elif condition_type == "jsonlogic":
                    # Extract the actual JSONLogic expression from the "expr" field
                    actual_condition = condition.get("expr", condition)
                    result = self._evaluate_jsonlogic(actual_condition, context)
                    logger.debug(f" JSONLogic (type-wrapped) condition evaluated to: {result}")
                    return bool(result)

            # Use custom JSONLogic implementation
            result = self._evaluate_jsonlogic(condition, context)

            # Ensure we return a boolean
            if isinstance(result, bool):
                logger.debug(f" JSONLogic condition evaluated to: {result}")
                return result
            else:
                # Convert truthy/falsy values to boolean
                boolean_result = bool(result)
                logger.debug(f" JSONLogic condition result {result} converted to boolean: {boolean_result}")
                return boolean_result

        except Exception as e:
            logger.error(f" Error evaluating JSONLogic condition {condition}: {e}")
            logger.debug(f"Context was: {context}")
            return False
    
    def _evaluate_jsonlogic(self, logic: Any, data: Dict[str, Any]) -> Any:
        """Basic JSONLogic implementation"""
        if not isinstance(logic, dict):
            return logic
        
        for operator, operands in logic.items():
            if operator == "var":
                # Variable access: {"var": "path.to.value"}
                if operands is None:
                    return data
                return self._get_nested_value(data, str(operands))
            
            elif operator == "==":
                # Equality: {"==": [left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return left == right
            
            elif operator == "!=":
                # Inequality: {"!=": [left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return left != right
            
            elif operator == "in":
                # Contains: {"in": [needle, haystack]}
                needle = self._evaluate_jsonlogic(operands[0], data)
                haystack = self._evaluate_jsonlogic(operands[1], data)
                return needle in haystack if haystack else False
            
            elif operator == "some":
                # Array some: {"some": [array, condition]}
                array = self._evaluate_jsonlogic(operands[0], data)
                condition = operands[1]
                if not isinstance(array, list):
                    return False
                for item in array:
                    # Create new data context with current item
                    item_data = {**data}
                    if isinstance(item, dict):
                        item_data.update(item)
                    if self._evaluate_jsonlogic(condition, item_data):
                        return True
                return False
            
            elif operator == "and":
                # Logical AND: {"and": [condition1, condition2, ...]}
                for condition in operands:
                    if not self._evaluate_jsonlogic(condition, data):
                        return False
                return True
            
            elif operator == "or":
                # Logical OR: {"or": [condition1, condition2, ...]}
                for condition in operands:
                    if self._evaluate_jsonlogic(condition, data):
                        return True
                return False
            
            elif operator == "!":
                # Logical NOT: {"!": condition}
                return not self._evaluate_jsonlogic(operands[0], data)
            
            elif operator == ">=":
                # Greater than or equal: {">=": [left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return self._compare_values(left, right, ">=")
            
            elif operator == ">":
                # Greater than: {">":[left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return self._compare_values(left, right, ">")
            
            elif operator == "<":
                # Less than: {"<": [left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return self._compare_values(left, right, "<")
            
            elif operator == "<=":
                # Less than or equal: {"<=": [left, right]}
                left = self._evaluate_jsonlogic(operands[0], data)
                right = self._evaluate_jsonlogic(operands[1], data)
                return self._compare_values(left, right, "<=")
            
            else:
                logger.warning(f"Unknown JSONLogic operator: {operator}")
                return False
        
        return False
    
    def _resolve_var(self, var_expr: Dict[str, Any], context: Dict[str, Any]) -> Any:
        """Resolve variable expression like {"var": "user.region"} - kept for backwards compatibility"""
        if isinstance(var_expr, dict) and "var" in var_expr:
            var_path = var_expr["var"]
            return self._get_nested_value(context, var_path)
        return var_expr
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value from dictionary using dot notation - kept for backwards compatibility"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif isinstance(value, list) and key.isdigit():
                    # Support array indexing
                    index = int(key)
                    if 0 <= index < len(value):
                        value = value[index]
                    else:
                        return None
                else:
                    return None
            return value
        except Exception:
            return None

    def _compare_values(self, left: Any, right: Any, operator: str) -> bool:
        """
        Compare two values using the specified operator.

        Supports:
        - Numeric comparison (int, float, numeric strings)
        - String comparison (including ISO date strings like "2025-12-11")

        Args:
            left: Left operand
            right: Right operand
            operator: One of ">=", ">", "<", "<="

        Returns:
            Boolean result of the comparison, or False for incompatible types
        """
        # Handle None or missing values
        if left is None or right is None:
            return False

        # Try numeric comparison first
        try:
            left_num = float(left)
            right_num = float(right)
            if operator == ">=":
                return left_num >= right_num
            elif operator == ">":
                return left_num > right_num
            elif operator == "<":
                return left_num < right_num
            elif operator == "<=":
                return left_num <= right_num
        except (ValueError, TypeError):
            pass

        # If both are strings, use string comparison (lexicographic)
        # This works well for ISO date strings: "2025-12-11" > "2025-12-01"
        if isinstance(left, str) and isinstance(right, str):
            if operator == ">=":
                return left >= right
            elif operator == ">":
                return left > right
            elif operator == "<":
                return left < right
            elif operator == "<=":
                return left <= right

        # Incompatible types
        return False
    


class ActionDispatcher:
    """Action execution dispatcher"""
    
    def dispatch(self, actions: List[Dict[str, Any]], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute actions and return results"""
        results = []
        
        for action in actions:
            try:
                result = self._execute_action(action, context)
                results.append(result)
            except Exception as e:
                logger.error(f"Error executing action {action}: {e}")
                results.append({
                    "type": action.get("type", "unknown"),
                    "success": False,
                    "error": str(e)
                })
        
        return results
    
    def _execute_action(self, action: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single action"""
        action_type = action.get("type")
        
        if action_type == "display_message":
            # Get template content from database if templateId is provided
            template_id = action.get("templateId")
            title = action.get("title", "Message")
            content = action.get("content", "Default message")
            dismissible = True  # Default value
            
            if template_id:
                try:
                    from ..models import MessageTemplate
                    template = MessageTemplate.objects.get(id=template_id, is_active=True)
                    title = template.title or template.name
                    content = template.content
                    
                    # Use JSON content if available
                    if template.json_content and isinstance(template.json_content, dict):
                        json_content = template.json_content
                        if 'content' in json_content and isinstance(json_content['content'], dict):
                            title = json_content['content'].get('title', title)
                            content = json_content['content'].get('message', content)

                    # Get dismissible setting from template
                    dismissible = template.dismissible

                    # Process template variables using generic template processor
                    context_mapping = action.get('context_mapping', {})
                    processor = TemplateProcessor()
                    content, title = processor.process_variables(content, title, context_mapping, context)
                        
                except Exception as e:
                    logger.warning(f"Could not fetch template {template_id}: {e}")
            
            return {
                "type": "display_message",
                "success": True,
                "message": {
                    "type": "display",
                    "title": title,  # Keep for backward compatibility
                    "content": {
                        "title": title,
                        "message": content,
                        "icon": "info",
                        "dismissible": dismissible
                    },
                    "message_type": action.get("messageType", "info"),
                    "template_id": template_id,
                    "display_type": action.get("display_type", "alert")  # Add display_type support
                }
            }
        
        elif action_type == "user_acknowledge":
            # Load template content if templateId is provided
            template_content = action.get("content", "Please acknowledge")
            template_title = action.get("title", "Acknowledgment Required")

            template_id = action.get("templateId")
            if template_id:
                try:
                    from rules_engine.models import MessageTemplate
                    template = MessageTemplate.objects.get(id=template_id)

                    if template.content_format == 'json' and template.json_content:
                        # Use JSON content for rich display
                        template_content = template.json_content
                        # Extract title from JSON content if available
                        if isinstance(template_content, dict) and 'content' in template_content:
                            inner_content = template_content['content']
                            if isinstance(inner_content, dict) and 'title' in inner_content:
                                template_title = inner_content['title']
                    else:
                        # Use plain text content
                        template_content = template.content
                        template_title = template.title or template_title

                except MessageTemplate.DoesNotExist:
                    logger.warning(f"Template {template_id} not found, using fallback content")

            return {
                "type": "user_acknowledge",
                "success": True,
                "message": {
                    "type": "acknowledge",
                    "title": template_title,
                    "content": template_content,
                    "message_type": "terms",
                    "template_id": template_id,
                    "ack_key": action.get("ackKey"),
                    "required": action.get("required", True),
                    "display_type": action.get("display_type", "modal")
                }
            }
        
        elif action_type == "user_preference":
            # Handle user preferences similar to acknowledgments
            from .action_handlers import UserPreferenceHandler

            handler = UserPreferenceHandler()

            # Load template content if provided
            template_content = action.get("content", "")
            template_title = action.get("title", "Preference")

            template_id = action.get("messageTemplateId")
            if template_id:
                try:
                    from rules_engine.models import MessageTemplate
                    template = MessageTemplate.objects.get(id=template_id)

                    if template.content_format == 'json' and template.json_content:
                        template_content = template.json_content
                        if isinstance(template_content, dict) and 'content' in template_content:
                            inner_content = template_content['content']
                            if isinstance(inner_content, dict) and 'title' in inner_content:
                                template_title = inner_content['title']
                    else:
                        template_content = template.content
                        template_title = template.title or template_title

                except MessageTemplate.DoesNotExist:
                    logger.warning(f"Template {template_id} not found, using fallback content")

            # Format the preference for response
            formatted_preference = handler.format_preference_for_response(action, template_content)
            formatted_preference['title'] = template_title

            return {
                "type": "user_preference",
                "success": True,
                "preference": formatted_preference
            }

        elif action_type == "update":
            # Handle update actions (e.g., add fees to cart, set VAT rate)
            target = action.get("target")
            operation = action.get("operation")
            value = action.get("value")

            # IMPORTANT: Update context IMMEDIATELY so subsequent actions see the change
            if target and operation == 'set':
                # Set nested value in context
                keys = target.split('.')
                current = context

                # Navigate to parent, creating nested dicts as needed
                for key in keys[:-1]:
                    if key not in current:
                        current[key] = {}
                    current = current[key]

                # Set the final value
                current[keys[-1]] = value
                logger.debug(f"Updated context during dispatch: {target} = {value}")

                return {
                    "type": "update",
                    "success": True,
                    "target": target,
                    "value": value,
                    "message": {
                        "type": "update",
                        "target": target,
                        "operation": operation,
                        "value": value,
                        "description": action.get("description", "Value updated")
                    }
                }

            # For other operations (increment, add fees, etc), use UpdateHandler
            from .action_handlers import UpdateHandler
            handler = UpdateHandler()
            result = handler.execute(action, context)

            # Format result for client response
            if result.get('success'):
                return {
                    "type": "update",
                    "success": True,
                    "updates": {
                        "cart_fees": [result.get('fee')] if result.get('fee') else []
                    },
                    "message": {
                        "type": "update",
                        "target": action.get("target"),
                        "operation": action.get("operation"),
                        "value": action.get("value"),
                        "description": action.get("description", "Value updated"),
                        "result": result
                    }
                }
            else:
                return {
                    "type": "update",
                    "success": False,
                    "error": result.get('error', 'Update action failed')
                }

        elif action_type == "call_function":
            # Handle custom function calls
            function_name = action.get("function")
            args = action.get("args", [])
            store_result_in = action.get("store_result_in")

            try:
                # Import FUNCTION_REGISTRY
                from ..custom_functions import FUNCTION_REGISTRY

                # Get the function from the registry
                if function_name not in FUNCTION_REGISTRY:
                    logger.error(f"Function '{function_name}' not found in FUNCTION_REGISTRY")
                    return {
                        "type": "call_function",
                        "success": False,
                        "error": f"Function '{function_name}' not found"
                    }

                func = FUNCTION_REGISTRY[function_name]

                # Resolve args using JSONLogic
                evaluator = ConditionEvaluator()
                resolved_args = []
                for arg in args:
                    if isinstance(arg, dict) and "var" in arg:
                        # This is a variable reference - resolve it
                        resolved_arg = evaluator._evaluate_jsonlogic(arg, context)
                    else:
                        resolved_arg = arg
                    resolved_args.append(resolved_arg)

                # Call the function
                result = func(*resolved_args)

                # Store result in context if store_result_in is specified
                if store_result_in:
                    keys = store_result_in.split('.')
                    current = context

                    # Navigate to parent, creating nested dicts as needed
                    for key in keys[:-1]:
                        if key not in current:
                            current[key] = {}
                        current = current[key]

                    # Set the final value
                    current[keys[-1]] = result
                    logger.debug(f"Stored function result in context: {store_result_in} = {result}")

                return {
                    "type": "call_function",
                    "success": True,
                    "function": function_name,
                    "result": result,
                    "stored_in": store_result_in
                }

            except Exception as e:
                logger.error(f"Error calling function '{function_name}': {e}")
                return {
                    "type": "call_function",
                    "success": False,
                    "error": str(e)
                }

        else:
            logger.warning(f"Unknown action type: {action_type}")
            return {
                "type": action_type,
                "success": False,
                "error": f"Unknown action type: {action_type}"
            }


class ExecutionStore:
    """Store execution audit trail"""

    def store_execution(self, rule_id: str, entry_point: str, context: Dict[str, Any],
                       actions_result: List[Dict[str, Any]], outcome: str,
                       execution_time_ms: float, error_message: str = "") -> str:
        """Store rule execution record"""
        execution_seq_no = f"exec_{int(time.time())}_{uuid.uuid4().hex[:8]}"

        try:
            # Convert Decimal objects to strings for JSON serialization
            from decimal import Decimal

            def convert_decimals(obj):
                """Recursively convert Decimal objects to strings"""
                if isinstance(obj, Decimal):
                    return str(obj)
                elif isinstance(obj, dict):
                    return {k: convert_decimals(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_decimals(item) for item in obj]
                else:
                    return obj

            # Convert context and actions_result
            serializable_context = convert_decimals(context)
            serializable_actions = convert_decimals(actions_result)

            ActedRuleExecution.objects.create(
                execution_seq_no=execution_seq_no,
                rule_code=rule_id,
                entry_point=entry_point,
                context_snapshot=serializable_context,
                actions_result=serializable_actions,
                outcome=outcome,
                execution_time_ms=execution_time_ms,
                error_message=error_message
            )
            logger.debug(f"Stored execution record: {execution_seq_no}")
            return execution_seq_no
        except Exception as e:
            logger.error(f"Failed to store execution record: {e}")
            return execution_seq_no


class RuleEngine:
    
    def _get_template_content(self, template_name):
        """Get template content for acknowledgment"""
        if not template_name:
            return {}
        try:
            from ..models.message_template import MessageTemplate
            template = MessageTemplate.objects.get(name=template_name, is_active=True)
            return template.json_content or {}
        except MessageTemplate.DoesNotExist:
            return {}
    """Main Rules Engine orchestrator"""
    
    def __init__(self):
        self.rule_repository = RuleRepository()
        self.validator = Validator()
        self.condition_evaluator = ConditionEvaluator()
        self.action_dispatcher = ActionDispatcher()
        self.execution_store = ExecutionStore()
    
    def execute(self, entry_point: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Main execution method"""
        start_time = time.time()

        try:
            # Add defensive context validation to prevent AttributeError
            context_issues = self._validate_context_structure(context)
            if context_issues:
                logger.warning(f"Context structure issues detected: {context_issues}")

            # Fetch active rules
            rules = self.rule_repository.get_active_rules(entry_point)
            
            if not rules:
                return {
                    "success": True,
                    "blocked": False,
                    "messages": [],
                    "rules_evaluated": 0,
                    "execution_time_ms": (time.time() - start_time) * 1000
                }
            
            # Execute rules
            all_messages = []
            blocked = False
            rules_evaluated = 0
            blocking_rules = []
            required_acknowledgments = []
            satisfied_acknowledgments = []
            rules_executed_list = []
            preference_prompts = []
            context_updates = {}
            schema_validation_errors = []
            update_results = {}
            
            for rule in rules:
                try:
                    rule_start = time.time()
                    
                    # Validate context
                    validation_result = self.validator.validate_context(context, rule.rules_fields_code)
                    if not validation_result.is_valid:
                        logger.warning(f"Context validation failed for rule {rule.rule_code}")
                        # Collect schema validation errors
                        for error in validation_result.errors:
                            schema_validation_errors.append({
                                'rule_id': rule.rule_code,
                                'rule_name': rule.name,
                                'entry_point': entry_point,
                                'error': error
                            })
                        continue
                    
                    # Evaluate condition
                    condition_result = self.condition_evaluator.evaluate(rule.condition, context)

                    # Count this rule as evaluated regardless of condition result
                    rules_evaluated += 1

                    if condition_result:
                        
                        # Execute actions
                        actions_result = self.action_dispatcher.dispatch(rule.actions, context)
                        
                        # Check for blocking acknowledgments and preferences
                        for action, action_result in zip(rule.actions, actions_result):
                            if action.get('type') == 'user_acknowledge':
                                ack_key = action.get('ackKey')
                                required = action.get('required', True)
                                
                                # Check if acknowledgment exists in context
                                acknowledgments = context.get('acknowledgments', {})
                                if ack_key in acknowledgments and acknowledgments[ack_key].get('acknowledged'):
                                    satisfied_acknowledgments.append(ack_key)
                                elif required:
                                    blocked = True
                                    blocking_rules.append(rule.rule_code)
                                    required_acknowledgments.append({
                                        'ackKey': ack_key,
                                        'templateName': action.get('templateName'),
                                        'ruleId': rule.rule_code,
                                        'required': required
                                    })
                                else:  # not required - preference prompt
                                    preference_prompts.append({
                                        'ackKey': ack_key,
                                        'templateName': action.get('templateName'),
                                        'ruleId': rule.rule_code,
                                        'required': False
                                    })
                            elif action.get('type') == 'user_preference':
                                # Handle user preferences - collect for response
                                if action_result.get('success') and 'preference' in action_result:
                                    preference = action_result['preference']
                                    preference['ruleId'] = rule.rule_code
                                    preference_prompts.append(preference)
                            elif action.get('type') == 'update':
                                # Apply context updates for subsequent rules
                                target = action.get('target')
                                operation = action.get('operation')
                                value = action.get('value')
                                
                                if target and operation == 'set':
                                    self._set_nested_value(context, target, value)
                                    context_updates[target] = value
                                    logger.debug(f"Updated context: {target} = {value}")
                                elif target and operation == 'increment':
                                    current_value = self._get_nested_value(context, target) or 0
                                    new_value = current_value + value
                                    self._set_nested_value(context, target, new_value)
                                    context_updates[target] = new_value
                                    logger.debug(f"Incremented context: {target} from {current_value} to {new_value}")
                        
                        # Collect messages and updates
                        for action_result in actions_result:
                            if action_result.get("success") and "message" in action_result:
                                all_messages.append(action_result["message"])

                            # Collect update results (cart fees, etc.)
                            if action_result.get("success") and action_result.get("type") == "update":
                                if "updates" in action_result:
                                    for update_key, update_value in action_result["updates"].items():
                                        if update_key not in update_results:
                                            update_results[update_key] = []
                                        update_results[update_key].extend(update_value if isinstance(update_value, list) else [update_value])
                        
                        # Calculate execution time
                        execution_time_ms = (time.time() - rule_start) * 1000
                        
                        # Track executed rule
                        rules_executed_list.append({
                            'rule_id': rule.rule_code,
                            'priority': rule.priority,
                            'condition_result': True,
                            'actions_executed': len(actions_result),
                            'stop_processing': rule.stop_processing,
                            'execution_time_ms': execution_time_ms
                        })
                        
                        # Store execution record
                        self.execution_store.store_execution(
                            rule.rule_code, entry_point, context, actions_result,
                            "success", execution_time_ms
                        )

                        # Check if we should stop processing
                        if rule.stop_processing:
                            break
                    else:
                        logger.debug(f"  Rule '{rule.rule_code}' condition not matched")
                        
                        # Track non-matching rule
                        execution_time_ms = (time.time() - rule_start) * 1000
                        rules_executed_list.append({
                            'rule_id': rule.rule_code,
                            'priority': rule.priority,
                            'condition_result': False,
                            'actions_executed': 0,
                            'stop_processing': rule.stop_processing,
                            'execution_time_ms': execution_time_ms
                        })
                
                except Exception as e:
                    logger.error(f" Error processing rule '{rule.rule_code}': {e}")
                    # Store error execution record
                    execution_time_ms = (time.time() - rule_start) * 1000
                    self.execution_store.store_execution(
                        rule.rule_code, entry_point, context, [],
                        "error", execution_time_ms, str(e)
                    )
            
            total_time_ms = (time.time() - start_time) * 1000
            
            # Check if we have schema validation errors that should be returned as errors
            if schema_validation_errors:
                # Return error response for schema validation failures
                logger.error(f"Schema validation errors for entry point '{entry_point}': {len(schema_validation_errors)} errors")
                return {
                    "success": False,
                    "blocked": True,
                    "messages": [],
                    "rules_evaluated": 0,
                    "execution_time_ms": total_time_ms,
                    "entry_point": entry_point,
                    "schema_validation_errors": schema_validation_errors,
                    "error": "Context schema validation failed",
                    "details": f"Schema validation failed for {len(schema_validation_errors)} rule(s)"
                }
            
            result = {
                "success": True,
                "blocked": blocked,
                "messages": all_messages,
                "rules_evaluated": rules_evaluated,
                "execution_time_ms": total_time_ms,
                "entry_point": entry_point,
                "blocking_rules": blocking_rules,
                "required_acknowledgments": required_acknowledgments,
                "satisfied_acknowledgments": satisfied_acknowledgments,
                "actions_completed": [],
                "proceed": not blocked,
                "rules_executed": rules_executed_list,
                "preference_prompts": preference_prompts,
                "preferences": preference_prompts,  # Also add as "preferences" for consistency
                "context_updates": context_updates,
                "updates": update_results,
            }

            # Merge the modified context into the result
            # This allows tests and callers to access enriched context fields
            result.update(context)

            if blocked:
                result['error'] = 'Required acknowledgments not provided'

            return result
            
        except Exception as e:
            total_time_ms = (time.time() - start_time) * 1000
            logger.error(f" Rules Engine: Fatal error in '{entry_point}': {e}")
            return {
                "success": False,
                "blocked": False,
                "messages": [],
                "rules_evaluated": 0,
                "execution_time_ms": total_time_ms,
                "error": str(e),
                "entry_point": entry_point
            }
    
    def _set_nested_value(self, data: Dict[str, Any], path: str, value: Any) -> None:
        """Set nested value in dictionary using dot notation"""
        try:
            keys = path.split('.')
            current = data
            
            # Navigate to the parent object
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            # Set the final value
            current[keys[-1]] = value
            
        except Exception as e:
            logger.error(f"Failed to set nested value {path} = {value}: {e}")

    def _validate_context_structure(self, context: Dict[str, Any]) -> List[str]:
        """
        Validate context structure to prevent AttributeError issues
        Returns list of validation issues (empty if valid)
        """
        issues = []

        # Check for common problematic patterns
        if 'cart' in context and isinstance(context['cart'], dict):
            cart = context['cart']

            # Check cart.user field
            if 'user' in cart:
                user_val = cart['user']
                if not isinstance(user_val, (int, type(None))):
                    issues.append(f"cart.user should be integer or null, got {type(user_val).__name__}: {user_val}")

        # Check top-level user field
        if 'user' in context:
            user_val = context['user']
            if not isinstance(user_val, (dict, type(None))):
                issues.append(f"user should be dict or null, got {type(user_val).__name__}: {user_val}")

        return issues


# Global instance
rule_engine = RuleEngine()