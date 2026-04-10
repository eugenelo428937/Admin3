"""Student admin views for the admin panel.

Provides list with multi-field search across:
- student_ref
- auth_user first_name / last_name (via hash)
- user_profile_email (via hash)
- user_profile_contact_number (via hash)
- user_profile_address (address_data JSON — not hashed, kept as-is)

Search inputs are hashed and matched against stored hashes so that
real names/emails can find anonymised records.
"""

from django.db.models import Q
from rest_framework import viewsets, mixins
from rest_framework.pagination import PageNumberPagination

from catalog.permissions import IsSuperUser
from userprofile.hash_utils import compute_search_hash
from .models import Student
from .admin_serializers import StudentAdminListSerializer


class StudentAdminPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class StudentAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only admin ViewSet for students with multi-field search.

    Query params:
        search      — searches across all fields (ref, name, email, phone, address)
        ref         — exact match on student_ref
        name        — hashed match on first_name_hash / last_name_hash,
                      also falls back to icontains on anonymised display name
        email       — hashed match on email_hash,
                      also falls back to icontains on anonymised email
        phone       — hashed match on number_hash,
                      also falls back to icontains on anonymised number
        address     — icontains on address_data JSON (not hashed)
    """

    serializer_class = StudentAdminListSerializer
    permission_classes = [IsSuperUser]
    pagination_class = StudentAdminPagination

    def get_queryset(self):
        qs = (
            Student.objects
            .select_related('user', 'user__userprofile')
            .prefetch_related(
                'user__userprofile__emails',
                'user__userprofile__contact_numbers',
                'user__userprofile__addresses',
            )
            .order_by('student_ref')
        )

        params = self.request.query_params

        # Global search — match ANY field
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(self._build_global_q(search))
            return qs.distinct()

        # Field-specific filters (combined with AND)
        ref = params.get('ref', '').strip()
        if ref:
            if ref.isdigit():
                qs = qs.filter(student_ref=int(ref))
            else:
                qs = qs.filter(student_ref__icontains=ref)

        name = params.get('name', '').strip()
        if name:
            name_hash = compute_search_hash(name)
            qs = qs.filter(
                Q(user__userprofile__first_name_hash=name_hash)
                | Q(user__userprofile__last_name_hash=name_hash)
                | Q(user__first_name__icontains=name)
                | Q(user__last_name__icontains=name)
            )

        email = params.get('email', '').strip()
        if email:
            email_hash = compute_search_hash(email)
            qs = qs.filter(
                Q(user__userprofile__emails__email_hash=email_hash)
                | Q(user__userprofile__emails__email__icontains=email)
            )

        phone = params.get('phone', '').strip()
        if phone:
            phone_hash = compute_search_hash(phone)
            qs = qs.filter(
                Q(user__userprofile__contact_numbers__number_hash=phone_hash)
                | Q(user__userprofile__contact_numbers__number__icontains=phone)
            )

        address = params.get('address', '').strip()
        if address:
            qs = qs.filter(
                Q(user__userprofile__addresses__address_data__icontains=address)
                | Q(user__userprofile__addresses__country__icontains=address)
            )

        return qs.distinct()

    def _build_global_q(self, search):
        """Build a Q filter that matches search term across all fields."""
        search_hash = compute_search_hash(search)

        q = (
            # Hash matches (real values)
            Q(user__userprofile__first_name_hash=search_hash)
            | Q(user__userprofile__last_name_hash=search_hash)
            | Q(user__userprofile__emails__email_hash=search_hash)
            | Q(user__userprofile__contact_numbers__number_hash=search_hash)
            # Fallback: icontains on anonymised display values
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(user__userprofile__emails__email__icontains=search)
            | Q(user__userprofile__contact_numbers__number__icontains=search)
            # Address (not hashed)
            | Q(user__userprofile__addresses__address_data__icontains=search)
            | Q(user__userprofile__addresses__country__icontains=search)
        )
        # If the search looks like a number, also try student_ref
        if search.isdigit():
            q = q | Q(student_ref=int(search))
        return q
