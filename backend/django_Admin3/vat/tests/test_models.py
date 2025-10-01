"""
VATAudit Model Tests (TDD RED Phase)

Epic 3: Dynamic VAT Calculation System
Phase 2: VAT Audit Trail & Database Schema
Task: TASK-013 - Create VATAudit Model Tests

These tests will initially fail because the VATAudit model doesn't exist yet.
This is intentional and follows TDD RED → GREEN → REFACTOR workflow.
"""
from django.test import TestCase
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from vat.models import VATAudit
from cart.models import Cart, ActedOrder

User = get_user_model()


class TestVATAuditModelExists(TestCase):
    """Test that VATAudit model exists and can be imported."""

    def test_vat_audit_model_exists(self):
        """Test VATAudit model can be imported."""
        self.assertTrue(hasattr(VATAudit, 'objects'))

    def test_vat_audit_has_manager(self):
        """Test VATAudit has Django ORM manager."""
        self.assertTrue(hasattr(VATAudit, 'objects'))
        self.assertTrue(callable(getattr(VATAudit.objects, 'create', None)))


class TestVATAuditFields(TestCase):
    """Test that VATAudit model has all required fields."""

    def test_vat_audit_has_execution_id_field(self):
        """Test execution_id field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('execution_id', fields)

    def test_vat_audit_has_cart_field(self):
        """Test cart foreign key field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('cart', fields)

    def test_vat_audit_has_order_field(self):
        """Test order foreign key field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('order', fields)

    def test_vat_audit_has_rule_id_field(self):
        """Test rule_id field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('rule_id', fields)

    def test_vat_audit_has_rule_version_field(self):
        """Test rule_version field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('rule_version', fields)

    def test_vat_audit_has_input_context_field(self):
        """Test input_context JSONB field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('input_context', fields)

    def test_vat_audit_has_output_data_field(self):
        """Test output_data JSONB field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('output_data', fields)

    def test_vat_audit_has_duration_ms_field(self):
        """Test duration_ms field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('duration_ms', fields)

    def test_vat_audit_has_created_at_field(self):
        """Test created_at timestamp field exists."""
        fields = [f.name for f in VATAudit._meta.get_fields()]
        self.assertIn('created_at', fields)


class TestVATAuditFieldTypes(TestCase):
    """Test that VATAudit fields have correct types."""

    def test_execution_id_is_charfield(self):
        """Test execution_id is CharField with max_length=100."""
        field = VATAudit._meta.get_field('execution_id')
        self.assertIsInstance(field, models.CharField)
        self.assertEqual(field.max_length, 100)

    def test_cart_is_foreignkey(self):
        """Test cart is ForeignKey to Cart model."""
        field = VATAudit._meta.get_field('cart')
        self.assertIsInstance(field, models.ForeignKey)
        self.assertEqual(field.related_model.__name__, 'Cart')

    def test_order_is_foreignkey(self):
        """Test order is ForeignKey to ActedOrder model."""
        field = VATAudit._meta.get_field('order')
        self.assertIsInstance(field, models.ForeignKey)
        self.assertEqual(field.related_model.__name__, 'ActedOrder')

    def test_rule_id_is_charfield(self):
        """Test rule_id is CharField with max_length=100."""
        field = VATAudit._meta.get_field('rule_id')
        self.assertIsInstance(field, models.CharField)
        self.assertEqual(field.max_length, 100)

    def test_rule_version_is_integerfield(self):
        """Test rule_version is IntegerField."""
        field = VATAudit._meta.get_field('rule_version')
        self.assertIsInstance(field, models.IntegerField)

    def test_input_context_is_jsonfield(self):
        """Test input_context is JSONField."""
        field = VATAudit._meta.get_field('input_context')
        self.assertEqual(field.get_internal_type(), 'JSONField')

    def test_output_data_is_jsonfield(self):
        """Test output_data is JSONField."""
        field = VATAudit._meta.get_field('output_data')
        self.assertEqual(field.get_internal_type(), 'JSONField')

    def test_duration_ms_is_integerfield(self):
        """Test duration_ms is IntegerField."""
        field = VATAudit._meta.get_field('duration_ms')
        self.assertIsInstance(field, models.IntegerField)

    def test_created_at_is_datetimefield(self):
        """Test created_at is DateTimeField."""
        field = VATAudit._meta.get_field('created_at')
        self.assertIsInstance(field, models.DateTimeField)


class TestVATAuditFieldConstraints(TestCase):
    """Test field constraints and properties."""

    def test_cart_field_is_nullable(self):
        """Test cart foreign key is nullable."""
        field = VATAudit._meta.get_field('cart')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)

    def test_order_field_is_nullable(self):
        """Test order foreign key is nullable."""
        field = VATAudit._meta.get_field('order')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)

    def test_duration_ms_is_nullable(self):
        """Test duration_ms is nullable."""
        field = VATAudit._meta.get_field('duration_ms')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)

    def test_created_at_has_auto_now_add(self):
        """Test created_at has auto_now_add=True."""
        field = VATAudit._meta.get_field('created_at')
        self.assertTrue(field.auto_now_add)


class TestVATAuditIndexes(TestCase):
    """Test that required indexes are defined."""

    def test_execution_id_has_db_index(self):
        """Test execution_id field has database index."""
        field = VATAudit._meta.get_field('execution_id')
        self.assertTrue(field.db_index)

    def test_rule_id_has_db_index(self):
        """Test rule_id field has database index."""
        field = VATAudit._meta.get_field('rule_id')
        self.assertTrue(field.db_index)

    def test_model_has_indexes_in_meta(self):
        """Test model Meta class defines additional indexes."""
        self.assertTrue(hasattr(VATAudit._meta, 'indexes'))
        # Should have indexes for cart, order, created_at
        indexes = VATAudit._meta.indexes
        self.assertGreaterEqual(len(indexes), 3)


class TestVATAuditModelMethods(TestCase):
    """Test VATAudit model methods."""

    def test_str_method_exists(self):
        """Test __str__ method is implemented."""
        self.assertTrue(hasattr(VATAudit, '__str__'))
        self.assertTrue(callable(getattr(VATAudit, '__str__')))

    def test_str_method_returns_string(self):
        """Test __str__ returns string representation."""
        audit = VATAudit(
            execution_id='exec_test_001',
            rule_id='vat_uk_standard',
            rule_version=1,
            input_context={},
            output_data={}
        )
        result = str(audit)
        self.assertIsInstance(result, str)
        self.assertIn('exec_test_001', result)
        self.assertIn('vat_uk_standard', result)


class TestVATAuditCreation(TestCase):
    """Test creating VATAudit instances."""

    def test_vat_audit_minimal_creation(self):
        """Test VATAudit can be created with minimal required fields."""
        audit = VATAudit.objects.create(
            execution_id='exec_min_001',
            rule_id='vat_uk_standard',
            rule_version=1,
            input_context={'user': {'region': 'UK'}},
            output_data={'vat_amount': '20.00'}
        )
        self.assertIsNotNone(audit.id)
        self.assertEqual(audit.execution_id, 'exec_min_001')
        self.assertEqual(audit.rule_id, 'vat_uk_standard')
        self.assertEqual(audit.rule_version, 1)

    def test_vat_audit_full_creation_with_cart(self):
        """Test VATAudit creation with cart relationship."""
        user = User.objects.create_user(
            username='test_cart_user',
            email='test@example.com',
            password='testpass123'
        )
        cart = Cart.objects.create(user=user)
        audit = VATAudit.objects.create(
            execution_id='exec_cart_001',
            cart=cart,
            rule_id='vat_uk_ebook_zero',
            rule_version=2,
            input_context={
                'user': {'region': 'UK'},
                'item': {'product_code': 'MAT-EBOOK'}
            },
            output_data={
                'vat_amount': '0.00',
                'vat_rate': '0.00'
            },
            duration_ms=3
        )
        self.assertEqual(audit.cart.id, cart.id)
        self.assertEqual(audit.duration_ms, 3)

    def test_vat_audit_created_at_auto_populated(self):
        """Test created_at is automatically populated."""
        before = timezone.now()
        audit = VATAudit.objects.create(
            execution_id='exec_time_001',
            rule_id='vat_sa_standard',
            rule_version=1,
            input_context={},
            output_data={}
        )
        after = timezone.now()

        self.assertIsNotNone(audit.created_at)
        self.assertGreaterEqual(audit.created_at, before)
        self.assertLessEqual(audit.created_at, after)

    def test_vat_audit_jsonb_fields_accept_dict(self):
        """Test JSONB fields accept dictionary data."""
        complex_context = {
            'user': {
                'id': 123,
                'region': 'UK',
                'address': {
                    'country': 'GB',
                    'postcode': 'SW1A 1AA'
                }
            },
            'item': {
                'product_id': 456,
                'product_code': 'MAT-PRINT',
                'net_amount': '100.00',
                'classification': {
                    'is_digital': False,
                    'is_ebook': False
                }
            }
        }

        complex_output = {
            'vat_calculation': {
                'net_amount': '100.00',
                'vat_rate': '0.20',
                'vat_amount': '20.00',
                'gross_amount': '120.00'
            },
            'rule_applied': 'vat_uk_standard',
            'execution_time_ms': 2
        }

        audit = VATAudit.objects.create(
            execution_id='exec_complex_001',
            rule_id='vat_uk_standard',
            rule_version=1,
            input_context=complex_context,
            output_data=complex_output
        )

        # Retrieve and verify
        saved_audit = VATAudit.objects.get(id=audit.id)
        self.assertEqual(saved_audit.input_context['user']['region'], 'UK')
        self.assertEqual(saved_audit.output_data['vat_calculation']['vat_rate'], '0.20')

    def test_vat_audit_nullable_fields_default_to_none(self):
        """Test nullable fields default to None."""
        audit = VATAudit.objects.create(
            execution_id='exec_nullable_001',
            rule_id='vat_default',
            rule_version=1,
            input_context={},
            output_data={}
        )
        self.assertIsNone(audit.cart)
        self.assertIsNone(audit.order)
        self.assertIsNone(audit.duration_ms)


class TestVATAuditMetaOptions(TestCase):
    """Test model Meta options."""

    def test_db_table_name(self):
        """Test database table name is vat_audit."""
        self.assertEqual(VATAudit._meta.db_table, 'vat_audit')

    def test_ordering(self):
        """Test default ordering is by created_at descending."""
        ordering = VATAudit._meta.ordering
        self.assertEqual(ordering, ['-created_at'])


def run_all_tests():
    """Run all VATAudit model tests."""
    import sys
    from django.test.runner import DiscoverRunner

    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['vat.tests.test_models'])
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    run_all_tests()