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