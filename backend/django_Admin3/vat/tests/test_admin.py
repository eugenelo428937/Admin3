"""
Tests for VAT app Django admin interfaces.

Phase 7: Django Admin Interface - VATAudit
TDD Methodology: RED-GREEN-REFACTOR
"""
from django.test import TestCase
from django.contrib.admin.sites import site
from django.contrib.auth import get_user_model
from decimal import Decimal

from vat.models import VATAudit
from vat.admin import VATAuditAdmin
from cart.models import Cart

User = get_user_model()


class VATAuditAdminTests(TestCase):
    """Test VATAudit admin interface."""

    def setUp(self):
        """Set up test data."""
        self.admin_user = User.objects.create_superuser(
            username='admin_vat',
            email='admin_vat@example.com',
            password='admin123'
        )

        self.user = User.objects.create_user(
            username='test_user_vat',
            email='test_vat@example.com'
        )

        self.cart = Cart.objects.create(user=self.user)

        self.audit = VATAudit.objects.create(
            cart=self.cart,
            execution_id='test_exec_123',
            rule_id='calculate_vat',
            rule_version=1,
            input_context={
                'user': {'country': 'GB'},
                'cart': {'items': []}
            },
            output_data={
                'status': 'calculated',
                'totals': {
                    'net': '100.00',
                    'vat': '20.00',
                    'gross': '120.00'
                }
            },
            duration_ms=25
        )

    def test_vat_audit_registered(self):
        """Verify VATAudit is registered in admin."""
        self.assertIn(VATAudit, site._registry)

    def test_vat_audit_admin_list_display(self):
        """Verify list_display fields."""
        admin = site._registry[VATAudit]

        expected_fields = [
            'id',
            'cart',
            'rule_id',
            'created_at',
            'duration_ms',
            'vat_total'
        ]
        self.assertEqual(admin.list_display, expected_fields)

    def test_vat_audit_admin_list_filter(self):
        """Verify list filters."""
        admin = site._registry[VATAudit]

        self.assertIn('rule_id', admin.list_filter)
        self.assertIn('created_at', admin.list_filter)

    def test_vat_audit_admin_search_fields(self):
        """Verify search fields."""
        admin = site._registry[VATAudit]

        self.assertIn('cart__id', admin.search_fields)

    def test_vat_audit_admin_readonly_fields(self):
        """Verify all fields are readonly."""
        admin = site._registry[VATAudit]

        # All fields should be readonly (audit log)
        readonly = admin.get_readonly_fields(None, obj=self.audit)
        self.assertIn('cart', readonly)
        self.assertIn('rule_id', readonly)
        self.assertIn('input_context_formatted', readonly)
        self.assertIn('output_data_formatted', readonly)
        self.assertIn('duration_ms', readonly)
        self.assertIn('created_at', readonly)

    def test_vat_total_computed_field(self):
        """Test vat_total computed field."""
        admin = site._registry[VATAudit]

        vat_total = admin.vat_total(self.audit)
        self.assertEqual(vat_total, '£20.00')

    def test_has_add_permission_disabled(self):
        """Verify add permission is disabled (audit log is read-only)."""
        admin = site._registry[VATAudit]

        from django.test import RequestFactory
        factory = RequestFactory()
        request = factory.get('/admin/vat/vataudit/')
        request.user = self.admin_user

        self.assertFalse(admin.has_add_permission(request))

    def test_has_delete_permission_disabled(self):
        """Verify delete permission is disabled (audit log is permanent)."""
        admin = site._registry[VATAudit]

        from django.test import RequestFactory
        factory = RequestFactory()
        request = factory.get('/admin/vat/vataudit/')
        request.user = self.admin_user

        self.assertFalse(admin.has_delete_permission(request, obj=self.audit))
