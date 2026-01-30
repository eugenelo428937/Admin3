"""Tests for utils/middleware.py - HealthCheckMiddleware.

Covers:
- process_request sets HTTP_X_FORWARDED_PROTO for health check endpoint
- process_request leaves other endpoints unchanged
- Middleware returns None (passes through)
"""
from django.test import TestCase, RequestFactory
from utils.middleware import HealthCheckMiddleware


class TestHealthCheckMiddleware(TestCase):
    """Test HealthCheckMiddleware.process_request behaviour."""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = HealthCheckMiddleware(get_response=lambda r: None)

    def test_UTL_middleware_sets_proto_for_health_endpoint(self):
        """GET /api/health/ should set HTTP_X_FORWARDED_PROTO to 'https'."""
        request = self.factory.get('/api/health/')
        result = self.middleware.process_request(request)
        self.assertIsNone(result)
        self.assertEqual(request.META.get('HTTP_X_FORWARDED_PROTO'), 'https')

    def test_UTL_middleware_does_not_alter_other_endpoints(self):
        """Requests to other paths should NOT set HTTP_X_FORWARDED_PROTO."""
        request = self.factory.get('/api/cart/')
        # Ensure the key is not already set
        request.META.pop('HTTP_X_FORWARDED_PROTO', None)
        result = self.middleware.process_request(request)
        self.assertIsNone(result)
        self.assertNotIn('HTTP_X_FORWARDED_PROTO', request.META)

    def test_UTL_middleware_returns_none(self):
        """process_request should always return None (pass-through)."""
        request = self.factory.get('/api/health/')
        result = self.middleware.process_request(request)
        self.assertIsNone(result)

    def test_UTL_middleware_non_health_path_variations(self):
        """Various non-health paths should not trigger the middleware."""
        non_health_paths = [
            '/api/store/products/',
            '/api/auth/login/',
            '/api/users/',
            '/api/healthcheck/',  # Close but not exact
            '/api/health',        # No trailing slash
            '/health/',           # Missing /api/ prefix
        ]
        for path in non_health_paths:
            request = self.factory.get(path)
            request.META.pop('HTTP_X_FORWARDED_PROTO', None)
            self.middleware.process_request(request)
            self.assertNotIn(
                'HTTP_X_FORWARDED_PROTO', request.META,
                f"Path {path} should NOT set HTTP_X_FORWARDED_PROTO"
            )

    def test_UTL_middleware_post_request_to_health(self):
        """POST /api/health/ should also set the proto header."""
        request = self.factory.post('/api/health/')
        result = self.middleware.process_request(request)
        self.assertIsNone(result)
        self.assertEqual(request.META.get('HTTP_X_FORWARDED_PROTO'), 'https')
