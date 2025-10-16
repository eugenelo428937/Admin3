"""
Custom middleware for Django Admin3 project
"""
from django.utils.deprecation import MiddlewareMixin


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware to handle health check requests without SSL redirect

    Railway's internal health check uses HTTP, but SECURE_SSL_REDIRECT=True
    redirects all HTTP requests to HTTPS. This middleware exempts the health
    check endpoint from SSL redirects to allow Railway's health checks to succeed.

    This middleware must be placed BEFORE SecurityMiddleware in MIDDLEWARE settings.
    """

    def process_request(self, request):
        """
        Disable SSL redirect for health check endpoint

        Sets request.META['HTTP_X_FORWARDED_PROTO'] = 'https' for health check
        requests to bypass Django's SECURE_SSL_REDIRECT middleware.
        """
        if request.path == '/api/health/':
            # Mark request as HTTPS to bypass SSL redirect
            request.META['HTTP_X_FORWARDED_PROTO'] = 'https'
        return None
