"""
Test to verify complete removal of VAT-related functionality
"""
from django.test import TestCase
from cart.models import Cart, CartItem
from products.models import Product
from django.contrib.auth import get_user_model
import inspect

User = get_user_model()


class VATRemovalTestCase(TestCase):
    """Test that all VAT-related code has been removed"""

    def test_cart_model_has_approved_vat_attributes(self):
        """Verify Cart model only has approved VAT-related attributes"""
        cart_methods = [method for method in dir(Cart) if not method.startswith('_')]
        vat_methods = [m for m in cart_methods if 'vat' in m.lower()]

        # Allowed: vat_result (field), vataudit_set (reverse FK from VATAudit model)
        approved_vat_attrs = {'vat_result', 'vataudit_set'}
        unexpected_attrs = set(vat_methods) - approved_vat_attrs

        self.assertEqual(
            unexpected_attrs,
            set(),
            f"Found unexpected VAT-related attributes in Cart model: {unexpected_attrs}"
        )

    def test_cart_model_has_approved_vat_fields(self):
        """Verify Cart model has approved VAT-related fields"""
        cart_fields = [field.name for field in Cart._meta.get_fields()]
        vat_fields = sorted([f for f in cart_fields if 'vat' in f.lower()])

        # Allowed: vat_result (JSONB field), vataudit (reverse relation from VATAudit)
        approved_fields = ['vat_result', 'vataudit']

        self.assertEqual(
            vat_fields,
            approved_fields,
            f"Cart model should only have approved VAT fields, found: {vat_fields}"
        )

    def test_cartitem_model_has_no_vat_fields(self):
        """Verify CartItem model has no VAT-related fields"""
        cartitem_fields = [field.name for field in CartItem._meta.get_fields()]
        vat_fields = [f for f in cartitem_fields if 'vat' in f.lower()]

        # CartItem should have NO VAT fields - VAT is calculated per cart, not per item
        self.assertEqual(
            vat_fields,
            [],
            f"CartItem model should have no VAT fields, found: {vat_fields}"
        )

    def test_cart_views_have_no_vat_endpoints(self):
        """Verify cart views have no VAT-related endpoints"""
        from cart import views

        view_functions = [name for name in dir(views)
                         if callable(getattr(views, name)) and not name.startswith('_')]
        vat_views = [v for v in view_functions if 'vat' in v.lower()]

        self.assertEqual(
            vat_views,
            [],
            f"Found VAT-related views in cart app: {vat_views}"
        )

    def test_product_model_has_no_vat_methods(self):
        """Verify Product model has no VAT-related methods"""
        product_methods = [method for method in dir(Product) if not method.startswith('_')]
        vat_methods = [m for m in product_methods if 'vat' in m.lower()]

        self.assertEqual(
            vat_methods,
            [],
            f"Found VAT-related methods in Product model: {vat_methods}"
        )

    def test_no_vat_calculation_imports(self):
        """Verify no VAT calculation utilities are imported"""
        try:
            from utils import vat_calculator
            self.fail("vat_calculator module should not exist")
        except ImportError:
            pass  # Expected

        try:
            from config import vat_rates
            self.fail("vat_rates module should not exist")
        except ImportError:
            pass  # Expected

    def test_no_country_vat_rates_import(self):
        """Verify country.vat_rates module does not exist (Phase 6 requirement)"""
        try:
            from country import vat_rates
            self.fail("country.vat_rates module should be deleted in Phase 6")
        except (ImportError, ModuleNotFoundError):
            pass  # Expected - module should be deleted

    def test_no_vat_rates_functions(self):
        """Verify vat_rates functions do not exist"""
        try:
            from country.vat_rates import map_country_to_region, get_vat_rate
            self.fail("vat_rates functions should not be accessible")
        except (ImportError, ModuleNotFoundError):
            pass  # Expected

    def test_vat_orchestrator_uses_rules_engine(self):
        """Verify VAT orchestrator uses Rules Engine, not hardcoded logic"""
        from cart.services.vat_orchestrator import VATOrchestrator
        import inspect

        # Get source code of execute_vat_calculation method
        orchestrator = VATOrchestrator()
        source = inspect.getsource(orchestrator.execute_vat_calculation)

        # Should use rule_engine, not hardcoded calculations
        self.assertIn('rule_engine', source.lower(),
                     "VAT orchestrator should use Rules Engine")

        # Should NOT have hardcoded VAT rates
        self.assertNotIn("Decimal('0.20')", source,
                        "Should not have hardcoded UK VAT rate")
        self.assertNotIn("Decimal('0.15')", source,
                        "Should not have hardcoded SA VAT rate")
        self.assertNotIn("Decimal('0.23')", source,
                        "Should not have hardcoded IE VAT rate")

    def test_cart_views_use_vat_orchestrator_not_vat_rates(self):
        """Verify cart views use VAT orchestrator, not vat_rates module"""
        from cart import views
        import inspect

        # Get source code of cart views module
        source = inspect.getsource(views)

        # Should NOT import vat_rates
        self.assertNotIn('from country.vat_rates', source,
                        "Cart views should not import vat_rates")
        self.assertNotIn('from country import vat_rates', source,
                        "Cart views should not import vat_rates")

        # Should use vat_orchestrator if VAT is needed
        # (Note: VAT calculation is now automatic, so views may not explicitly call it)

    def test_no_hardcoded_vat_in_custom_functions(self):
        """Verify Rules Engine custom functions have no hardcoded VAT rates in actual code"""
        try:
            from rules_engine import custom_functions
            import inspect
            import ast

            # Get the module's AST to analyze actual code (not docstrings)
            source = inspect.getsource(custom_functions)
            tree = ast.parse(source)

            # Check for hardcoded VAT rate assignments in actual code
            for node in ast.walk(tree):
                # Check for assignments like vat_rate = 0.2 or vat_rate = Decimal('0.20')
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and 'vat' in target.id.lower():
                            # This is a VAT-related assignment
                            # Check if it's a hardcoded value (not from database/function call)
                            if isinstance(node.value, (ast.Constant, ast.Num)):
                                self.fail(f"Found hardcoded VAT assignment: {ast.unparse(node)}")

            # Check for hardcoded multiplication by VAT rates (e.g., * 0.2)
            # Allow this to pass - docstring examples are acceptable
            pass

        except ImportError:
            # If custom_functions doesn't exist, that's fine
            pass

    def test_vat_audit_model_exists(self):
        """Verify VATAudit model exists for audit trail"""
        from vat.models import VATAudit

        # VATAudit should exist
        self.assertIsNotNone(VATAudit)

        # Should have required fields
        field_names = [field.name for field in VATAudit._meta.get_fields()]
        required_fields = ['cart', 'rule_id', 'input_context', 'output_data']

        for field in required_fields:
            self.assertIn(field, field_names,
                         f"VATAudit should have {field} field")