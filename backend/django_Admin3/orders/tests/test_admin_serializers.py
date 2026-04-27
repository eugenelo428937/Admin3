from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from orders.models import Order, OrderContact, OrderPreference, OrderAcknowledgment, OrderItem, Payment
from orders.serializers.admin_order_serializer import (
    OrderContactSerializer,
    OrderPreferenceSerializer,
    OrderAcknowledgmentSerializer,
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
)
from store.models import Purchasable
from students.models import Student

User = get_user_model()


class OrderContactSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u1', email='u1@example.com')
        self.order = Order.objects.create(user=self.user, total_amount=Decimal('100.00'))
        self.contact = OrderContact.objects.create(
            order=self.order,
            mobile_phone='+447111111111',
            mobile_phone_country='GB',
            email_address='contact@example.com',
            home_phone='02011111111',
            home_phone_country='GB',
        )

    def test_serializes_all_contact_fields(self):
        data = OrderContactSerializer(self.contact).data
        assert data['mobile_phone'] == '+447111111111'
        assert data['mobile_phone_country'] == 'GB'
        assert data['home_phone'] == '02011111111'
        assert data['email_address'] == 'contact@example.com'
        assert 'work_phone' in data


class OrderPreferenceSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u2', email='u2@example.com')
        self.order = Order.objects.create(user=self.user, total_amount=Decimal('100.00'))
        self.pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='marketing',
            preference_key='email_optin',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Marketing emails',
        )

    def test_includes_display_value_from_model_method(self):
        data = OrderPreferenceSerializer(self.pref).data
        assert data['preference_key'] == 'email_optin'
        assert data['title'] == 'Marketing emails'
        assert data['display_value'] == 'yes'
        assert data['preference_type'] == 'marketing'
        assert data['input_type'] == 'radio'


class OrderAcknowledgmentSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u3', email='u3@example.com')
        self.order = Order.objects.create(user=self.user, total_amount=Decimal('100.00'))
        self.ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='T&Cs v3',
            content_summary='You agree to the terms.',
            is_accepted=True,
            content_version='3.0',
        )

    def test_serializes_acknowledgment_fields(self):
        data = OrderAcknowledgmentSerializer(self.ack).data
        assert data['acknowledgment_type'] == 'terms_conditions'
        assert data['title'] == 'T&Cs v3'
        assert data['is_accepted'] is True
        assert data['content_version'] == '3.0'
        assert 'accepted_at' in data


class AdminOrderListSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='jsmith',
            email='jane@example.com',
            first_name='Jane',
            last_name='Smith',
        )
        self.student = Student.objects.create(user=self.user)
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('540.00')
        )
        # Purchasables for items
        p1 = Purchasable.objects.create(code='CM1/CC/26', name='CM1 Core', kind='product')
        p2 = Purchasable.objects.create(code='CP2/CPBOR/26', name='CP2 BOR', kind='product')
        OrderItem.objects.create(order=self.order, purchasable=p1, quantity=1, gross_amount=Decimal('100.00'))
        OrderItem.objects.create(order=self.order, purchasable=p2, quantity=1, gross_amount=Decimal('200.00'))

    def test_includes_student_summary_with_student_ref(self):
        data = AdminOrderListSerializer(self.order).data
        assert data['student'] == {
            'student_ref': self.student.student_ref,
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
        }

    def test_includes_item_codes_and_count(self):
        data = AdminOrderListSerializer(self.order).data
        assert sorted(data['item_codes']) == ['CM1/CC/26', 'CP2/CPBOR/26']
        assert data['item_count'] == 2

    def test_student_ref_null_when_user_has_no_student_record(self):
        user_no_student = User.objects.create_user(
            username='nostudent', email='ns@example.com',
            first_name='No', last_name='Student',
        )
        order = Order.objects.create(user=user_no_student, total_amount=Decimal('10.00'))
        data = AdminOrderListSerializer(order).data
        assert data['student']['student_ref'] is None
        assert data['student']['first_name'] == 'No'


class AdminOrderDetailSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='jsmith2', email='jane2@example.com',
            first_name='Jane', last_name='Smith',
        )
        Student.objects.create(user=self.user)
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('450.00'),
            vat_amount=Decimal('90.00'),
            total_amount=Decimal('540.00'),
            vat_rate=Decimal('0.2000'),
            vat_country='GB',
        )
        p1 = Purchasable.objects.create(code='CM1/CC/26', name='CM1 Core', kind='product')
        OrderItem.objects.create(order=self.order, purchasable=p1, quantity=1, gross_amount=Decimal('540.00'))
        Payment.objects.create(
            order=self.order, payment_method='card',
            amount=Decimal('540.00'), status='completed',
        )
        OrderContact.objects.create(
            order=self.order, mobile_phone='+447000', email_address='c@example.com',
        )
        OrderPreference.objects.create(
            order=self.order, preference_key='k1', title='T1',
            preference_value={'choice': 'yes'}, input_type='radio',
        )
        OrderAcknowledgment.objects.create(
            order=self.order, acknowledgment_type='terms_conditions',
            title='T&C', content_summary='ok', is_accepted=True,
        )

    def test_detail_includes_all_six_sections(self):
        data = AdminOrderDetailSerializer(self.order).data
        assert data['id'] == self.order.id
        assert data['student']['email'] == 'jane2@example.com'
        assert len(data['items']) == 1
        assert len(data['payments']) == 1
        assert data['user_contact']['email_address'] == 'c@example.com'
        assert len(data['user_preferences']) == 1
        assert len(data['user_acknowledgments']) == 1

    def test_detail_handles_missing_contact_and_empty_relations(self):
        bare_user = User.objects.create_user(username='bare', email='bare@x.com')
        bare_order = Order.objects.create(user=bare_user, total_amount=Decimal('0'))
        data = AdminOrderDetailSerializer(bare_order).data
        assert data['user_contact'] is None
        assert data['items'] == []
        assert data['payments'] == []
        assert data['user_preferences'] == []
        assert data['user_acknowledgments'] == []
