"""Admin views for the legacy order archive.

Read-only list endpoint with search/filter support for the admin portal.
Resolves student names and emails via subquery annotations from
acted.students → auth_user.
"""
from rest_framework import mixins, viewsets
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from catalog.permissions import IsSuperUser
from students.models import Student
from .models import LegacyOrder
from .admin_serializers import LegacyOrderSerializer


class LegacyOrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class LegacyOrderAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only admin viewset for legacy orders.

    Annotates student first_name, last_name, email from the
    acted.students → auth_user join using subqueries.

    Query parameters:
        ref         — exact match on student_ref
        name        — icontains on first_name or last_name
        email       — icontains on email
        session     — filter by order items' product session_code
        subject     — filter by order items' product subject_code
        date_from   — order_date >= date
        date_to     — order_date <= date
        product     — filter by order items' product id
        ordering    — sort field (prefix with - for descending)
    """

    serializer_class = LegacyOrderSerializer
    permission_classes = [IsSuperUser]
    pagination_class = LegacyOrderPagination

    ALLOWED_ORDERING = {
        'student_ref', '-student_ref',
        'first_name', '-first_name',
        'last_name', '-last_name',
        'email', '-email',
        'order_date', '-order_date',
        'delivery_pref', '-delivery_pref',
    }

    def get_queryset(self):
        # Subquery: Student.student_ref → Student.user → User fields
        student_sub = Student.objects.filter(
            student_ref=OuterRef('student_ref'),
        )

        qs = LegacyOrder.objects.annotate(
            first_name=Coalesce(
                Subquery(student_sub.values('user__first_name')[:1]),
                Value(''),
            ),
            last_name=Coalesce(
                Subquery(student_sub.values('user__last_name')[:1]),
                Value(''),
            ),
            email=Coalesce(
                Subquery(student_sub.values('user__email')[:1]),
                Value(''),
            ),
        ).prefetch_related('items__product')

        params = self.request.query_params

        # --- Filters ---
        ref = params.get('ref', '').strip()
        if ref:
            qs = qs.filter(student_ref=ref)

        name = params.get('name', '').strip()
        if name:
            qs = qs.filter(
                Q(first_name__icontains=name)
                | Q(last_name__icontains=name)
            )

        email = params.get('email', '').strip()
        if email:
            qs = qs.filter(email__icontains=email)

        session = params.get('session', '').strip()
        if session:
            qs = qs.filter(items__product__session_code=session).distinct()

        subject = params.get('subject', '').strip()
        if subject:
            qs = qs.filter(items__product__subject_code=subject).distinct()

        date_from = params.get('date_from', '').strip()
        if date_from:
            qs = qs.filter(order_date__gte=date_from)

        date_to = params.get('date_to', '').strip()
        if date_to:
            qs = qs.filter(order_date__lte=date_to)

        product = params.get('product', '').strip()
        if product:
            qs = qs.filter(items__product_id=product).distinct()

        # --- Ordering ---
        ordering = params.get('ordering', '').strip()
        if ordering and ordering in self.ALLOWED_ORDERING:
            return qs.order_by(ordering)

        return qs.order_by('-order_date', 'student_ref')
