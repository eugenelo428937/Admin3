"""
Test entry points compliance with PRD Epic 1.1 requirements
"""
from django.test import TestCase
from rules_engine.models import RuleEntryPoint


class TestEntryPointsPRDCompliance(TestCase):
    """Test that all PRD specified entry points are available"""
    
    def test_all_prd_entry_points_exist_in_model_choices(self):
        """
        TDD RED: Test that all entry points specified in Epic 1.1 
        are available in RuleEntryPoint.ENTRY_POINTS choices
        """
        # Entry points as specified in Epic 1.1 PRD - Updated list (vat_calculation and employer_validation removed)
        required_entry_points = [
            'home_page_mount',
            'product_list_mount', 
            'product_card_mount',
            'checkout_start',
            'checkout_preference',
            'checkout_terms',
            'checkout_payment',
            'user_registration'
        ]
        
        # Get available entry point codes from model choices
        available_codes = [choice[0] for choice in RuleEntryPoint.ENTRY_POINTS]
        
        # Check each required entry point exists in model choices
        missing_entry_points = []
        for entry_point in required_entry_points:
            if entry_point not in available_codes:
                missing_entry_points.append(entry_point)
        
        # This test should initially fail for missing entry points
        self.assertEqual(
            len(missing_entry_points), 0, 
            f"Missing entry points in model: {missing_entry_points}. "
            f"Available: {available_codes}"
        )
    
    def test_entry_points_can_be_created_in_database(self):
        """
        TDD RED: Test that all entry points from model choices can be created in database
        """
        # This test ensures we can populate the database with all entry points
        expected_count = len(RuleEntryPoint.ENTRY_POINTS)
        
        # Create entry points from choices
        for code, name in RuleEntryPoint.ENTRY_POINTS:
            RuleEntryPoint.objects.get_or_create(
                code=code,
                defaults={
                    'name': name, 
                    'description': f'Entry point for {name.lower()}'
                }
            )
        
        # Verify all entry points were created
        actual_count = RuleEntryPoint.objects.count()
        self.assertEqual(
            actual_count, expected_count,
            f"Expected {expected_count} entry points but found {actual_count}"
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
                f"Entry point {code} was not created in database"
            )