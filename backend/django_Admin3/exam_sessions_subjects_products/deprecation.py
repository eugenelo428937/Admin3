"""Deprecation utilities for legacy API endpoints.

This module provides mixins and utilities to mark legacy API endpoints
as deprecated using the Strangler Fig pattern. The legacy endpoints
continue to work but include deprecation headers in responses.

See IETF draft: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-deprecation-header
"""
import logging
from datetime import datetime
from functools import wraps
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Deprecation configuration
DEPRECATION_DATE = "2025-01-01"  # When the API was deprecated
SUNSET_DATE = "2025-06-01"  # When the API will be removed
NEW_API_BASE = "/api/store/"  # The new API location


class DeprecatedAPIMixin:
    """
    Mixin for ViewSets to add deprecation headers to all responses.

    This implements the Strangler Fig pattern - the legacy API continues
    to function but responses include headers indicating:
    - The API is deprecated
    - When it will be removed (Sunset date)
    - Where to find the new API

    Usage:
        class LegacyViewSet(DeprecatedAPIMixin, viewsets.ModelViewSet):
            deprecation_message = "Use /api/store/products/ instead"
            successor_url = "/api/store/products/"
    """

    deprecation_message = "This endpoint is deprecated. Please migrate to the new Store API."
    successor_url = NEW_API_BASE
    deprecation_date = DEPRECATION_DATE
    sunset_date = SUNSET_DATE

    def finalize_response(self, request, response, *args, **kwargs):
        """Add deprecation headers to all responses."""
        response = super().finalize_response(request, response, *args, **kwargs)

        # Add standard deprecation headers
        response['Deprecation'] = f'date="{self.deprecation_date}"'
        response['Sunset'] = self.sunset_date

        # Add Link header pointing to successor API
        if self.successor_url:
            response['Link'] = f'<{self.successor_url}>; rel="successor-version"'

        # Add custom warning header
        response['X-API-Deprecation-Warning'] = self.deprecation_message

        # Log deprecation usage (sampling to avoid log spam)
        import random
        if random.random() < 0.01:  # 1% sampling
            logger.warning(
                f"Deprecated API called: {request.path} - {self.deprecation_message}"
            )

        return response


def add_deprecation_notice(data, message=None, successor_url=None):
    """
    Add deprecation notice to response data.

    Args:
        data: The original response data (dict or list)
        message: Custom deprecation message
        successor_url: URL of the replacement API

    Returns:
        Modified data with deprecation notice
    """
    notice = {
        'deprecated': True,
        'deprecation_date': DEPRECATION_DATE,
        'sunset_date': SUNSET_DATE,
        'message': message or "This endpoint is deprecated. Please migrate to the new Store API.",
    }

    if successor_url:
        notice['successor_url'] = successor_url

    if isinstance(data, dict):
        data['_deprecation'] = notice
    elif isinstance(data, list):
        # Wrap list in object with deprecation notice
        data = {
            'results': data,
            '_deprecation': notice
        }

    return data


def deprecated_endpoint(message=None, successor_url=None):
    """
    Decorator to mark individual endpoints as deprecated.

    Adds deprecation headers and notice to the response.

    Usage:
        @action(detail=False, methods=['get'])
        @deprecated_endpoint(
            message="Use /api/store/products/ instead",
            successor_url="/api/store/products/"
        )
        def list_products(self, request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            response = func(self, request, *args, **kwargs)

            # Add deprecation headers
            response['Deprecation'] = f'date="{DEPRECATION_DATE}"'
            response['Sunset'] = SUNSET_DATE

            if successor_url:
                response['Link'] = f'<{successor_url}>; rel="successor-version"'

            msg = message or "This endpoint is deprecated."
            response['X-API-Deprecation-Warning'] = msg

            # Add deprecation notice to response data
            if hasattr(response, 'data') and response.data is not None:
                response.data = add_deprecation_notice(
                    response.data,
                    message=msg,
                    successor_url=successor_url
                )

            return response
        return wrapper
    return decorator
