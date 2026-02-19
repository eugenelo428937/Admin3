"""Session setup views for the copy/create endpoint.

Endpoint: POST /api/catalog/session-setup/copy-products/
Permission: IsSuperUser
"""
import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from catalog.permissions import IsSuperUser
from catalog.serializers.session_setup_serializers import (
    CopyProductsRequestSerializer,
    CopyProductsResponseSerializer,
    SessionDataCountsSerializer,
    DeactivateSessionRequestSerializer,
    DeactivateSessionResponseSerializer,
)
from catalog.services.session_setup_service import SessionSetupService

logger = logging.getLogger(__name__)


class SessionSetupViewSet(viewsets.ViewSet):
    """ViewSet for session setup operations."""

    permission_classes = [IsSuperUser]

    @action(detail=False, methods=['post'], url_path='copy-products')
    def copy_products(self, request):
        """Copy products, prices, and create bundles from previous session."""
        serializer = CopyProductsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_session_id = serializer.validated_data['new_exam_session_id']
        previous_session_id = serializer.validated_data['previous_exam_session_id']

        try:
            result = SessionSetupService.copy_products_and_bundles(
                new_session_id, previous_session_id
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Copy operation failed: {e}", exc_info=True)
            return Response(
                {
                    'error': (
                        f"Copy operation failed: {e}. "
                        "All changes have been rolled back. "
                        "You may retry the operation."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Build user-friendly message
        from catalog.models import ExamSession
        new_session = ExamSession.objects.get(id=new_session_id)
        result['message'] = (
            f"Successfully created {result['products_created']} products, "
            f"{result['prices_created']} prices, "
            f"and {result['bundles_created']} bundles "
            f"for session {new_session.session_code}."
        )

        response_serializer = CopyProductsResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'],
            url_path=r'session-data-counts/(?P<session_id>[0-9]+)')
    def session_data_counts(self, request, session_id=None):
        """Check if a session has existing data (ESS, products, bundles)."""
        counts = SessionSetupService.get_session_data_counts(int(session_id))
        serializer = SessionDataCountsSerializer(counts)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='deactivate-session-data')
    def deactivate_session_data(self, request):
        """Deactivate all ESS, products, prices, bundles, bundle products for a session."""
        serializer = DeactivateSessionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['exam_session_id']

        try:
            result = SessionSetupService.deactivate_session_data(session_id)
        except Exception as e:
            logger.error(f"Deactivation failed: {e}", exc_info=True)
            return Response(
                {'error': f"Deactivation failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_serializer = DeactivateSessionResponseSerializer(result)
        return Response(response_serializer.data)
