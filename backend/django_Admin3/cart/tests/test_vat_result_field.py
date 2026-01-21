"""
Cart.vat_result Field Tests (TDD RED Phase)

Epic 3: Dynamic VAT Calculation System
Phase 2: VAT Audit Trail & Database Schema
Task: TASK-015 - Create Cart.vat_result Field Tests

These tests will initially fail because the vat_result field doesn't exist yet.
This is intentional and follows TDD RED → GREEN → REFACTOR workflow.
"""
from django.test import TestCase
from django.db import models
from django.contrib.auth import get_user_model
from cart.models import Cart

User = get_user_model()


class TestCartVATResultFieldExists(TestCase):
    """Test that Cart model has vat_result field."""

    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

    def test_cart_has_vat_result_field(self):
        """Test Cart model has vat_result field."""
        fields = [f.name for f in Cart._meta.get_fields()]
        self.assertIn('vat_result', fields)

    def test_vat_result_field_exists_on_cart_instance(self):
        """Test vat_result field is accessible on Cart instance."""
        cart = Cart.objects.create(user=self.user)
        self.assertTrue(hasattr(cart, 'vat_result'))


class TestCartVATResultFieldType(TestCase):
    """Test that vat_result field has correct type."""

    def test_vat_result_is_jsonfield(self):
        """Test vat_result is JSONField type."""
        field = Cart._meta.get_field('vat_result')
        self.assertEqual(field.get_internal_type(), 'JSONField')

    def test_vat_result_is_nullable(self):
        """Test vat_result field is nullable."""
        field = Cart._meta.get_field('vat_result')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)


class TestCartVATResultFieldData(TestCase):
    """Test storing and retrieving VAT result data."""

    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

    def test_vat_result_stores_simple_dict(self):
        """Test vat_result can store simple dictionary."""
        cart = Cart.objects.create(user=self.user)
        cart.vat_result = {
            'total_vat': '20.00',
            'total_net': '100.00',
            'total_gross': '120.00'
        }
        cart.save()

        saved_cart = Cart.objects.get(id=cart.id)
        self.assertEqual(saved_cart.vat_result['total_vat'], '20.00')
        self.assertEqual(saved_cart.vat_result['total_net'], '100.00')

    def test_vat_result_stores_complex_multi_item_data(self):
        """Test vat_result can store complex multi-item VAT results."""
        cart = Cart.objects.create(user=self.user)
        cart.vat_result = {
            'execution_id': 'exec_123',
            'items': [
                {
                    'item_id': 1,
                    'product_code': 'MAT-PRINT',
                    'net_amount': '100.00',
                    'vat_rate': '0.20',
                    'vat_amount': '20.00',
                    'gross_amount': '120.00',
                    'region': 'UK',
                    'rule_applied': 'vat_uk_standard'
                },
                {
                    'item_id': 2,
                    'product_code': 'MAT-EBOOK',
                    'net_amount': '80.00',
                    'vat_rate': '0.00',
                    'vat_amount': '0.00',
                    'gross_amount': '80.00',
                    'region': 'UK',
                    'rule_applied': 'vat_uk_ebook_zero'
                }
            ],
            'totals': {
                'total_net': '180.00',
                'total_vat': '20.00',
                'total_gross': '200.00'
            },
            'timestamp': '2025-09-30T10:00:00Z'
        }
        cart.save()

        # Retrieve and verify
        saved_cart = Cart.objects.get(id=cart.id)
        self.assertEqual(len(saved_cart.vat_result['items']), 2)
        self.assertEqual(saved_cart.vat_result['items'][0]['vat_amount'], '20.00')
        self.assertEqual(saved_cart.vat_result['items'][1]['vat_amount'], '0.00')
        self.assertEqual(saved_cart.vat_result['totals']['total_vat'], '20.00')

    def test_vat_result_stores_nested_structures(self):
        """Test vat_result can store deeply nested structures."""
        cart = Cart.objects.create(user=self.user)
        cart.vat_result = {
            'calculation': {
                'user': {
                    'id': 123,
                    'region': 'UK',
                    'address': {
                        'country': 'GB',
                        'postcode': 'SW1A 1AA'
                    }
                },
                'rules_applied': [
                    {
                        'rule_id': 'vat_uk_standard',
                        'rule_version': 1,
                        'items_affected': [1, 3]
                    },
                    {
                        'rule_id': 'vat_uk_ebook_zero',
                        'rule_version': 2,
                        'items_affected': [2]
                    }
                ]
            }
        }
        cart.save()

        saved_cart = Cart.objects.get(id=cart.id)
        self.assertEqual(saved_cart.vat_result['calculation']['user']['region'], 'UK')
        self.assertEqual(len(saved_cart.vat_result['calculation']['rules_applied']), 2)

    def test_vat_result_defaults_to_none(self):
        """Test vat_result defaults to None for new carts."""
        cart = Cart.objects.create(user=self.user)
        self.assertIsNone(cart.vat_result)

    def test_vat_result_can_be_updated(self):
        """Test vat_result can be updated after initial creation."""
        cart = Cart.objects.create(user=self.user)

        # Initial VAT result
        cart.vat_result = {
            'total_vat': '20.00',
            'total_net': '100.00'
        }
        cart.save()

        # Update VAT result
        cart.vat_result = {
            'total_vat': '30.00',
            'total_net': '150.00'
        }
        cart.save()

        saved_cart = Cart.objects.get(id=cart.id)
        self.assertEqual(saved_cart.vat_result['total_vat'], '30.00')
        self.assertEqual(saved_cart.vat_result['total_net'], '150.00')

    def test_vat_result_can_be_cleared(self):
        """Test vat_result can be set back to None."""
        cart = Cart.objects.create(user=self.user)
        cart.vat_result = {'total_vat': '20.00'}
        cart.save()

        cart.vat_result = None
        cart.save()

        saved_cart = Cart.objects.get(id=cart.id)
        self.assertIsNone(saved_cart.vat_result)


def run_all_tests():
    """Run all Cart vat_result field tests."""
    import sys
    from django.test.runner import DiscoverRunner

    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['cart.tests.test_vat_result_field'])
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    run_all_tests()
