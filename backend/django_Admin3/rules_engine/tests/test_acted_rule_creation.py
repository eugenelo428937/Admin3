"""
Test ActedRule creation with proper fields
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from rules_engine.models import ActedRule


class TestActedRuleCreation(TestCase):
    """Test that ActedRule can be created with the correct fields"""
    
    def test_create_acted_rule_with_correct_fields(self):
        """Test creating ActedRule with condition and actions fields"""
        # This test documents the correct fields for ActedRule creation
        rule = ActedRule.objects.create(
            rule_code='test_pref_newsletter',
            name='Preference: newsletter',
            entry_point='user_preferences',
            active=True,
            priority=100,
            condition={},  # Empty condition for preferences
            actions=[{'type': 'user_preference', 'key': 'newsletter'}]
        )
        
        self.assertIsNotNone(rule)
        self.assertEqual(rule.rule_code, 'test_pref_newsletter')
        self.assertEqual(rule.name, 'Preference: newsletter')
        self.assertEqual(rule.entry_point, 'user_preferences')
        self.assertTrue(rule.active)
        self.assertEqual(rule.priority, 100)
        self.assertEqual(rule.condition, {})
        self.assertEqual(rule.actions, [{'type': 'user_preference', 'key': 'newsletter'}])