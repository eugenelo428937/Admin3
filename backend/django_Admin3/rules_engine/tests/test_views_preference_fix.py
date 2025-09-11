"""
Test that views.py preference saving fails with rule_json
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rules_engine.models import ActedRule

User = get_user_model()


class TestPreferenceViewFix(TestCase):
    """Test that rule_json field doesn't exist in ActedRule"""
    
    def test_acted_rule_does_not_have_rule_json_field(self):
        """Test that ActedRule doesn't accept rule_json parameter"""
        # This test proves that rule_json is not a valid field
        with self.assertRaises(TypeError) as context:
            ActedRule.objects.create(
                name='Preference: test',
                entry_point='user_preferences',
                active=True,
                priority=100,
                rule_json={'actions': [{'type': 'user_preference', 'key': 'test'}]}
            )
        
        self.assertIn("unexpected keyword argument", str(context.exception))
        self.assertIn("rule_json", str(context.exception))