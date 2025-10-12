"""
Test cart functionality for adding multiple material products
Tests the bug where adding a second material product overwrites the first one
"""
import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from products.models import Product, ProductVariation, ProductProductVariation
from exam_sessions.models import ExamSession
from subjects.models import Subject
from exam_sessions_subjects.models import ExamSessionSubject

User = get_user_model()


class TestCartMultipleMaterialsBug(TestCase):
    """Test case for cart overwriting bug when adding multiple material products"""

    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create exam session
        now = timezone.now()
        self.exam_session = ExamSession.objects.create(
            session_code='TEST2024',
            start_date=now,
            end_date=now + timedelta(days=90)
        )

        # Create subjects
        self.subject1 = Subject.objects.create(
            code='CB1',
            description='Business Finance'
        )

        self.subject2 = Subject.objects.create(
            code='CB2',
            description='Business Economics'
        )

        # Create exam session subjects
        self.ess1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject1
        )

        self.ess2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject2
        )

        # Create products (Course Notes and The Vault)
        self.product1 = Product.objects.create(
            code='CN',
            fullname='Course Notes',
            shortname='CN'
        )

        self.product2 = Product.objects.create(
            code='TV',
            fullname='The Vault',
            shortname='TV'
        )

        # Create product variations (must have unique combination of variation_type + name)
        self.variation1 = ProductVariation.objects.create(
            name='Printed CN',
            variation_type='Printed',
            description='Printed Course Notes'
        )

        self.variation2 = ProductVariation.objects.create(
            name='Printed TV',
            variation_type='Printed',
            description='Printed The Vault'
        )

        # Link products to variations (ProductProductVariation is just a junction table)
        self.ppv1 = ProductProductVariation.objects.create(
            product=self.product1,
            product_variation=self.variation1
        )

        self.ppv2 = ProductProductVariation.objects.create(
            product=self.product2,
            product_variation=self.variation2
        )

        # Create exam session subject products
        self.essp1 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.ess1,
            product=self.product1,
            is_active=True
        )

        self.essp2 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.ess2,
            product=self.product2,
            is_active=True
        )

    def test_add_two_different_material_products_should_not_overwrite(self):
        """
        RED PHASE: Test that adding two different material products to cart
        creates TWO separate cart items, not overwrites the first one

        BUG: Currently the second product REPLACES the first product in cart
        EXPECTED: Both products should be in cart as separate items
        """
        # Add first product (Course Notes) to cart
        add_payload_1 = {
            'current_product': self.essp1.id,
            'quantity': 1,
            'price_type': 'standard',
            'actual_price': '45.00',
            'metadata': {
                'type': 'material',
                'productType': 'Materials',
                'variationId': self.ppv1.id,
                'variationName': 'Printed CN',
                'variationType': 'Printed',
                'subjectCode': 'CB1',
                'productName': 'Course Notes'
            }
        }

        response1 = self.client.post('/api/cart/add/', add_payload_1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Verify first product was added
        cart = Cart.objects.get(user=self.user)
        cart_items = cart.items.all()
        self.assertEqual(cart_items.count(), 1, "Should have 1 item after first add")
        self.assertEqual(cart_items[0].product.product.fullname, 'Course Notes')

        # Add second product (The Vault) to cart
        add_payload_2 = {
            'current_product': self.essp2.id,
            'quantity': 1,
            'price_type': 'standard',
            'actual_price': '65.00',
            'metadata': {
                'type': 'material',
                'productType': 'Materials',
                'variationId': self.ppv2.id,
                'variationName': 'Printed TV',
                'variationType': 'Printed',
                'subjectCode': 'CB2',
                'productName': 'The Vault'
            }
        }

        response2 = self.client.post('/api/cart/add/', add_payload_2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # BUG VERIFICATION: This should FAIL showing the bug
        # Expected: 2 items (Course Notes + The Vault)
        # Actual (with bug): 1 item (only The Vault)
        cart.refresh_from_db()
        cart_items = cart.items.all()

        self.assertEqual(
            cart_items.count(),
            2,
            f"BUG: Should have 2 items after second add, but found {cart_items.count()}"
        )

        # Verify both products are in cart
        product_names = [item.product.product.fullname for item in cart_items]
        self.assertIn('Course Notes', product_names, "Course Notes should be in cart")
        self.assertIn('The Vault', product_names, "The Vault should be in cart")

        # Verify correct variationIds
        variation_ids = [item.metadata.get('variationId') for item in cart_items]
        self.assertIn(self.ppv1.id, variation_ids, "First variation ID should be in cart")
        self.assertIn(self.ppv2.id, variation_ids, "Second variation ID should be in cart")
