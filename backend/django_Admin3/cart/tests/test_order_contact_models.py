from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from cart.models import ActedOrder, OrderUserContact, OrderDeliveryDetail


class OrderUserContactModelTest(TestCase):
    """Test cases for OrderUserContact model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.order = ActedOrder.objects.create(
            user=self.user,
            subtotal=100.00,
            vat_amount=20.00,
            total_amount=120.00
        )

    def test_order_user_contact_creation_with_required_fields(self):
        """Test creating OrderUserContact with required fields"""
        contact = OrderUserContact.objects.create(
            order=self.order,
            mobile_phone='+44 7700 900123',
            email_address='contact@example.com'
        )

        self.assertEqual(contact.order, self.order)
        self.assertEqual(contact.mobile_phone, '+44 7700 900123')
        self.assertEqual(contact.email_address, 'contact@example.com')
        self.assertIsNone(contact.home_phone)
        self.assertIsNone(contact.work_phone)
        self.assertIsNotNone(contact.created_at)
        self.assertIsNotNone(contact.updated_at)

    def test_order_user_contact_creation_with_all_fields(self):
        """Test creating OrderUserContact with all fields"""
        contact = OrderUserContact.objects.create(
            order=self.order,
            home_phone='+44 20 7946 0958',
            mobile_phone='+44 7700 900123',
            work_phone='+44 20 8765 4321',
            email_address='contact@example.com'
        )

        self.assertEqual(contact.home_phone, '+44 20 7946 0958')
        self.assertEqual(contact.mobile_phone, '+44 7700 900123')
        self.assertEqual(contact.work_phone, '+44 20 8765 4321')
        self.assertEqual(contact.email_address, 'contact@example.com')

    def test_order_user_contact_str_representation(self):
        """Test string representation of OrderUserContact"""
        contact = OrderUserContact.objects.create(
            order=self.order,
            mobile_phone='+44 7700 900123',
            email_address='contact@example.com'
        )

        expected = f"Contact for Order #{self.order.id}: contact@example.com"
        self.assertEqual(str(contact), expected)

    def test_order_user_contact_cascade_delete(self):
        """Test that contact is deleted when order is deleted"""
        contact = OrderUserContact.objects.create(
            order=self.order,
            mobile_phone='+44 7700 900123',
            email_address='contact@example.com'
        )

        # Delete the order
        order_id = self.order.id
        self.order.delete()

        # Contact should be deleted as well
        with self.assertRaises(OrderUserContact.DoesNotExist):
            OrderUserContact.objects.get(order_id=order_id)

    def test_order_user_contact_required_fields_validation(self):
        """Test that required fields are validated"""
        # Test missing mobile_phone
        with self.assertRaises(IntegrityError):
            OrderUserContact.objects.create(
                order=self.order,
                email_address='contact@example.com'
            )

        # Test missing email_address
        with self.assertRaises(IntegrityError):
            OrderUserContact.objects.create(
                order=self.order,
                mobile_phone='+44 7700 900123'
            )


class OrderDeliveryDetailModelTest(TestCase):
    """Test cases for OrderDeliveryDetail model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.order = ActedOrder.objects.create(
            user=self.user,
            subtotal=100.00,
            vat_amount=20.00,
            total_amount=120.00
        )

    def test_order_delivery_preference_creation(self):
        """Test creating OrderDeliveryDetail"""
        preference = OrderDeliveryDetail.objects.create(
            order=self.order,
            delivery_address_type='home',
            delivery_address_line1='123 Test Street',
            delivery_city='London',
            delivery_postal_code='SW1A 1AA',
            delivery_country='United Kingdom',
            invoice_address_type='work',
            invoice_address_line1='456 Business Ave',
            invoice_city='London',
            invoice_postal_code='EC1A 1BB',
            invoice_country='United Kingdom'
        )

        self.assertEqual(preference.order, self.order)
        self.assertEqual(preference.delivery_address_type, 'home')
        self.assertEqual(preference.delivery_address_line1, '123 Test Street')
        self.assertEqual(preference.invoice_address_type, 'work')
        self.assertEqual(preference.invoice_address_line1, '456 Business Ave')
        self.assertIsNotNone(preference.created_at)
        self.assertIsNotNone(preference.updated_at)

    def test_order_delivery_preference_address_type_validation(self):
        """Test address type choices are validated"""
        # Test invalid delivery address type
        with self.assertRaises(ValidationError):
            preference = OrderDeliveryDetail(
                order=self.order,
                delivery_address_type='invalid_type',
                delivery_address_line1='123 Test Street',
                delivery_city='London',
                delivery_postal_code='SW1A 1AA',
                delivery_country='United Kingdom'
            )
            preference.full_clean()

    def test_order_delivery_preference_str_representation(self):
        """Test string representation of OrderDeliveryDetail"""
        preference = OrderDeliveryDetail.objects.create(
            order=self.order,
            delivery_address_type='home',
            delivery_address_line1='123 Test Street',
            delivery_city='London',
            delivery_postal_code='SW1A 1AA',
            delivery_country='United Kingdom'
        )

        expected = f"Delivery Preference for Order #{self.order.id}: home delivery"
        self.assertEqual(str(preference), expected)

    def test_order_delivery_preference_cascade_delete(self):
        """Test that preference is deleted when order is deleted"""
        preference = OrderDeliveryDetail.objects.create(
            order=self.order,
            delivery_address_type='home',
            delivery_address_line1='123 Test Street',
            delivery_city='London',
            delivery_postal_code='SW1A 1AA',
            delivery_country='United Kingdom'
        )

        # Delete the order
        order_id = self.order.id
        self.order.delete()

        # Preference should be deleted as well
        with self.assertRaises(OrderDeliveryDetail.DoesNotExist):
            OrderDeliveryDetail.objects.get(order_id=order_id)