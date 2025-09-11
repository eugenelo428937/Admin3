"""Test file to verify TDD guard is working properly"""

from django.test import TestCase


class TDDGuardVerificationTests(TestCase):
    """Test cases to verify TDD guard functionality"""

    def test_simple_function_exists(self):
        """Test that a simple function exists and returns expected value"""
        from ..services.rule_engine import simple_test_function
        
        result = simple_test_function("hello")
        self.assertEqual(result, "processed: hello")