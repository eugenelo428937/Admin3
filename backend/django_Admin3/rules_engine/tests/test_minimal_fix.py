"""
Minimal test to fix the rule_json issue
"""
from django.test import TestCase
from rules_engine.models import ActedRule


class TestMinimalFix(TestCase):
    """Test the minimal fix needed for ActedRule creation"""
    
    def test_replace_rule_json_with_condition_and_actions(self):
        """Test that we need to use condition and actions instead of rule_json"""
        # This is what the code currently tries to do (and fails):
        # ActedRule.objects.create(rule_json={'actions': [...]})
        
        # This is what should work instead:
        rule = ActedRule.objects.create(
            rule_id='minimal_test',
            name='Test',
            entry_point='test',
            active=True,
            priority=100,
            condition={},  # Instead of rule_json
            actions=[{'type': 'test'}]  # Separate field
        )
        
        self.assertIsNotNone(rule)
        # The key insight: rule_json needs to be replaced with condition and actions