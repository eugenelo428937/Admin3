"""
Tests for JSONLogic string comparison operators.
These operators should support both numeric and string comparison,
particularly for ISO date strings like "2025-12-11".
"""
from django.test import TestCase
from rules_engine.services.rule_engine import ConditionEvaluator


class JSONLogicStringComparisonTest(TestCase):
    """Test that comparison operators work with strings (especially dates)"""

    def setUp(self):
        """Set up condition evaluator"""
        self.evaluator = ConditionEvaluator()

    # ==================== >= Operator Tests ====================

    def test_gte_with_date_strings_equal(self):
        """Test >= operator with equal date strings"""
        condition = {">=": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-11"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-11 should be >= 2025-12-11")

    def test_gte_with_date_strings_greater(self):
        """Test >= operator with greater date string"""
        condition = {">=": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-15"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-15 should be >= 2025-12-11")

    def test_gte_with_date_strings_less(self):
        """Test >= operator with lesser date string"""
        condition = {">=": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-05"}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "2025-12-05 should NOT be >= 2025-12-11")

    def test_gte_with_numbers(self):
        """Test >= operator still works with numbers"""
        condition = {">=": [{"var": "age"}, 18]}
        context = {"age": 21}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "21 should be >= 18")

    def test_gte_with_numbers_equal(self):
        """Test >= operator with equal numbers"""
        condition = {">=": [{"var": "age"}, 18]}
        context = {"age": 18}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "18 should be >= 18")

    # ==================== <= Operator Tests ====================

    def test_lte_with_date_strings_equal(self):
        """Test <= operator with equal date strings"""
        condition = {"<=": [{"var": "current_date"}, "2025-12-31"]}
        context = {"current_date": "2025-12-31"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-31 should be <= 2025-12-31")

    def test_lte_with_date_strings_less(self):
        """Test <= operator with lesser date string"""
        condition = {"<=": [{"var": "current_date"}, "2025-12-31"]}
        context = {"current_date": "2025-12-15"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-15 should be <= 2025-12-31")

    def test_lte_with_date_strings_greater(self):
        """Test <= operator with greater date string"""
        condition = {"<=": [{"var": "current_date"}, "2025-12-31"]}
        context = {"current_date": "2026-01-01"}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "2026-01-01 should NOT be <= 2025-12-31")

    # ==================== > Operator Tests ====================

    def test_gt_with_date_strings(self):
        """Test > operator with date strings"""
        condition = {">": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-12"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-12 should be > 2025-12-11")

    def test_gt_with_date_strings_equal(self):
        """Test > operator with equal date strings"""
        condition = {">": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-11"}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "2025-12-11 should NOT be > 2025-12-11")

    # ==================== < Operator Tests ====================

    def test_lt_with_date_strings(self):
        """Test < operator with date strings"""
        condition = {"<": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-10"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-10 should be < 2025-12-11")

    def test_lt_with_date_strings_equal(self):
        """Test < operator with equal date strings"""
        condition = {"<": [{"var": "current_date"}, "2025-12-11"]}
        context = {"current_date": "2025-12-11"}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "2025-12-11 should NOT be < 2025-12-11")

    # ==================== Date Range Tests ====================

    def test_date_range_with_and(self):
        """Test date range using AND with >= and <="""
        condition = {
            "and": [
                {">=": [{"var": "current_date"}, "2025-12-11"]},
                {"<=": [{"var": "current_date"}, "2025-12-31"]}
            ]
        }
        context = {"current_date": "2025-12-15"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-15 should be in range [2025-12-11, 2025-12-31]")

    def test_date_range_outside_range(self):
        """Test date outside range"""
        condition = {
            "and": [
                {">=": [{"var": "current_date"}, "2025-12-11"]},
                {"<=": [{"var": "current_date"}, "2025-12-31"]}
            ]
        }
        context = {"current_date": "2025-12-01"}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "2025-12-01 should NOT be in range [2025-12-11, 2025-12-31]")

    # ==================== OR Condition Tests ====================

    def test_or_with_date_comparisons(self):
        """Test OR condition with multiple date comparisons (matches user's condition)"""
        condition = {
            "or": [
                {">=": [{"var": "current_date"}, "2025-12-11"]},
                {"==": [{"var": "current_date"}, "2025-12-10"]}
            ]
        }
        context = {"current_date": "2025-12-11"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "2025-12-11 should satisfy the OR condition")

    # ==================== Mixed Type Tests ====================

    def test_gte_with_string_numbers(self):
        """Test >= operator with string numbers (numeric strings compare as numbers)"""
        condition = {">=": [{"var": "version"}, "10"]}
        context = {"version": "9"}
        result = self.evaluator.evaluate(condition, context)
        # Numeric string comparison: "9" and "10" are both numeric, so compared as 9 < 10
        self.assertFalse(result, "Numeric string '9' should NOT be >= '10' (compared as numbers)")

    def test_gte_with_non_numeric_strings(self):
        """Test >= operator with non-numeric strings uses lexicographic comparison"""
        condition = {">=": [{"var": "version"}, "v10"]}
        context = {"version": "v9"}
        result = self.evaluator.evaluate(condition, context)
        # String comparison: "v9" > "v10" because "v9" > "v1" lexicographically
        self.assertTrue(result, "'v9' should be >= 'v10' lexicographically")

    def test_gte_with_numeric_strings_as_numbers(self):
        """Test >= operator with purely numeric strings (should compare as numbers)"""
        condition = {">=": [{"var": "count"}, "100"]}
        context = {"count": "50"}
        result = self.evaluator.evaluate(condition, context)
        # Both are numeric strings, should compare as numbers: 50 < 100
        self.assertFalse(result, "50 should NOT be >= 100")

    # ==================== Edge Cases ====================

    def test_gte_with_empty_string(self):
        """Test >= operator with empty string"""
        condition = {">=": [{"var": "value"}, ""]}
        context = {"value": "anything"}
        result = self.evaluator.evaluate(condition, context)
        self.assertTrue(result, "Any string should be >= empty string")

    def test_gte_with_none_value(self):
        """Test >= operator handles None value gracefully"""
        condition = {">=": [{"var": "value"}, "2025-12-11"]}
        context = {"value": None}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "None should not satisfy comparison")

    def test_gte_with_missing_var(self):
        """Test >= operator handles missing variable gracefully"""
        condition = {">=": [{"var": "missing_field"}, "2025-12-11"]}
        context = {}
        result = self.evaluator.evaluate(condition, context)
        self.assertFalse(result, "Missing variable should not satisfy comparison")
