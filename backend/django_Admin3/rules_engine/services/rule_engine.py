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

logger = logging.getLogger(__name__)


class RuleRepository:
    """Repository for rule CRUD operations with caching"""
    
    def __init__(self):
        self.cache_timeout = 300  # 5 minutes
    
    def get_active_rules(self, entry_point: str) -> List[ActedRule]:
        """Get active rules for entry point with caching"""
        cache_key = f"rules:{entry_point}"
        rules = cache.get(cache_key)
        
        if rules is None:
            logger.debug(f"Cache miss for rules:{entry_point}")
            rules = list(ActedRule.objects.filter(
                entry_point=entry_point,
                active=True
            ).order_by('priority', 'created_at'))
            
            cache.set(cache_key, rules, timeout=self.cache_timeout)
            logger.debug(f"Cached {len(rules)} rules for {entry_point}")
        else:
            logger.debug(f"Cache hit for rules:{entry_point}: {len(rules)} rules")
        
        return rules
    
    def invalidate_cache(self, entry_point: str):
        """Invalidate cache for entry point"""
        cache_key = f"rules:{entry_point}"
        cache.delete(cache_key)
        logger.debug(f"Invalidated cache for {entry_point}")


class Validator:
    """Context validation using JSON Schema"""
    
    def validate_context(self, context: Dict[str, Any], rules_fields_id: Optional[str] = None) -> bool:
        """Validate context against schema"""
        if not isinstance(context, dict):
            logger.warning(f"Context is not a dict: {type(context)}")
            return False
        
        # If no schema ID provided, do basic validation
        if not rules_fields_id:
            logger.debug(f"No schema validation - context keys: {list(context.keys())}")
            return True
        
        try:
            # Get the schema from database
            rules_fields = ActedRulesFields.objects.get(
                fields_id=rules_fields_id,
                is_active=True
            )
            
            # Validate context against schema
            jsonschema.validate(context, rules_fields.schema)
            logger.debug(f"✅ Schema validation passed for {rules_fields_id}")
            return True
            
        except ActedRulesFields.DoesNotExist:
            logger.error(f"RulesFields schema not found: {rules_fields_id}")
            return False
        except jsonschema.ValidationError as e:
            logger.warning(f"❌ Schema validation failed for {rules_fields_id}: {e.message}")
            logger.debug(f"Validation error path: {' -> '.join(str(p) for p in e.absolute_path)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during schema validation: {e}")
            return False


class ConditionEvaluator:
    """JSONLogic condition evaluation"""
    
    def evaluate(self, condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Evaluate JSONLogic condition against context"""
        try:
            # Handle the special "always" condition for testing
            if condition == {"always": True}:
                logger.debug("Always-true condition evaluated to True")
                return True
            
            # Use custom JSONLogic implementation
            result = self._evaluate_jsonlogic(condition, context)
            
            # Ensure we return a boolean
            if isinstance(result, bool):
                logger.debug(f"✅ JSONLogic condition evaluated to: {result}")
                return result
            else:
                # Convert truthy/falsy values to boolean
                boolean_result = bool(result)
                logger.debug(f"✅ JSONLogic condition result {result} converted to boolean: {boolean_result}")
                return boolean_result
            
        except Exception as e:
            logger.error(f"❌ Error evaluating JSONLogic condition {condition}: {e}")
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
                return not self._evaluate_jsonlogic(operands, data)
            
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
            return {
                "type": "display_message",
                "success": True,
                "message": {
                    "type": "display",
                    "title": action.get("title", "Message"),
                    "content": action.get("content", "Default message"),
                    "message_type": action.get("messageType", "info"),
                    "template_id": action.get("templateId")
                }
            }
        
        elif action_type == "user_acknowledge":
            return {
                "type": "user_acknowledge",
                "success": True,
                "message": {
                    "type": "acknowledge",
                    "title": action.get("title", "Acknowledgment Required"),
                    "content": action.get("content", "Please acknowledge"),
                    "message_type": "terms",
                    "template_id": action.get("templateId"),
                    "ack_key": action.get("ackKey"),
                    "required": action.get("required", True)
                }
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
        execution_id = f"exec_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        try:
            ActedRuleExecution.objects.create(
                execution_id=execution_id,
                rule_id=rule_id,
                entry_point=entry_point,
                context_snapshot=context,
                actions_result=actions_result,
                outcome=outcome,
                execution_time_ms=execution_time_ms,
                error_message=error_message
            )
            logger.debug(f"Stored execution record: {execution_id}")
            return execution_id
        except Exception as e:
            logger.error(f"Failed to store execution record: {e}")
            return execution_id


class RuleEngine:
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
            logger.info(f"🎯 Rules Engine: Executing entry point '{entry_point}'")
            
            # Fetch active rules
            rules = self.rule_repository.get_active_rules(entry_point)
            logger.info(f"📊 Rules Engine: Found {len(rules)} active rules for '{entry_point}'")
            
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
            
            for rule in rules:
                try:
                    rule_start = time.time()
                    
                    # Validate context
                    if not self.validator.validate_context(context, rule.rules_fields_id):
                        logger.warning(f"Context validation failed for rule {rule.rule_id}")
                        continue
                    
                    # Evaluate condition
                    condition_result = self.condition_evaluator.evaluate(rule.condition, context)
                    
                    if condition_result:
                        logger.info(f"✅ Rule '{rule.rule_id}' condition matched")
                        
                        # Execute actions
                        actions_result = self.action_dispatcher.dispatch(rule.actions, context)
                        
                        # Collect messages
                        for action_result in actions_result:
                            if action_result.get("success") and "message" in action_result:
                                all_messages.append(action_result["message"])
                        
                        rules_evaluated += 1
                        
                        # Store execution record
                        execution_time_ms = (time.time() - rule_start) * 1000
                        self.execution_store.store_execution(
                            rule.rule_id, entry_point, context, actions_result,
                            "success", execution_time_ms
                        )
                        
                        # Check if we should stop processing
                        if rule.stop_processing:
                            logger.info(f"🛑 Rule '{rule.rule_id}' set stop_processing=True")
                            break
                    else:
                        logger.debug(f"⏭️  Rule '{rule.rule_id}' condition not matched")
                
                except Exception as e:
                    logger.error(f"❌ Error processing rule '{rule.rule_id}': {e}")
                    # Store error execution record
                    execution_time_ms = (time.time() - rule_start) * 1000
                    self.execution_store.store_execution(
                        rule.rule_id, entry_point, context, [],
                        "error", execution_time_ms, str(e)
                    )
            
            total_time_ms = (time.time() - start_time) * 1000
            
            result = {
                "success": True,
                "blocked": blocked,
                "messages": all_messages,
                "rules_evaluated": rules_evaluated,
                "execution_time_ms": total_time_ms,
                "entry_point": entry_point
            }
            
            logger.info(f"🏁 Rules Engine: Completed '{entry_point}' - {rules_evaluated} rules evaluated in {total_time_ms:.2f}ms")
            return result
            
        except Exception as e:
            total_time_ms = (time.time() - start_time) * 1000
            logger.error(f"💥 Rules Engine: Fatal error in '{entry_point}': {e}")
            return {
                "success": False,
                "blocked": False,
                "messages": [],
                "rules_evaluated": 0,
                "execution_time_ms": total_time_ms,
                "error": str(e),
                "entry_point": entry_point
            }


# Global instance
rule_engine = RuleEngine()