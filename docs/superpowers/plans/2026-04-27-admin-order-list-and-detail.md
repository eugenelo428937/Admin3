# Admin Order List & Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a superuser-only admin Order browsing experience: list page at `/admin/orders` with filters/sort/pagination, and detail page at `/admin/orders/:id` showing order, items, payments, contact, preferences, and acknowledgments.

**Architecture:** New ReadOnly DRF viewset `AdminOrderViewSet` mounted at `/api/orders/admin/` (separate from existing user-scoped `OrderViewSet`). Two new serializers (`AdminOrderListSerializer` for table rows; `AdminOrderDetailSerializer` with nested entities). Frontend follows the established admin MVVM pattern (`OrderList.tsx` + `useOrderListVM.ts`, `OrderDetail.tsx` + `useOrderDetailVM.ts`) using shadcn-style composed admin components. Strict superuser gating on both layers. Read-only — no mutations in v1.

**Tech Stack:** Django 6.0 + DRF, PostgreSQL (`acted` schema), React 19.2 + TypeScript + Tailwind, existing shadcn-style admin UI primitives, MVVM pattern.

**Spec:** `docs/superpowers/specs/2026-04-27-admin-order-list-and-detail-design.md`

---

## File Structure

### Backend (new)
- `orders/admin_views.py` — `AdminOrderViewSet` (ReadOnlyModelViewSet, IsAdminUser, custom `_apply_filters`).
- `orders/serializers/admin_order_serializer.py` — `StudentSummarySerializer`, `AdminOrderListSerializer`, `OrderContactSerializer`, `OrderPreferenceSerializer`, `OrderAcknowledgmentSerializer`, `AdminOrderDetailSerializer`.
- `orders/tests/test_admin_views.py` — viewset/permission/filter/serializer tests.
- `orders/tests/test_admin_serializers.py` — direct serializer tests.

### Backend (modify)
- `orders/urls.py` — add admin router mount at `admin/`.

### Frontend (new)
- `src/types/admin-order.types.ts`
- `src/services/adminOrderService.ts`
- `src/components/admin/orders/OrderList.tsx`
- `src/components/admin/orders/useOrderListVM.ts`
- `src/components/admin/orders/OrderDetail.tsx`
- `src/components/admin/orders/useOrderDetailVM.ts`
- `src/components/admin/orders/__tests__/OrderList.test.tsx`
- `src/components/admin/orders/__tests__/useOrderListVM.test.ts`
- `src/components/admin/orders/__tests__/OrderDetail.test.tsx`

### Frontend (modify)
- `src/App.js` — register `/admin/orders` and `/admin/orders/:id` routes.

---

## Backend Phase

### Task 1: Nested entity serializers (Contact, Preference, Acknowledgment)

**Files:**
- Create: `backend/django_Admin3/orders/serializers/admin_order_serializer.py`
- Test: `backend/django_Admin3/orders/tests/test_admin_serializers.py`

Build the small serializers for the three "extra" related entities first, since they're isolated and easy to test.

- [ ] **Step 1: Write failing test for `OrderContactSerializer`**

Create `backend/django_Admin3/orders/tests/test_admin_serializers.py`:

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from orders.models import Order, OrderContact, OrderPreference, OrderAcknowledgment
from orders.serializers.admin_order_serializer import (
    OrderContactSerializer,
    OrderPreferenceSerializer,
    OrderAcknowledgmentSerializer,
)

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
```

- [ ] **Step 2: Run test — verify it fails (module not found)**

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::OrderContactSerializerTest -v
```

Expected: `ModuleNotFoundError: No module named 'orders.serializers.admin_order_serializer'`.

- [ ] **Step 3: Implement `OrderContactSerializer`**

Create `backend/django_Admin3/orders/serializers/admin_order_serializer.py`:

```python
from rest_framework import serializers
from orders.models import OrderContact, OrderPreference, OrderAcknowledgment


class OrderContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderContact
        fields = [
            'id',
            'home_phone', 'home_phone_country',
            'mobile_phone', 'mobile_phone_country',
            'work_phone', 'work_phone_country',
            'email_address',
            'created_at', 'updated_at',
        ]
```

- [ ] **Step 4: Run test — verify it passes**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::OrderContactSerializerTest -v
```

Expected: PASS.

- [ ] **Step 5: Add failing test for `OrderPreferenceSerializer` (display_value)**

Append to `test_admin_serializers.py`:

```python
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
```

- [ ] **Step 6: Run test — verify it fails**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::OrderPreferenceSerializerTest -v
```

Expected: FAIL `ImportError: cannot import name 'OrderPreferenceSerializer'`.

- [ ] **Step 7: Implement `OrderPreferenceSerializer`**

Append to `orders/serializers/admin_order_serializer.py`:

```python
class OrderPreferenceSerializer(serializers.ModelSerializer):
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = OrderPreference
        fields = [
            'id',
            'preference_type', 'preference_key', 'preference_value',
            'input_type', 'display_mode',
            'title', 'content_summary',
            'is_submitted',
            'submitted_at', 'updated_at',
            'display_value',
        ]

    def get_display_value(self, obj):
        return obj.get_display_value()
```

- [ ] **Step 8: Run test — verify it passes**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::OrderPreferenceSerializerTest -v
```

Expected: PASS.

- [ ] **Step 9: Add failing test for `OrderAcknowledgmentSerializer`**

Append to `test_admin_serializers.py`:

```python
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
```

- [ ] **Step 10: Run test — verify it fails**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::OrderAcknowledgmentSerializerTest -v
```

Expected: FAIL `ImportError: cannot import name 'OrderAcknowledgmentSerializer'`.

- [ ] **Step 11: Implement `OrderAcknowledgmentSerializer`**

Append to `orders/serializers/admin_order_serializer.py`:

```python
class OrderAcknowledgmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderAcknowledgment
        fields = [
            'id',
            'acknowledgment_type', 'rule_id', 'template_id',
            'title', 'content_summary',
            'is_accepted', 'accepted_at',
            'content_version',
            'acknowledgment_data',
        ]
```

- [ ] **Step 12: Run all 3 tests — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py -v
```

Expected: 3 passed.

- [ ] **Step 13: Commit**

```bash
git add backend/django_Admin3/orders/serializers/admin_order_serializer.py backend/django_Admin3/orders/tests/test_admin_serializers.py
git commit -m "feat(orders): add admin nested serializers for contact/preference/acknowledgment"
```

---

### Task 2: `StudentSummarySerializer` and `AdminOrderListSerializer`

**Files:**
- Modify: `backend/django_Admin3/orders/serializers/admin_order_serializer.py`
- Test: `backend/django_Admin3/orders/tests/test_admin_serializers.py`

- [ ] **Step 1: Write failing test for `AdminOrderListSerializer`**

Append to `test_admin_serializers.py`:

```python
from orders.serializers.admin_order_serializer import (
    AdminOrderListSerializer,
)
from orders.models import OrderItem
from store.models import Purchasable
from students.models import Student


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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::AdminOrderListSerializerTest -v
```

Expected: FAIL `ImportError`.

- [ ] **Step 3: Implement `AdminOrderListSerializer`**

Append to `orders/serializers/admin_order_serializer.py`:

```python
from orders.models import Order


class AdminOrderListSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    item_codes = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'created_at', 'total_amount',
            'student', 'item_codes', 'item_count',
        ]

    def get_student(self, obj):
        u = obj.user
        student = getattr(u, 'student', None)
        return {
            'student_ref': student.student_ref if student else None,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        }

    def get_item_codes(self, obj):
        codes = []
        for item in obj.items.all():
            if item.purchasable_id:
                codes.append(item.purchasable.code)
        return codes

    def get_item_count(self, obj):
        return len(obj.items.all())
```

- [ ] **Step 4: Run test — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::AdminOrderListSerializerTest -v
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/orders/serializers/admin_order_serializer.py backend/django_Admin3/orders/tests/test_admin_serializers.py
git commit -m "feat(orders): add AdminOrderListSerializer with student summary and item codes"
```

---

### Task 3: `AdminOrderDetailSerializer`

**Files:**
- Modify: `backend/django_Admin3/orders/serializers/admin_order_serializer.py`
- Test: `backend/django_Admin3/orders/tests/test_admin_serializers.py`

- [ ] **Step 1: Write failing test for detail payload shape**

Append to `test_admin_serializers.py`:

```python
from orders.serializers.admin_order_serializer import AdminOrderDetailSerializer
from orders.models import Payment


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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::AdminOrderDetailSerializerTest -v
```

Expected: FAIL `ImportError`.

- [ ] **Step 3: Implement `AdminOrderDetailSerializer`**

Append to `orders/serializers/admin_order_serializer.py`:

```python
from orders.serializers.order_serializer import OrderItemSerializer, PaymentSerializer


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    user_contact = serializers.SerializerMethodField()
    user_preferences = OrderPreferenceSerializer(many=True, read_only=True)
    user_acknowledgments = OrderAcknowledgmentSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'created_at', 'updated_at',
            'subtotal', 'vat_amount', 'total_amount',
            'vat_rate', 'vat_country', 'vat_calculation_type',
            'calculations_applied',
            'student',
            'items', 'payments',
            'user_contact', 'user_preferences', 'user_acknowledgments',
        ]

    def get_student(self, obj):
        u = obj.user
        student = getattr(u, 'student', None)
        return {
            'student_ref': student.student_ref if student else None,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        }

    def get_user_contact(self, obj):
        contact = obj.user_contact.first()
        return OrderContactSerializer(contact).data if contact else None
```

- [ ] **Step 4: Run test — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py::AdminOrderDetailSerializerTest -v
```

Expected: 2 passed.

- [ ] **Step 5: Run full serializer test file**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_serializers.py -v
```

Expected: 8 passed (2 contact + 1 pref + 1 ack + 3 list + 2 detail).

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/orders/serializers/admin_order_serializer.py backend/django_Admin3/orders/tests/test_admin_serializers.py
git commit -m "feat(orders): add AdminOrderDetailSerializer with all related sections"
```

---

### Task 4: `AdminOrderViewSet` — permissions, list, retrieve (no filters yet)

**Files:**
- Create: `backend/django_Admin3/orders/admin_views.py`
- Create: `backend/django_Admin3/orders/tests/test_admin_views.py`
- Modify: `backend/django_Admin3/orders/urls.py`

- [ ] **Step 1: Write failing permission test**

Create `backend/django_Admin3/orders/tests/test_admin_views.py`:

```python
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal

from orders.models import Order

User = get_user_model()


class AdminOrderViewSetPermissionTest(APITestCase):
    def setUp(self):
        self.regular = User.objects.create_user(username='reg', email='r@x.com', password='p')
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )

    def test_anonymous_user_gets_401_or_403(self):
        response = self.client.get('/api/orders/admin/')
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN,
        )

    def test_regular_user_gets_403(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_user_gets_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_200_OK
```

- [ ] **Step 2: Run test — verify it fails (URL not registered)**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py::AdminOrderViewSetPermissionTest -v
```

Expected: FAIL — 404 from each call (URL doesn't exist yet).

- [ ] **Step 3: Implement `AdminOrderViewSet` (no filters yet)**

Create `backend/django_Admin3/orders/admin_views.py`:

```python
from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination

from orders.models import Order, OrderItem
from orders.serializers.admin_order_serializer import (
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
)


class AdminOrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/orders/admin/ and GET /api/orders/admin/{id}/.

    Superuser-only browsing of all orders, with related items, payments,
    contact, preferences, and acknowledgments.
    """
    permission_classes = [IsAdminUser]
    pagination_class = AdminOrderPagination

    def get_queryset(self):
        qs = (
            Order.objects
            .select_related('user', 'user__student')
            .prefetch_related(
                Prefetch(
                    'items',
                    queryset=OrderItem.objects.select_related('purchasable'),
                ),
                'payments',
                'user_contact',
                'user_preferences',
                'user_acknowledgments',
            )
            .order_by('-created_at')
        )
        return self._apply_filters(qs)

    def _apply_filters(self, qs):
        # Filters added in Task 5.
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminOrderDetailSerializer
        return AdminOrderListSerializer
```

- [ ] **Step 4: Mount admin router in `orders/urls.py`**

Replace `backend/django_Admin3/orders/urls.py` with:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckoutView, OrderViewSet
from .admin_views import AdminOrderViewSet

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

admin_router = DefaultRouter()
admin_router.register(r'', AdminOrderViewSet, basename='admin-orders')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
```

- [ ] **Step 5: Run test — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py::AdminOrderViewSetPermissionTest -v
```

Expected: 3 passed.

- [ ] **Step 6: Add list/retrieve content tests**

Append to `test_admin_views.py`:

```python
from students.models import Student
from store.models import Purchasable
from orders.models import OrderItem


class AdminOrderViewSetListRetrieveTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.user_a = User.objects.create_user(
            username='ua', email='ua@x.com', first_name='Alice', last_name='A',
        )
        self.user_b = User.objects.create_user(
            username='ub', email='ub@x.com', first_name='Bob', last_name='B',
        )
        Student.objects.create(user=self.user_a)
        Student.objects.create(user=self.user_b)
        self.order_a = Order.objects.create(user=self.user_a, total_amount=Decimal('10'))
        self.order_b = Order.objects.create(user=self.user_b, total_amount=Decimal('20'))
        p = Purchasable.objects.create(code='CM1/CC/26', name='CM1', kind='product')
        OrderItem.objects.create(order=self.order_a, purchasable=p, quantity=1, gross_amount=Decimal('10'))

    def test_list_returns_orders_across_users(self):
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == 200
        ids = [r['id'] for r in response.data['results']]
        assert self.order_a.id in ids
        assert self.order_b.id in ids

    def test_list_payload_shape(self):
        response = self.client.get('/api/orders/admin/')
        first = response.data['results'][0]
        assert {'id', 'created_at', 'total_amount', 'student', 'item_codes', 'item_count'} <= set(first.keys())

    def test_retrieve_returns_full_detail_payload(self):
        response = self.client.get(f'/api/orders/admin/{self.order_a.id}/')
        assert response.status_code == 200
        keys = set(response.data.keys())
        for required in ('items', 'payments', 'user_contact',
                         'user_preferences', 'user_acknowledgments', 'student'):
            assert required in keys, f"missing {required}"
```

- [ ] **Step 7: Run tests — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py -v
```

Expected: 6 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/orders/admin_views.py backend/django_Admin3/orders/urls.py backend/django_Admin3/orders/tests/test_admin_views.py
git commit -m "feat(orders): add AdminOrderViewSet with permission gate, list, and retrieve"
```

---

### Task 5: Filters on `AdminOrderViewSet`

**Files:**
- Modify: `backend/django_Admin3/orders/admin_views.py`
- Test: `backend/django_Admin3/orders/tests/test_admin_views.py`

- [ ] **Step 1: Write failing tests for each filter**

Append to `test_admin_views.py`:

```python
from datetime import timedelta
from django.utils import timezone


class AdminOrderViewSetFilterTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

        self.alice = User.objects.create_user(
            username='alice', email='alice@example.com',
            first_name='Alice', last_name='Anderson',
        )
        self.bob = User.objects.create_user(
            username='bob', email='bob@other.com',
            first_name='Bob', last_name='Brown',
        )
        self.s_alice = Student.objects.create(user=self.alice)
        self.s_bob = Student.objects.create(user=self.bob)

        self.order_alice = Order.objects.create(user=self.alice, total_amount=Decimal('10'))
        self.order_bob = Order.objects.create(user=self.bob, total_amount=Decimal('20'))

        p1 = Purchasable.objects.create(code='CM1/CC/26', name='CM1', kind='product')
        p2 = Purchasable.objects.create(code='CP2/CPBOR/26', name='CP2', kind='product')
        OrderItem.objects.create(order=self.order_alice, purchasable=p1, quantity=1, gross_amount=Decimal('10'))
        OrderItem.objects.create(order=self.order_alice, purchasable=p2, quantity=1, gross_amount=Decimal('5'))
        OrderItem.objects.create(order=self.order_bob, purchasable=p2, quantity=1, gross_amount=Decimal('20'))

    def _ids(self, response):
        return {r['id'] for r in response.data['results']}

    def test_filter_by_student_ref(self):
        response = self.client.get('/api/orders/admin/', {'student_ref': self.s_alice.student_ref})
        assert self._ids(response) == {self.order_alice.id}

    def test_filter_by_name_matches_first_or_last_case_insensitive(self):
        response = self.client.get('/api/orders/admin/', {'name': 'ali'})
        assert self._ids(response) == {self.order_alice.id}
        response = self.client.get('/api/orders/admin/', {'name': 'BROWN'})
        assert self._ids(response) == {self.order_bob.id}

    def test_filter_by_email_substring(self):
        response = self.client.get('/api/orders/admin/', {'email': 'other.com'})
        assert self._ids(response) == {self.order_bob.id}

    def test_filter_by_order_no_exact(self):
        response = self.client.get('/api/orders/admin/', {'order_no': self.order_alice.id})
        assert self._ids(response) == {self.order_alice.id}

    def test_filter_by_product_code_distinct(self):
        response = self.client.get('/api/orders/admin/', {'product_code': 'CP2/CPBOR/26'})
        assert self._ids(response) == {self.order_alice.id, self.order_bob.id}
        # Ensure no duplicate rows from the join
        assert len(response.data['results']) == 2

    def test_filter_by_date_range(self):
        Order.objects.filter(pk=self.order_alice.pk).update(
            created_at=timezone.now() - timedelta(days=10)
        )
        Order.objects.filter(pk=self.order_bob.pk).update(
            created_at=timezone.now()
        )
        today = timezone.now().date().isoformat()
        response = self.client.get('/api/orders/admin/', {'date_from': today})
        assert self._ids(response) == {self.order_bob.id}

    def test_filters_compose_with_AND(self):
        response = self.client.get('/api/orders/admin/', {
            'name': 'alice', 'product_code': 'CM1/CC/26',
        })
        assert self._ids(response) == {self.order_alice.id}

    def test_invalid_numeric_filter_returns_empty(self):
        response = self.client.get('/api/orders/admin/', {'order_no': 'not-a-number'})
        assert response.status_code == 200
        assert response.data['results'] == []

    def test_ordering_whitelist_accepts_known_fields(self):
        response = self.client.get('/api/orders/admin/', {'ordering': 'created_at'})
        assert response.status_code == 200

    def test_ordering_unknown_field_ignored(self):
        # No 500 error on unknown ordering field
        response = self.client.get('/api/orders/admin/', {'ordering': 'evil__field'})
        assert response.status_code == 200
```

- [ ] **Step 2: Run filter tests — verify they fail**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py::AdminOrderViewSetFilterTest -v
```

Expected: most fail (filters not implemented), some may pass trivially.

- [ ] **Step 3: Implement `_apply_filters`**

Replace the `_apply_filters` stub in `orders/admin_views.py`:

```python
from django.db.models import Q

ALLOWED_ORDERING = {
    'created_at', '-created_at',
    'id', '-id',
    'user__last_name', '-user__last_name',
}


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    # ... (keep existing class body up to _apply_filters)

    def _apply_filters(self, qs):
        params = self.request.query_params

        student_ref = params.get('student_ref')
        if student_ref:
            try:
                qs = qs.filter(user__student__student_ref=int(student_ref))
            except (TypeError, ValueError):
                return qs.none()

        name = params.get('name')
        if name:
            qs = qs.filter(
                Q(user__first_name__icontains=name)
                | Q(user__last_name__icontains=name)
            )

        email = params.get('email')
        if email:
            qs = qs.filter(user__email__icontains=email)

        order_no = params.get('order_no')
        if order_no:
            try:
                qs = qs.filter(id=int(order_no))
            except (TypeError, ValueError):
                return qs.none()

        product_code = params.get('product_code')
        if product_code:
            qs = qs.filter(items__purchasable__code=product_code).distinct()

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        ordering = params.get('ordering')
        if ordering and ordering in ALLOWED_ORDERING:
            qs = qs.order_by(ordering)

        return qs
```

- [ ] **Step 4: Run filter tests — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py::AdminOrderViewSetFilterTest -v
```

Expected: 10 passed.

- [ ] **Step 5: Add query-count regression test**

Append to `test_admin_views.py`:

```python
from django.test.utils import CaptureQueriesContext
from django.db import connection


class AdminOrderViewSetQueryCountTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        # Create 5 orders, 2 items each, to expose N+1 issues
        for i in range(5):
            u = User.objects.create_user(
                username=f'u{i}', email=f'u{i}@x.com',
                first_name='F', last_name=f'L{i}',
            )
            Student.objects.create(user=u)
            o = Order.objects.create(user=u, total_amount=Decimal('1'))
            p1 = Purchasable.objects.create(code=f'CODE{i}A', name='A', kind='product')
            p2 = Purchasable.objects.create(code=f'CODE{i}B', name='B', kind='product')
            OrderItem.objects.create(order=o, purchasable=p1, quantity=1, gross_amount=Decimal('1'))
            OrderItem.objects.create(order=o, purchasable=p2, quantity=1, gross_amount=Decimal('1'))

    def test_list_query_count_is_bounded(self):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/orders/admin/')
        assert response.status_code == 200
        # Bound: pagination COUNT + main + select_related joined + prefetches.
        # With 6 prefetch relations expect ~10. Cap at 15 as regression guard.
        assert len(ctx.captured_queries) <= 15, f"Query count {len(ctx.captured_queries)} exceeds bound"
```

- [ ] **Step 6: Run test — verify pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py::AdminOrderViewSetQueryCountTest -v
```

Expected: PASS.

- [ ] **Step 7: Run full admin views test file**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/test_admin_views.py -v
```

Expected: ~17 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/orders/admin_views.py backend/django_Admin3/orders/tests/test_admin_views.py
git commit -m "feat(orders): add filter, ordering, and query-count regression for admin orders"
```

---

## Frontend Phase

### Task 6: Types + adminOrderService

**Files:**
- Create: `frontend/react-Admin3/src/types/admin-order.types.ts`
- Create: `frontend/react-Admin3/src/services/adminOrderService.ts`

- [ ] **Step 1: Create types file**

Create `frontend/react-Admin3/src/types/admin-order.types.ts`:

```ts
export interface StudentSummary {
  student_ref: number | null;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminOrderListItem {
  id: number;
  created_at: string;
  total_amount: string;
  student: StudentSummary;
  item_codes: string[];
  item_count: number;
}

export interface AdminOrderItem {
  id: number;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  price_type: string;
  actual_price: string | null;
  net_amount: string;
  vat_amount: string;
  gross_amount: string;
  vat_rate: string;
  is_vat_exempt: boolean;
  metadata: Record<string, unknown>;
  purchasable: { id: number; code: string; name: string; kind: string } | null;
}

export interface AdminPayment {
  id: number;
  payment_method: string;
  amount: string;
  currency: string;
  transaction_id: string | null;
  status: string;
  is_successful: boolean;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface AdminOrderContact {
  id: number;
  home_phone: string | null;
  home_phone_country: string;
  mobile_phone: string;
  mobile_phone_country: string;
  work_phone: string | null;
  work_phone_country: string;
  email_address: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderPreference {
  id: number;
  preference_type: string;
  preference_key: string;
  preference_value: Record<string, unknown>;
  input_type: string;
  display_mode: string;
  title: string;
  content_summary: string;
  is_submitted: boolean;
  submitted_at: string;
  updated_at: string;
  display_value: string;
}

export interface AdminOrderAcknowledgment {
  id: number;
  acknowledgment_type: string;
  rule_id: number | null;
  template_id: number | null;
  title: string;
  content_summary: string;
  is_accepted: boolean;
  accepted_at: string;
  content_version: string;
  acknowledgment_data: Record<string, unknown>;
}

export interface AdminOrderDetail {
  id: number;
  created_at: string;
  updated_at: string;
  subtotal: string;
  vat_amount: string;
  total_amount: string;
  vat_rate: string | null;
  vat_country: string | null;
  vat_calculation_type: string | null;
  calculations_applied: Record<string, unknown>;
  student: StudentSummary;
  items: AdminOrderItem[];
  payments: AdminPayment[];
  user_contact: AdminOrderContact | null;
  user_preferences: AdminOrderPreference[];
  user_acknowledgments: AdminOrderAcknowledgment[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

- [ ] **Step 2: Create service file**

Create `frontend/react-Admin3/src/services/adminOrderService.ts`:

```ts
import httpService from './httpService';
import config from '../config';
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  PaginatedResponse,
} from '../types/admin-order.types';

export interface AdminOrderSearchParams {
  student_ref?: number | string;
  name?: string;
  email?: string;
  order_no?: number | string;
  product_code?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProductCodeOption {
  code: string;
  name: string;
}

const baseUrl = `${config.apiBaseUrl}/api/orders/admin`;
const storeProductsUrl = `${config.apiBaseUrl}/api/store/products`;

const adminOrderService = {
  async search(
    params: AdminOrderSearchParams = {},
  ): Promise<PaginatedResponse<AdminOrderListItem>> {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        queryParams[k] = String(v);
      }
    });
    const response = await httpService.get(`${baseUrl}/`, { params: queryParams });
    return response.data;
  },

  async getById(id: number | string): Promise<AdminOrderDetail> {
    const response = await httpService.get(`${baseUrl}/${id}/`);
    return response.data;
  },

  async listProductCodes(): Promise<ProductCodeOption[]> {
    // Loads all store.Product codes for the product-code filter combobox.
    // NOTE: voucher/fee Purchasables are NOT included — those item codes can
    // still be filtered server-side via free-text URL param if needed.
    const response = await httpService.get(`${storeProductsUrl}/`, {
      params: { page_size: 10000 },
    });
    const results = response.data?.results ?? response.data ?? [];
    return results
      .filter((p: { product_code?: string }) => Boolean(p.product_code))
      .map((p: { product_code: string; name?: string }) => ({
        code: p.product_code,
        name: p.name ?? '',
      }));
  },
};

export default adminOrderService;
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend/react-Admin3
npx tsc --noEmit
```

Expected: no new errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/types/admin-order.types.ts frontend/react-Admin3/src/services/adminOrderService.ts
git commit -m "feat(admin-orders): add types and service for admin order API"
```

---

### Task 7: `useOrderListVM` ViewModel (TDD)

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/orders/useOrderListVM.ts`
- Create: `frontend/react-Admin3/src/components/admin/orders/__tests__/useOrderListVM.test.ts`

- [ ] **Step 1: Write failing test for VM debounce + service call**

Create `frontend/react-Admin3/src/components/admin/orders/__tests__/useOrderListVM.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import useOrderListVM from '../useOrderListVM';
import adminOrderService from '../../../../services/adminOrderService';

jest.mock('../../../../services/adminOrderService');
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: true }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

const mockService = adminOrderService as jest.Mocked<typeof adminOrderService>;

beforeEach(() => {
  jest.useFakeTimers();
  mockService.search.mockResolvedValue({
    count: 0, next: null, previous: null, results: [],
  });
  mockService.listProductCodes.mockResolvedValue([
    { code: 'CM1/CC/26', name: 'CM1 Core' },
    { code: 'CP2/CPBOR/26', name: 'CP2 BOR' },
  ]);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useOrderListVM', () => {
  it('fetches orders on mount', async () => {
    renderHook(() => useOrderListVM());
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(mockService.search).toHaveBeenCalled());
  });

  it('debounces text filter changes by 300ms', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => { jest.runAllTimers(); });
    mockService.search.mockClear();

    act(() => result.current.setName('Ali'));
    expect(mockService.search).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(299); });
    expect(mockService.search).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(1); });
    await waitFor(() => expect(mockService.search).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ali' }),
    ));
  });

  it('resets page to 0 when filters change', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => { jest.runAllTimers(); });
    act(() => result.current.handleChangePage(null, 3));
    expect(result.current.page).toBe(3);
    act(() => result.current.setEmail('x@y.com'));
    expect(result.current.page).toBe(0);
  });

  it('cycles ordering: ascending -> descending -> cleared', async () => {
    const { result } = renderHook(() => useOrderListVM());
    expect(result.current.ordering).toBe('-created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('-created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('');
  });

  it('loads product code options on mount', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => {
      expect(result.current.productCodeOptions).toEqual([
        { value: 'CM1/CC/26', label: 'CM1/CC/26 — CM1 Core' },
        { value: 'CP2/CPBOR/26', label: 'CP2/CPBOR/26 — CP2 BOR' },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails (module not found)**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=useOrderListVM --watchAll=false
```

Expected: FAIL — module `useOrderListVM` not found.

- [ ] **Step 3: Implement `useOrderListVM`**

Create `frontend/react-Admin3/src/components/admin/orders/useOrderListVM.ts`:

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import adminOrderService, { ProductCodeOption } from '../../../services/adminOrderService';
import type { AdminOrderListItem } from '../../../types/admin-order.types';

interface ComboboxOption { value: string; label: string; }

interface Filters {
  studentRef: string;
  name: string;
  email: string;
  orderNo: string;
  productCode: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: Filters = {
  studentRef: '',
  name: '',
  email: '',
  orderNo: '',
  productCode: '',
  dateFrom: '',
  dateTo: '',
};

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = '-created_at';

const useOrderListVM = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const [ordering, setOrdering] = useState<string>(DEFAULT_ORDERING);

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(INITIAL_FILTERS);

  const [productCodeOptions, setProductCodeOptions] = useState<ComboboxOption[]>([]);

  // Load product-code combobox options once on mount.
  useEffect(() => {
    adminOrderService.listProductCodes()
      .then((opts: ProductCodeOption[]) => {
        setProductCodeOptions(
          opts
            .map((o) => ({ value: o.code, label: o.name ? `${o.code} — ${o.name}` : o.code }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch((err) => console.error('Failed to load product codes:', err));
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminOrderService.search({
        student_ref: debouncedFilters.studentRef || undefined,
        name: debouncedFilters.name || undefined,
        email: debouncedFilters.email || undefined,
        order_no: debouncedFilters.orderNo || undefined,
        product_code: debouncedFilters.productCode || undefined,
        date_from: debouncedFilters.dateFrom || undefined,
        date_to: debouncedFilters.dateTo || undefined,
        ordering: ordering || undefined,
        page: page + 1,
        page_size: PAGE_SIZE,
      });
      setOrders(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, ordering, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const makeSetter = <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(0);
    };

  const setStudentRef = makeSetter('studentRef');
  const setName        = makeSetter('name');
  const setEmail       = makeSetter('email');
  const setOrderNo     = makeSetter('orderNo');
  const setProductCode = makeSetter('productCode');
  const setDateFrom    = makeSetter('dateFrom');
  const setDateTo      = makeSetter('dateTo');

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const toggleSort = (field: string) => {
    setOrdering((prev) => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return '';
      return field;
    });
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (_event: React.ChangeEvent<HTMLInputElement>) => setPage(0);

  const onView = (orderId: number) => navigate(`/admin/orders/${orderId}`);

  return {
    isSuperuser,
    orders, loading, error, totalCount, page, pageSize: PAGE_SIZE,
    filters,
    setStudentRef, setName, setEmail, setOrderNo, setProductCode, setDateFrom, setDateTo,
    clearFilters,
    productCodeOptions,
    ordering, toggleSort,
    handleChangePage, handleChangeRowsPerPage,
    onView,
  };
};

export default useOrderListVM;
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm test -- --testPathPattern=useOrderListVM --watchAll=false
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/orders/useOrderListVM.ts frontend/react-Admin3/src/components/admin/orders/__tests__/useOrderListVM.test.ts
git commit -m "feat(admin-orders): add useOrderListVM with debounced filters and sorting"
```

---

### Task 8: `OrderList.tsx` component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/orders/OrderList.tsx`
- Create: `frontend/react-Admin3/src/components/admin/orders/__tests__/OrderList.test.tsx`

- [ ] **Step 1: Write failing render test**

Create `frontend/react-Admin3/src/components/admin/orders/__tests__/OrderList.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderList from '../OrderList';

const navigateMock = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

const vmReturn = {
  isSuperuser: true,
  orders: [
    {
      id: 42,
      created_at: '2026-04-22T14:30:00Z',
      total_amount: '540.00',
      student: { student_ref: 12345, first_name: 'Jane', last_name: 'Smith', email: 'j@x.com' },
      item_codes: ['CM1/CC/26', 'CP2/CPBOR/26'],
      item_count: 5,
    },
  ],
  loading: false,
  error: null,
  totalCount: 1,
  page: 0,
  pageSize: 20,
  filters: {
    studentRef: '', name: '', email: '', orderNo: '',
    productCode: '', dateFrom: '', dateTo: '',
  },
  setStudentRef: jest.fn(), setName: jest.fn(), setEmail: jest.fn(),
  setOrderNo: jest.fn(), setProductCode: jest.fn(),
  setDateFrom: jest.fn(), setDateTo: jest.fn(),
  clearFilters: jest.fn(),
  productCodeOptions: [{ value: 'CM1/CC/26', label: 'CM1/CC/26 — CM1 Core' }],
  ordering: '-created_at',
  toggleSort: jest.fn(),
  handleChangePage: jest.fn(),
  handleChangeRowsPerPage: jest.fn(),
  onView: jest.fn(),
};

jest.mock('../useOrderListVM', () => ({
  __esModule: true, default: () => vmReturn,
}));

describe('OrderList', () => {
  beforeEach(() => { navigateMock.mockClear(); Object.values(vmReturn)
    .filter((v: unknown) => typeof v === 'function')
    .forEach((fn) => (fn as jest.Mock).mockClear?.()); });

  it('renders student name with student ref', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/Jane Smith \(12345\)/)).toBeInTheDocument();
  });

  it('shows item count badge for orders with items', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  it('shows item codes joined by commas', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/CM1\/CC\/26.*CP2\/CPBOR\/26/)).toBeInTheDocument();
  });

  it('clicking View calls onView with order id', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /view/i }));
    expect(vmReturn.onView).toHaveBeenCalledWith(42);
  });
});

describe('OrderList — non-superuser', () => {
  it('redirects when not superuser', () => {
    (vmReturn as unknown as { isSuperuser: boolean }).isSuperuser = false;
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
    (vmReturn as unknown as { isSuperuser: boolean }).isSuperuser = true;
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern=OrderList.test --watchAll=false
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `OrderList.tsx`**

Create `frontend/react-Admin3/src/components/admin/orders/OrderList.tsx`:

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  Search, X, Inbox, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AdminPage, AdminPageHeader, AdminErrorAlert, AdminLoadingState,
  AdminEmptyState, AdminPagination,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Combobox } from '@/components/admin/ui/combobox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useOrderListVM from './useOrderListVM';
import type { AdminOrderListItem } from '../../../types/admin-order.types';

const SortableHeader: React.FC<{
  label: string; field: string; ordering: string;
  onToggle: (field: string) => void;
}> = ({ label, field, ordering, onToggle }) => {
  const isAsc = ordering === field;
  const isDesc = ordering === `-${field}`;
  return (
    <Button
      variant="ghost" size="sm" className="tw:-ml-3 tw:h-8"
      onClick={(e) => { e.stopPropagation(); onToggle(field); }}
    >
      {label}
      {isAsc ? <ArrowUp className="tw:ml-1 tw:size-3.5" />
        : isDesc ? <ArrowDown className="tw:ml-1 tw:size-3.5" />
        : <ArrowUpDown className="tw:ml-1 tw:size-3.5 tw:text-muted-foreground/50" />}
    </Button>
  );
};

const formatStudent = (s: AdminOrderListItem['student']) =>
  `${s.first_name} ${s.last_name} (${s.student_ref ?? '—'})`;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

const OrderList: React.FC = () => {
  const vm = useOrderListVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  const hasActiveFilters = Object.values(vm.filters).some((v) => v !== '');

  return (
    <AdminPage>
      <AdminPageHeader title="Orders" />

      {/* Filter card */}
      <div className="tw:rounded-lg tw:border tw:bg-muted/30 tw:p-4 tw:mb-6">
        <div className="tw:flex tw:items-center tw:justify-between tw:mb-3">
          <span className="tw:text-sm tw:font-semibold">Search & Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={vm.clearFilters} className="tw:h-7 tw:text-xs">
              <X className="tw:mr-1 tw:h-3 tw:w-3" /> Clear All
            </Button>
          )}
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[130px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Ref</label>
            <Input placeholder="Student ref" value={vm.filters.studentRef}
              onChange={(e) => vm.setStudentRef(e.target.value)} />
          </div>
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Name</label>
            <div className="tw:relative">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
              <Input placeholder="First or last name..." value={vm.filters.name}
                onChange={(e) => vm.setName(e.target.value)} className="tw:pl-9" />
            </div>
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:flex-1">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Email</label>
            <Input placeholder="Email address..." value={vm.filters.email}
              onChange={(e) => vm.setEmail(e.target.value)} />
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[130px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Order No</label>
            <Input placeholder="Order #" value={vm.filters.orderNo}
              onChange={(e) => vm.setOrderNo(e.target.value)} />
          </div>
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Product Code</label>
            <Combobox
              options={vm.productCodeOptions}
              value={vm.filters.productCode}
              onValueChange={vm.setProductCode}
              placeholder="All products"
              searchPlaceholder="Search code or name..."
              emptyMessage="No products found."
            />
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4">
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Date From</label>
            <Input type="date" value={vm.filters.dateFrom}
              onChange={(e) => vm.setDateFrom(e.target.value)} />
          </div>
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Date To</label>
            <Input type="date" value={vm.filters.dateTo}
              onChange={(e) => vm.setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {!vm.loading && (
        <div className="tw:flex tw:justify-between tw:items-center tw:mb-2 tw:text-sm tw:text-muted-foreground">
          <span>{vm.totalCount.toLocaleString()} orders</span>
        </div>
      )}

      <AdminErrorAlert message={vm.error} />

      {vm.loading ? (
        <AdminLoadingState rows={8} columns={4} />
      ) : vm.orders.length === 0 ? (
        <AdminEmptyState title="No orders found" icon={Inbox} />
      ) : (
        <div className="tw:space-y-0">
          <div className="tw:rounded-[10px] tw:bg-card tw:py-2 tw:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader label="Order Date" field="created_at"
                      ordering={vm.ordering} onToggle={vm.toggleSort} />
                  </TableHead>
                  <TableHead>
                    <SortableHeader label="Student" field="user__last_name"
                      ordering={vm.ordering} onToggle={vm.toggleSort} />
                  </TableHead>
                  <TableHead>Order Items</TableHead>
                  <TableHead className="tw:w-[100px] tw:text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{formatStudent(order.student)}</TableCell>
                    <TableCell className="tw:max-w-[400px]">
                      <div className="tw:flex tw:items-center tw:gap-2">
                        <span className="tw:truncate tw:font-mono tw:text-xs">
                          {order.item_codes.join(', ')}
                        </span>
                        <span className="tw:inline-block tw:rounded tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-[10px] tw:font-medium tw:text-muted-foreground tw:whitespace-nowrap">
                          {order.item_count} items
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tw:text-right">
                      <Button size="sm" variant="outline" onClick={() => vm.onView(order.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            page={vm.page}
            pageSize={vm.pageSize}
            total={vm.totalCount}
            onPageChange={vm.handleChangePage}
            onPageSizeChange={(e) =>
              vm.handleChangeRowsPerPage(e as unknown as React.ChangeEvent<HTMLInputElement>)
            }
          />
        </div>
      )}
    </AdminPage>
  );
};

export default OrderList;
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm test -- --testPathPattern=OrderList.test --watchAll=false
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/orders/OrderList.tsx frontend/react-Admin3/src/components/admin/orders/__tests__/OrderList.test.tsx
git commit -m "feat(admin-orders): add OrderList page with filter card and table"
```

---

### Task 9: `useOrderDetailVM` ViewModel

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/orders/useOrderDetailVM.ts`

This VM is small enough that we test it together with the component in Task 10.

- [ ] **Step 1: Implement VM**

Create `frontend/react-Admin3/src/components/admin/orders/useOrderDetailVM.ts`:

```ts
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import adminOrderService from '../../../services/adminOrderService';
import type { AdminOrderDetail } from '../../../types/admin-order.types';

const useOrderDetailVM = () => {
  const { isSuperuser } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await adminOrderService.getById(id);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Order not found' : 'Failed to load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  return { isSuperuser, order, loading, error, orderId: id };
};

export default useOrderDetailVM;
```

(No standalone test file — exercised through the OrderDetail component test in Task 10.)

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/orders/useOrderDetailVM.ts
git commit -m "feat(admin-orders): add useOrderDetailVM"
```

---

### Task 10: `OrderDetail.tsx` page

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/orders/OrderDetail.tsx`
- Create: `frontend/react-Admin3/src/components/admin/orders/__tests__/OrderDetail.test.tsx`

- [ ] **Step 1: Write failing render test**

Create `frontend/react-Admin3/src/components/admin/orders/__tests__/OrderDetail.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderDetail from '../OrderDetail';
import adminOrderService from '../../../../services/adminOrderService';

jest.mock('../../../../services/adminOrderService');
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: true }),
}));

const mockService = adminOrderService as jest.Mocked<typeof adminOrderService>;

const fullOrder = {
  id: 42,
  created_at: '2026-04-22T14:30:00Z',
  updated_at: '2026-04-22T14:30:00Z',
  subtotal: '450.00', vat_amount: '90.00', total_amount: '540.00',
  vat_rate: '0.2000', vat_country: 'GB', vat_calculation_type: 'standard',
  calculations_applied: {},
  student: { student_ref: 12345, first_name: 'Jane', last_name: 'Smith', email: 'j@x.com' },
  items: [{
    id: 1, item_type: 'product', item_name: 'CM1 Core', quantity: 1,
    price_type: 'standard', actual_price: '450.00',
    net_amount: '450.00', vat_amount: '90.00', gross_amount: '540.00',
    vat_rate: '0.2000', is_vat_exempt: false, metadata: {},
    purchasable: { id: 5, code: 'CM1/CC/26', name: 'CM1 Core', kind: 'product' },
  }],
  payments: [{
    id: 1, payment_method: 'card', amount: '540.00', currency: 'GBP',
    transaction_id: 'tx_123', status: 'completed', is_successful: true,
    error_message: null, error_code: null,
    created_at: '2026-04-22T14:30:00Z', processed_at: '2026-04-22T14:30:05Z',
  }],
  user_contact: {
    id: 1, home_phone: '02011111111', home_phone_country: 'GB',
    mobile_phone: '+447111111111', mobile_phone_country: 'GB',
    work_phone: null, work_phone_country: '',
    email_address: 'jane@example.com',
    created_at: '2026-04-22T14:30:00Z', updated_at: '2026-04-22T14:30:00Z',
  },
  user_preferences: [{
    id: 1, preference_type: 'marketing', preference_key: 'email_optin',
    preference_value: { choice: 'yes' }, input_type: 'radio', display_mode: 'inline',
    title: 'Marketing emails', content_summary: '', is_submitted: true,
    submitted_at: '2026-04-22T14:30:00Z', updated_at: '2026-04-22T14:30:00Z',
    display_value: 'yes',
  }],
  user_acknowledgments: [{
    id: 1, acknowledgment_type: 'terms_conditions', rule_id: null, template_id: null,
    title: 'T&Cs v3', content_summary: 'You agree...', is_accepted: true,
    accepted_at: '2026-04-22T14:30:00Z', content_version: '3.0', acknowledgment_data: {},
  }],
};

const renderAt = (id: string) => render(
  <MemoryRouter initialEntries={[`/admin/orders/${id}`]}>
    <Routes><Route path="/admin/orders/:id" element={<OrderDetail />} /></Routes>
  </MemoryRouter>,
);

describe('OrderDetail', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders all six sections when order has data', async () => {
    mockService.getById.mockResolvedValue(fullOrder);
    renderAt('42');
    await waitFor(() => {
      expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Order Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Payments/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Acknowledgments/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
  });

  it('renders empty states for missing relations', async () => {
    mockService.getById.mockResolvedValue({
      ...fullOrder,
      user_contact: null, user_preferences: [], user_acknowledgments: [], payments: [],
    });
    renderAt('42');
    await waitFor(() => expect(screen.getByText(/Order Summary/i)).toBeInTheDocument());
    expect(screen.getByText(/no payments/i)).toBeInTheDocument();
    expect(screen.getByText(/no contact/i)).toBeInTheDocument();
    expect(screen.getByText(/no preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/no acknowledgments/i)).toBeInTheDocument();
  });

  it('shows error message on 404', async () => {
    mockService.getById.mockRejectedValue({ response: { status: 404 } });
    renderAt('999');
    await waitFor(() => {
      expect(screen.getByText(/order not found/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern=OrderDetail.test --watchAll=false
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `OrderDetail.tsx`**

Create `frontend/react-Admin3/src/components/admin/orders/OrderDetail.tsx`:

```tsx
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronLeft, FileText, User, Package, CreditCard, Phone, Settings, CheckCircle } from 'lucide-react';
import {
  AdminPage, AdminPageHeader, AdminLoadingState, AdminErrorAlert, AdminEmptyState,
} from '@/components/admin/composed';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useOrderDetailVM from './useOrderDetailVM';

const Section: React.FC<{
  title: string; icon: React.ComponentType<{ className?: string }>;
  emptyMessage?: string; isEmpty?: boolean; children: React.ReactNode;
}> = ({ title, icon: Icon, emptyMessage, isEmpty, children }) => (
  <div className="tw:rounded-[10px] tw:bg-card tw:p-6 tw:mb-4">
    <h2 className="tw:flex tw:items-center tw:gap-2 tw:text-lg tw:font-semibold tw:mb-3">
      <Icon className="tw:size-5" /> {title}
    </h2>
    {isEmpty && emptyMessage ? (
      <p className="tw:text-sm tw:text-muted-foreground">{emptyMessage}</p>
    ) : children}
  </div>
);

const StatusBadge: React.FC<{ ok: boolean; okLabel: string; failLabel: string }> = ({ ok, okLabel, failLabel }) => (
  <span className={`tw:inline-block tw:rounded tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium ${
    ok ? 'tw:bg-green-100 tw:text-green-800' : 'tw:bg-red-100 tw:text-red-800'
  }`}>{ok ? okLabel : failLabel}</span>
);

const OrderDetail: React.FC = () => {
  const vm = useOrderDetailVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  if (vm.loading) return <AdminPage><AdminLoadingState rows={6} columns={1} /></AdminPage>;
  if (vm.error) return <AdminPage><AdminErrorAlert message={vm.error} /></AdminPage>;
  if (!vm.order) return <AdminPage><AdminEmptyState title="Order not found" icon={FileText} /></AdminPage>;

  const o = vm.order;

  return (
    <AdminPage>
      <Link to="/admin/orders" className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:text-muted-foreground tw:mb-3 hover:tw:text-foreground">
        <ChevronLeft className="tw:size-4" /> Back to Orders
      </Link>
      <AdminPageHeader title={`Order #${o.id}`} />

      <Section title="Order Summary" icon={FileText}>
        <dl className="tw:grid tw:grid-cols-2 md:tw:grid-cols-3 tw:gap-3 tw:text-sm">
          <div><dt className="tw:text-muted-foreground">Created</dt><dd>{new Date(o.created_at).toLocaleString()}</dd></div>
          <div><dt className="tw:text-muted-foreground">Subtotal</dt><dd>£{o.subtotal}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT</dt><dd>£{o.vat_amount}</dd></div>
          <div><dt className="tw:text-muted-foreground">Total</dt><dd className="tw:font-semibold">£{o.total_amount}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT Rate</dt><dd>{o.vat_rate ? `${(parseFloat(o.vat_rate) * 100).toFixed(0)}%` : '—'}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT Country</dt><dd>{o.vat_country ?? '—'}</dd></div>
        </dl>
      </Section>

      <Section title="Student" icon={User}>
        <p className="tw:text-sm">
          <span className="tw:font-medium">{o.student.first_name} {o.student.last_name}</span>
          {' '}({o.student.student_ref ?? '—'}) · {o.student.email}
        </p>
      </Section>

      <Section title={`Order Items (${o.items.length})`} icon={Package}
        isEmpty={o.items.length === 0} emptyMessage="No items on this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead>
            <TableHead className="tw:text-right">Qty</TableHead>
            <TableHead>Price Type</TableHead>
            <TableHead className="tw:text-right">Net</TableHead>
            <TableHead className="tw:text-right">VAT</TableHead>
            <TableHead className="tw:text-right">Gross</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="tw:font-mono tw:text-xs">{it.purchasable?.code ?? '—'}</TableCell>
                <TableCell>{it.item_name ?? '—'}</TableCell>
                <TableCell className="tw:text-right">{it.quantity}</TableCell>
                <TableCell>{it.price_type}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.net_amount}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.vat_amount}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.gross_amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title={`Payments (${o.payments.length})`} icon={CreditCard}
        isEmpty={o.payments.length === 0} emptyMessage="No payments recorded for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Method</TableHead>
            <TableHead className="tw:text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Processed</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_method}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{p.amount}</TableCell>
                <TableCell><StatusBadge ok={p.is_successful} okLabel={p.status} failLabel={p.status} /></TableCell>
                <TableCell className="tw:font-mono tw:text-xs">{p.transaction_id ?? '—'}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                <TableCell>{p.processed_at ? new Date(p.processed_at).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Contact" icon={Phone}
        isEmpty={!o.user_contact} emptyMessage="No contact captured for this order">
        {o.user_contact && (
          <dl className="tw:grid tw:grid-cols-2 md:tw:grid-cols-3 tw:gap-3 tw:text-sm">
            <div><dt className="tw:text-muted-foreground">Mobile</dt><dd>{o.user_contact.mobile_phone} {o.user_contact.mobile_phone_country && `(${o.user_contact.mobile_phone_country})`}</dd></div>
            <div><dt className="tw:text-muted-foreground">Home</dt><dd>{o.user_contact.home_phone ?? '—'}</dd></div>
            <div><dt className="tw:text-muted-foreground">Work</dt><dd>{o.user_contact.work_phone ?? '—'}</dd></div>
            <div className="tw:col-span-2 md:tw:col-span-3"><dt className="tw:text-muted-foreground">Email</dt><dd>{o.user_contact.email_address}</dd></div>
          </dl>
        )}
      </Section>

      <Section title={`Preferences (${o.user_preferences.length})`} icon={Settings}
        isEmpty={o.user_preferences.length === 0} emptyMessage="No preferences captured for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Key</TableHead>
            <TableHead>Title</TableHead><TableHead>Value</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.user_preferences.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.preference_type}</TableCell>
                <TableCell className="tw:font-mono tw:text-xs">{p.preference_key}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.display_value}</TableCell>
                <TableCell>{new Date(p.submitted_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title={`Acknowledgments (${o.user_acknowledgments.length})`} icon={CheckCircle}
        isEmpty={o.user_acknowledgments.length === 0} emptyMessage="No acknowledgments captured for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Title</TableHead>
            <TableHead>Status</TableHead><TableHead>Accepted At</TableHead>
            <TableHead>Version</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.user_acknowledgments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.acknowledgment_type}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell><StatusBadge ok={a.is_accepted} okLabel="Accepted" failLabel="Pending" /></TableCell>
                <TableCell>{new Date(a.accepted_at).toLocaleString()}</TableCell>
                <TableCell>{a.content_version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </AdminPage>
  );
};

export default OrderDetail;
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm test -- --testPathPattern=OrderDetail.test --watchAll=false
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/orders/OrderDetail.tsx frontend/react-Admin3/src/components/admin/orders/__tests__/OrderDetail.test.tsx
git commit -m "feat(admin-orders): add OrderDetail page with all six sections"
```

---

### Task 11: Register routes in `App.js`

**Files:**
- Modify: `frontend/react-Admin3/src/App.js`

- [ ] **Step 1: Add lazy imports near other admin lazy imports**

Open `frontend/react-Admin3/src/App.js`. Just below the existing `LegacyOrderList` lazy import (around line 110), add:

```js
const AdminOrderList   = React.lazy(() => import("./components/admin/orders/OrderList.tsx"));
const AdminOrderDetail = React.lazy(() => import("./components/admin/orders/OrderDetail.tsx"));
```

- [ ] **Step 2: Add routes near other `/admin/*` routes**

Find the section with `<Route path="/admin/legacy-orders" ...>` (around line 344) and add immediately above it:

```jsx
<Route path="/admin/orders"     element={<AdminOrderList />} />
<Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
```

- [ ] **Step 3: Run frontend build**

```bash
cd frontend/react-Admin3
npm run build
```

Expected: build succeeds. (No new tests needed — routes are configuration.)

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/App.js
git commit -m "feat(admin-orders): register /admin/orders and /admin/orders/:id routes"
```

---

### Task 12: Smoke test in browser & full suite

- [ ] **Step 1: Start backend (if not already running)**

```bash
cd backend/django_Admin3
.venv/bin/python manage.py runserver 8888
```

- [ ] **Step 2: Start frontend (if not already running)**

```bash
cd frontend/react-Admin3
npm start
```

- [ ] **Step 3: Smoke test — list page**

Navigate to `http://127.0.0.1:3000/admin/orders` while logged in as a superuser. Verify:
- The page renders with the filter card and at least one row (assuming there are orders in the DB).
- Typing in `Name` debounces ~300ms then re-fetches.
- Clicking the column header for "Order Date" toggles ascending → descending → cleared.
- Clicking `View` on a row navigates to `/admin/orders/<id>`.
- Logging out and visiting the page redirects to `/`.

- [ ] **Step 4: Smoke test — detail page**

On the detail page, verify:
- All six sections render.
- The back link returns to the list.
- An order with no contact / preferences / acknowledgments shows the appropriate empty messages.
- A bogus URL like `/admin/orders/9999999` shows the 404 error message.

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest orders/tests/ -v
```

Expected: all order tests pass; no regressions.

- [ ] **Step 6: Run full frontend test suite**

```bash
cd frontend/react-Admin3
npm test -- --watchAll=false --testPathPattern=admin/orders
```

Expected: all admin/orders tests pass.

- [ ] **Step 7: Run coverage check on new code**

```bash
cd frontend/react-Admin3
npm test -- --coverage --watchAll=false --collectCoverageFrom='src/components/admin/orders/**' --collectCoverageFrom='src/services/adminOrderService.ts'
```

Expected: ≥ 80% coverage on lines/branches/functions/statements for `src/components/admin/orders/**`.

```bash
cd backend/django_Admin3
coverage run --source=orders.admin_views,orders.serializers.admin_order_serializer -m pytest orders/tests/test_admin_views.py orders/tests/test_admin_serializers.py
coverage report
```

Expected: ≥ 80% coverage on the two new modules.

- [ ] **Step 8: No commit** — this is the verification step. If everything passes, the feature is ready for review/merge.

---

## Self-Review Findings

**Spec coverage check:** All spec sections covered:
- §4.1 viewset → Task 4
- §4.2 filters → Task 5
- §4.3 serializers → Tasks 1, 2, 3
- §4.4 permissions → Task 4 (permission test)
- §4.5 performance → Task 5 (query-count regression)
- §5.1 file structure → Tasks 6–11
- §5.2 list page → Tasks 7, 8
- §5.3 ViewModel → Task 7
- §5.4 detail page → Tasks 9, 10
- §5.5 service & types → Task 6
- §6 test plan → Tasks 1–5, 7, 8, 10, 12

**Open items deferred:** Spec §7 open questions (`IsAdminUser` vs custom `IsSuperUser`, URL shape, contact cardinality, order numbering). The plan implements the spec defaults: `IsAdminUser`, `/api/orders/admin/`, `user_contact.first()`, `Order.id` as order number.

**Combobox limitation noted:** The product-code combobox is loaded from `/api/store/products/` and lists only `store.Product` codes. Voucher/fee item codes (which live in `store.GenericItem` / generic `Purchasable`) won't be selectable through the dropdown. Backend filter accepts any exact code via the `product_code` query param, so vouchers/fees can still be filtered by direct URL or by adding them to the option source in a follow-up.
