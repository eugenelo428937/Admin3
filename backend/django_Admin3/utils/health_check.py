"""
Health check endpoint for Railway deployment monitoring
"""
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import sys


def health_check(request):
    """
    Health check endpoint for Railway
    Checks database connectivity and returns system status

    Returns 200 OK even if database is not ready yet to allow Railway
    deployment to succeed. Database status is included in response for monitoring.
    """
    health_status = {
        "status": "healthy",
        "checks": {}
    }
    # Always return 200 OK to pass Railway health check
    http_status = 200

    # Check database connection (non-blocking)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row[0] == 1:
                health_status["checks"]["database"] = "connected"
            else:
                health_status["checks"]["database"] = "error"
                health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["database"] = f"not_ready: {str(e)}"
        health_status["status"] = "starting"

    # Add system information
    health_status["environment"] = getattr(settings, 'DJANGO_ENV', 'unknown')
    health_status["debug"] = settings.DEBUG
    health_status["python_version"] = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    return JsonResponse(health_status, status=http_status)
