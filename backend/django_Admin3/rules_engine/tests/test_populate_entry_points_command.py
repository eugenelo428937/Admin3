"""
Test for populate_entry_points management command
"""
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.management import CommandParser
from io import StringIO
from rules_engine.models import RuleEntryPoint


class TestPopulateEntryPointsCommand(TestCase):
    """Test the populate_entry_points management command"""
    
    def test_command_can_be_called(self):
        """
        TDD RED: Test that populate_entry_points command can be imported and called
        """
        # This test will initially fail because the command doesn't exist yet
        output = StringIO()
        
        # This should not raise an ImportError or CommandError
        try:
            call_command('populate_entry_points', stdout=output)
        except CommandError as e:
            if "Unknown command" in str(e):
                self.fail(f"Command 'populate_entry_points' does not exist: {e}")
            # Other CommandErrors are acceptable (like missing arguments)
        
        # If we get here, the command exists and can be called
        self.assertTrue(True, "Command can be imported and called")
    
    def test_command_populates_entry_points(self):
        """
        TDD RED: Test that command actually creates entry points in database
        """
        # Clear any existing entry points
        RuleEntryPoint.objects.all().delete()
        
        # Verify database is empty
        self.assertEqual(RuleEntryPoint.objects.count(), 0)
        
        # Run the command
        output = StringIO()
        call_command('populate_entry_points', stdout=output)
        
        # Verify all entry points were created
        expected_count = len(RuleEntryPoint.ENTRY_POINTS)
        actual_count = RuleEntryPoint.objects.count()
        
        self.assertEqual(
            actual_count, expected_count,
            f"Expected {expected_count} entry points, got {actual_count}"
        )
        
        # Verify specific PRD entry points exist
        required_codes = [
            'home_page_mount', 'product_list_mount', 'product_card_mount',
            'checkout_start', 'checkout_preference', 'checkout_terms', 
            'checkout_payment', 'user_registration'
        ]
        
        for code in required_codes:
            self.assertTrue(
                RuleEntryPoint.objects.filter(code=code).exists(),
                f"Entry point {code} was not created by command"
            )