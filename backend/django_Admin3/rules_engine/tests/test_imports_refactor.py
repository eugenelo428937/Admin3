"""
Test that rules_engine module imports work correctly after refactoring
TDD RED Phase - Test should fail initially due to import errors
"""
from django.test import TestCase


class TestRulesEngineImports(TestCase):
    """Test that all rules_engine imports work after removing obsolete models"""
    
    def test_models_import(self):
        """Test that models module imports successfully"""
        try:
            from rules_engine.models import (
                ActedRule,
                ActedRulesFields,
                ActedRuleExecution,
                RuleExecution,  # Alias
                MessageTemplate,
                # Note: UserAcknowledgment moved to cart.models.OrderUserAcknowledgment
                RuleEntryPoint,
                HolidayCalendar,
                ContentStyleTheme,
                ContentStyle,
                MessageTemplateStyle
            )
            # If we get here, imports worked
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Failed to import models: {e}")