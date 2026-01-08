"""
Stage 1 TDD Tests: RuleEntryPoint
- Verify entry points can be created, stored, and fetched from DB
- Verify entry point lookup returns correct rules
- Verify invalid entry point returns no rules (or error)
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rules_engine.models.rule_entry_point import RuleEntryPoint
from rules_engine.models.acted_rule import ActedRule


class Stage1RuleEntryPointTests(TestCase):
    """TDD Stage 1: RuleEntryPoint Model Tests"""
    
    def setUp(self):
        """Set up test data"""
        self.valid_entry_point_data = {
            'code': 'checkout_terms',
            'name': 'Checkout Terms Display',
            'description': 'Entry point for displaying terms during checkout',
            'is_active': True
        }
    
    def test_entry_point_creation_success(self):
        """
        TDD RED: Test entry point can be created and stored in DB
        Expected to FAIL initially - no implementation
        """
        entry_point = RuleEntryPoint.objects.create(**self.valid_entry_point_data)
        
        # Verify it was saved
        self.assertIsNotNone(entry_point.id)
        self.assertEqual(entry_point.code, 'checkout_terms')
        self.assertEqual(entry_point.name, 'Checkout Terms Display')
        self.assertTrue(entry_point.is_active)
        
        # Verify it can be fetched from DB
        fetched = RuleEntryPoint.objects.get(code='checkout_terms')
        self.assertEqual(fetched.name, 'Checkout Terms Display')
    
    def test_entry_point_unique_code_constraint(self):
        """
        TDD RED: Test that duplicate entry point codes are not allowed
        Expected to FAIL initially - no unique constraint
        """
        # Create first entry point
        RuleEntryPoint.objects.create(**self.valid_entry_point_data)
        
        # Attempt to create duplicate - should raise IntegrityError
        with self.assertRaises(IntegrityError):
            RuleEntryPoint.objects.create(**self.valid_entry_point_data)
    
    def test_entry_point_valid_choices(self):
        """
        TDD RED: Test that only predefined entry point codes are allowed
        Expected to FAIL initially - no choices validation
        """
        invalid_data = self.valid_entry_point_data.copy()
        invalid_data['code'] = 'invalid_entry_point'
        
        entry_point = RuleEntryPoint(**invalid_data)
        with self.assertRaises(ValidationError):
            entry_point.full_clean()
    
    def test_fetch_all_active_entry_points(self):
        """
        TDD RED: Test fetching all active entry points
        Expected to FAIL initially - no filtering logic
        """
        # Create active entry point
        RuleEntryPoint.objects.create(**self.valid_entry_point_data)
        
        # Create inactive entry point
        inactive_data = self.valid_entry_point_data.copy()
        inactive_data['code'] = 'home_page_mount'
        inactive_data['name'] = 'Home Page Mount'
        inactive_data['is_active'] = False
        RuleEntryPoint.objects.create(**inactive_data)
        
        # Should return only active entry points
        active_points = RuleEntryPoint.objects.filter(is_active=True)
        self.assertEqual(active_points.count(), 1)
        self.assertEqual(active_points.first().code, 'checkout_terms')
    
    def test_entry_point_lookup_returns_correct_rules(self):
        """
        TDD RED: Test that entry point lookup returns correct associated rules
        Expected to FAIL initially - no relationship with ActedRule
        """
        # Create entry point
        entry_point = RuleEntryPoint.objects.create(**self.valid_entry_point_data)
        
        # Create rules associated with this entry point
        rule1 = ActedRule.objects.create(
            rule_code='rule_checkout_terms_1',
            name='Checkout Terms Rule 1',
            entry_point='checkout_terms',
            priority=10,
            condition={'==': [True, True]},
            actions=[{'type': 'display_message', 'templateId': 'terms_msg'}]
        )
        
        rule2 = ActedRule.objects.create(
            rule_code='rule_checkout_terms_2',
            name='Checkout Terms Rule 2',
            entry_point='checkout_terms',
            priority=20,
            condition={'==': [True, True]},
            actions=[{'type': 'display_modal', 'templateId': 'terms_modal'}]
        )
        
        # Create rule for different entry point (should not be returned)
        rule3 = ActedRule.objects.create(
            rule_code='rule_home_page_1',
            name='Home Page Rule',
            entry_point='home_page_mount',
            priority=10,
            condition={'==': [True, True]},
            actions=[{'type': 'display_banner'}]
        )
        
        # Lookup rules by entry point
        checkout_rules = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        ).order_by('priority')
        
        self.assertEqual(checkout_rules.count(), 2)
        self.assertEqual(checkout_rules[0].rule_code, 'rule_checkout_terms_1')  # Priority 10
        self.assertEqual(checkout_rules[1].rule_code, 'rule_checkout_terms_2')  # Priority 20
    
    def test_invalid_entry_point_returns_no_rules(self):
        """
        TDD RED: Test that invalid entry point returns no rules
        Expected to FAIL initially - no validation
        """
        # Create some rules
        ActedRule.objects.create(
            rule_code='rule_checkout_1',
            name='Checkout Rule',
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'display_message'}]
        )
        
        # Query with invalid entry point
        invalid_rules = ActedRule.objects.filter(entry_point='invalid_entry_point')
        self.assertEqual(invalid_rules.count(), 0)
    
    def test_entry_point_rules_performance_ordering(self):
        """
        TDD RED: Test that rules are ordered by priority (performance requirement)
        Expected to FAIL initially - no proper ordering
        """
        # Create entry point
        RuleEntryPoint.objects.create(**self.valid_entry_point_data)
        
        # Create rules with different priorities (lower = higher priority)
        rule_high = ActedRule.objects.create(
            rule_code='rule_high_priority',
            name='High Priority Rule',
            entry_point='checkout_terms',
            priority=1,  # Highest priority
            condition={'==': [True, True]},
            actions=[{'type': 'display_urgent'}]
        )
        
        rule_low = ActedRule.objects.create(
            rule_code='rule_low_priority',
            name='Low Priority Rule',
            entry_point='checkout_terms',
            priority=100,  # Lower priority
            condition={'==': [True, True]},
            actions=[{'type': 'display_info'}]
        )
        
        rule_medium = ActedRule.objects.create(
            rule_code='rule_medium_priority',
            name='Medium Priority Rule',
            entry_point='checkout_terms',
            priority=50,  # Medium priority
            condition={'==': [True, True]},
            actions=[{'type': 'display_warning'}]
        )
        
        # Fetch rules ordered by priority
        ordered_rules = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        ).order_by('priority')
        
        # Should be ordered by priority: 1, 50, 100
        self.assertEqual(ordered_rules.count(), 3)
        self.assertEqual(ordered_rules[0].rule_code, 'rule_high_priority')
        self.assertEqual(ordered_rules[1].rule_code, 'rule_medium_priority')
        self.assertEqual(ordered_rules[2].rule_code, 'rule_low_priority')
    
    def test_entry_point_string_representation(self):
        """
        TDD RED: Test entry point string representation
        Expected to FAIL initially - no __str__ method
        """
        entry_point = RuleEntryPoint(**self.valid_entry_point_data)
        expected_str = "checkout_terms - Checkout Terms Display"
        self.assertEqual(str(entry_point), expected_str)
    
    def test_entry_point_meta_options(self):
        """
        TDD RED: Test entry point model meta options
        Expected to FAIL initially - no proper meta configuration
        """
        # Test table name
        self.assertEqual(RuleEntryPoint._meta.db_table, 'acted_rule_entry_points')
        
        # Test ordering
        self.assertEqual(RuleEntryPoint._meta.ordering, ['code'])
        
        # Test verbose names
        self.assertEqual(RuleEntryPoint._meta.verbose_name, 'Rule Entry Point')
        self.assertEqual(RuleEntryPoint._meta.verbose_name_plural, 'Rule Entry Points')