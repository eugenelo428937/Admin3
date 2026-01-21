"""
Test suite for ASET Warning Rule
Tests the complete flow of rule execution for ASET product warnings
"""
import json
import unittest
from django.test import TestCase
from django.db import transaction
from rules_engine.models import (
    ActedRule,
    ActedRulesFields,
    MessageTemplate,
    RuleEntryPoint,
    ActedRuleExecution
)
from rules_engine.services.rule_engine import RuleEngine



class ASETWarningRuleTestCase(TestCase):
    """Test ASET warning rule functionality"""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests"""
        # Create or get entry point
        cls.checkout_start_ep, _ = RuleEntryPoint.objects.get_or_create(
            code="checkout_start",
            defaults={
                "name": "Checkout Start",
                "description": "Entry point when checkout process begins",
                "is_active": True
            }
        )
        
        # Create schema for checkout context
        cls.checkout_schema = {
            "type": "object",
            "properties": {
                "cart": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "integer"},
                                    "product_id": {"type": "integer"},
                                    "subject_code": {"type": "string"},
                                    "product_name": {"type": "string"},
                                    "product_type": {"type": "string"},
                                    "current_product": {"type": "integer"},
                                    "quantity": {"type": "integer"},
                                    "price_type": {"type": "string"},
                                    "actual_price": {"type": "string"},
                                    "metadata": {"type": "object"}
                                },
                                "required": ["id", "product_id", "product_type", "current_product", 
                                           "quantity", "price_type", "actual_price", "metadata"]
                            }
                        }
                    },
                    "required": ["id", "items"]
                }
            },
            "required": ["cart"]
        }
        
        cls.rules_fields = ActedRulesFields.objects.create(
            fields_code="checkout_context_test",
            name="Test Checkout Context Schema",
            description="Schema for testing checkout context",
            schema=cls.checkout_schema,
            version=1,
            is_active=True
        )
        
        # Create message template
        cls.message_template = MessageTemplate.objects.create(
            name="ASET Warning Test",
            title="ASET Purchase Warning",
            content="BE AWARE: The {{subject_code}} Vault contains similar content",
            content_format="json",
            json_content={
                "type": "banner",
                "variant": "warning",
                "content": {
                    "title": "Important Notice",
                    "message": "BE AWARE: The {{subject_code}} Vault contains an eBook with very similar content to the {{subject_code}} ASET.",
                    "dismissible": True
                }
            },
            message_type="warning",
            variables=["subject_code"],
            is_active=True
        )
        
        # Create ASET warning rule
        cls.aset_rule = ActedRule.objects.create(
            rule_code="test_aset_warning_rule",
            name="Test ASET Warning Rule",
            description="Display warning when ASET products are in cart",
            entry_point="checkout_start",
            priority=100,
            active=True,
            version=1,
            rules_fields_code=cls.rules_fields.fields_code,
            condition={
                "some": [
                    {"var": "cart.items"},
                    {"in": [{"var": "product_id"}, [72, 73]]}
                ]
            },
            actions=[
                {
                    "type": "display_message",
                    "templateId": cls.message_template.id,
                    "messageType": "warning",
                    "placement": "top",
                    "dismissible": True
                }
            ],
            stop_processing=False,
            metadata={"test": True, "affected_products": [72, 73]}
        )
        
        cls.rule_engine = RuleEngine()
    
    def test_rule_triggers_for_aset_product_72(self):
        """Test that rule triggers when cart contains ASET product ID 72"""
        context = {
            "cart": {
                "id": 1,
                "items": [
                    {
                        "id": 1,
                        "product_id": 72,
                        "subject_code": "CM1",
                        "product_name": "CM1 ASET",
                        "product_type": "Material",
                        "current_product": 72,
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "150.00",
                        "metadata": {"variationId": 1}
                    }
                ]
            }
        }
        
        result = self.rule_engine.execute("checkout_start", context)
        
        # Assert rule was evaluated
        self.assertTrue(result["success"])
        self.assertEqual(result["rules_evaluated"], 1)
        
        # Assert rule was executed
        self.assertEqual(len(result["rules_executed"]), 1)
        executed_rule = result["rules_executed"][0]
        self.assertEqual(executed_rule["rule_id"], "test_aset_warning_rule")
        self.assertTrue(executed_rule["condition_result"])
        
        # Assert message was generated
        self.assertEqual(len(result["messages"]), 1)
        message = result["messages"][0]
        self.assertEqual(message["message_type"], "warning")
        self.assertEqual(message["template_id"], self.message_template.id)
    
    def test_rule_triggers_for_aset_product_73(self):
        """Test that rule triggers when cart contains ASET product ID 73"""
        context = {
            "cart": {
                "id": 2,
                "items": [
                    {
                        "id": 2,
                        "product_id": 73,
                        "subject_code": "CS2",
                        "product_name": "CS2 ASET",
                        "product_type": "Material",
                        "current_product": 73,
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "150.00",
                        "metadata": {"variationId": 2}
                    }
                ]
            }
        }
        
        result = self.rule_engine.execute("checkout_start", context)
        
        # Assert rule was executed
        self.assertEqual(len(result["rules_executed"]), 1)
        self.assertTrue(result["rules_executed"][0]["condition_result"])
        
        # Assert message was generated
        self.assertEqual(len(result["messages"]), 1)
        self.assertEqual(result["messages"][0]["message_type"], "warning")
    
    def test_rule_does_not_trigger_for_non_aset_product(self):
        """Test that rule does NOT trigger for non-ASET products"""
        context = {
            "cart": {
                "id": 3,
                "items": [
                    {
                        "id": 3,
                        "product_id": 100,  # Not an ASET product
                        "subject_code": "CS1",
                        "product_name": "CS1 Study Guide",
                        "product_type": "Material",
                        "current_product": 100,
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "75.00",
                        "metadata": {"variationId": 3}
                    }
                ]
            }
        }

        result = self.rule_engine.execute("checkout_start", context)

        # Assert execution was successful
        self.assertTrue(result["success"])

        # Assert no ASET warning messages were generated (non-ASET product)
        aset_warnings = [m for m in result.get("messages", [])
                        if "ASET" in m.get("message", "").upper()
                        or "vault" in m.get("message", "").lower()]
        self.assertEqual(len(aset_warnings), 0)
    
    def test_empty_cart_does_not_trigger_rule(self):
        """Test that empty cart does not trigger the rule"""
        context = {
            "cart": {
                "id": 6,
                "items": []
            }
        }

        result = self.rule_engine.execute("checkout_start", context)

        # Assert no ASET warning messages were generated (empty cart)
        aset_warnings = [m for m in result.get("messages", [])
                        if "ASET" in m.get("message", "").upper()
                        or "vault" in m.get("message", "").lower()]
        self.assertEqual(len(aset_warnings), 0)
    
    def test_rule_execution_is_logged(self):
        """Test that rule execution creates audit log entries"""
        initial_count = ActedRuleExecution.objects.count()
        
        context = {
            "cart": {
                "id": 7,
                "items": [
                    {
                        "id": 8,
                        "product_id": 72,
                        "subject_code": "CM1",
                        "product_name": "CM1 ASET",
                        "product_type": "Material",
                        "current_product": 72,
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "150.00",
                        "metadata": {"variationId": 8}
                    }
                ]
            }
        }
        
        result = self.rule_engine.execute("checkout_start", context)
        
        # Assert execution was logged
        final_count = ActedRuleExecution.objects.count()
        self.assertEqual(final_count, initial_count + 1)
        
        # Verify the logged execution
        latest_execution = ActedRuleExecution.objects.latest('created_at')
        self.assertEqual(latest_execution.rule_code, "test_aset_warning_rule")
        self.assertEqual(latest_execution.entry_point, "checkout_start")
        self.assertEqual(latest_execution.outcome, "success")