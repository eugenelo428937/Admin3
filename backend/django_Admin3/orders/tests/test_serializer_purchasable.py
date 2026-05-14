"""Task 18: OrderItemSerializer exposes the unified `purchasable` FK as nested object.

Dual-emit phase — mirrors the cart test. Ensures parity between cart
and order serializers so the frontend migration surface is consistent.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from orders.models import Order, OrderItem
from orders.serializers.order_serializer import OrderItemSerializer
from store.models import GenericItem, Product as StoreProduct, TutorialProduct


User = get_user_model()


class OrderItemSerializerPurchasableTests(TestCase):
    """Task 18 RED: OrderItemSerializer must expose nested `purchasable`."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='u18o',
            email='u18o@test.com',
            password='p',
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('25.00'),
            vat_amount=Decimal('0.00'),
            total_amount=Decimal('25.00'),
        )

    def test_serializer_exposes_purchasable(self):
        """Nested purchasable object should appear for voucher order items."""
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-ORD-SER-T18',
            name='Order Serializer Test Voucher',
            validity_period_days=1460,
        )
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=gi,
            item_type='marking_voucher',
            quantity=1,
            actual_price=Decimal('25.00'),
            net_amount=Decimal('25.00'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('25.00'),
            vat_rate=Decimal('0.0000'),
        )
        data = OrderItemSerializer(item).data

        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['code'], 'MV-ORD-SER-T18')
        self.assertEqual(data['purchasable']['kind'], 'marking_voucher')
        self.assertEqual(data['purchasable']['name'], 'Order Serializer Test Voucher')

    def test_legacy_fields_still_present_for_product_items(self):
        """Dual-emit: product-based order items still serialize legacy fields."""
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest("No store products available for product-FK test")
        item = OrderItem.objects.create(
            order=self.order,
            product=product,
            purchasable=product,
            item_type='product',
            quantity=1,
            actual_price=Decimal('50.00'),
            net_amount=Decimal('50.00'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('50.00'),
            vat_rate=Decimal('0.0000'),
        )
        data = OrderItemSerializer(item).data

        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['kind'], 'product')
        # Legacy fields still emitted
        self.assertIn('item_type', data)
        self.assertIn('item_name', data)


class OrderItemTutorialChoicesSerializerTests(TestCase):
    def test_serializer_emits_tutorial_choices_array(self):
        from datetime import date, timedelta
        from django.contrib.auth.models import User
        from django.utils import timezone
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct
        from students.models import Student
        from orders.models import Order, OrderItem
        from orders.serializers.order_serializer import (
            OrderItemSerializer,
        )
        from tutorials.models import TutorialChoice, TutorialEvents

        user = User.objects.create_user(username='os', email='os@t.com')
        student = Student.objects.create(user=user)
        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='SP1',
            defaults={'description': 'SP1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = TutorialProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='SP1/Live/LO_6H/25',
            format='LO_6H')
        sp.save()
        event = TutorialEvents.objects.create(
            code='SP1-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))
        order = Order.objects.create(user=user)
        item = OrderItem.objects.create(
            order=order, purchasable=sp.purchasable_ptr)
        TutorialChoice.objects.create(
            order_item=item, student=student,
            tutorial_event=event, choice_rank=1)

        data = OrderItemSerializer(item).data
        self.assertIn('tutorial_choices', data)
        self.assertEqual(len(data['tutorial_choices']), 1)
        self.assertEqual(data['tutorial_choices'][0]['choice_rank'], 1)
        self.assertEqual(
            data['tutorial_choices'][0]['tutorial_event_id'], event.id)
