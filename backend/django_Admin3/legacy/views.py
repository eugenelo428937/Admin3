"""Views for the legacy product archive search API.

Provides a read-only search endpoint for historical product data
imported from the legacy CSV exports. Supports text search,
filtering by subject/session/format, and pagination.

Endpoint:
    GET /api/legacy/products/?q=<text>&subject=<code>&session=<code>&format=<P|C|M|T>
"""
from rest_framework import generics, filters
from rest_framework.permissions import AllowAny
from django.db.models import Q

from .models import LegacyProduct
from .serializers import LegacyProductSerializer


class LegacyProductSearchView(generics.ListAPIView):
    """Search and filter legacy products.

    Query parameters:
        q       — text search across normalized_name and legacy_product_name
        subject — filter by subject_code (exact match)
        session — filter by session_code (exact match)
        delivery — filter by delivery_format (P/C/M/T)

    Results are paginated (default 20, max 100) and ordered by
    subject_code, session_code.
    """

    serializer_class = LegacyProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LegacyProduct.objects.all()
        params = self.request.query_params

        # Text search
        q = params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(normalized_name__icontains=q)
                | Q(legacy_product_name__icontains=q)
                | Q(full_code__icontains=q)
            )

        # Exact filters
        subject = params.get('subject', '').strip()
        if subject:
            qs = qs.filter(subject_code=subject)

        session = params.get('session', '').strip()
        if session:
            qs = qs.filter(session_code=session)

        fmt = params.get('delivery', '').strip()
        if fmt:
            qs = qs.filter(delivery_format=fmt)

        return qs.order_by('subject_code', 'session_code', 'normalized_name')
