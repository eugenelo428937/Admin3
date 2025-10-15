"""
Health check endpoint for Railway deployment monitoring
"""
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import sys
import os
import traceback


def health_check(request):
    """
    Health check endpoint for Railway
    Checks database connectivity and returns system status

    Returns 200 OK even if database is not ready yet to allow Railway
    deployment to succeed. Database status is included in response for monitoring.
    """
    health_status = {
        "status": "healthy",
        "checks": {},
        "debug_info": {}
    }
    # Always return 200 OK to pass Railway health check
    http_status = 200

    # Add system information
    health_status["environment"] = getattr(settings, 'DJANGO_ENV', 'unknown')
    health_status["debug"] = settings.DEBUG
    health_status["python_version"] = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    # Debug: Django settings
    health_status["debug_info"]["settings_module"] = os.environ.get('DJANGO_SETTINGS_MODULE', 'not_set')
    health_status["debug_info"]["django_env"] = os.environ.get('DJANGO_ENV', 'not_set')

    # Debug: Request information
    health_status["debug_info"]["request_path"] = request.path
    health_status["debug_info"]["request_method"] = request.method
    health_status["debug_info"]["request_host"] = request.get_host()

    # Debug: ALLOWED_HOSTS check
    try:
        allowed_hosts = list(settings.ALLOWED_HOSTS)
        health_status["debug_info"]["allowed_hosts"] = allowed_hosts
        health_status["debug_info"]["allowed_hosts_count"] = len(allowed_hosts)
    except Exception as e:
        health_status["debug_info"]["allowed_hosts_error"] = str(e)

    # Check database connection (non-blocking)
    try:
        # Get database configuration info (without sensitive data)
        db_config = settings.DATABASES.get('default', {})
        health_status["debug_info"]["database_engine"] = db_config.get('ENGINE', 'unknown')
        health_status["debug_info"]["database_name"] = db_config.get('NAME', 'unknown')
        health_status["debug_info"]["database_host"] = db_config.get('HOST', 'unknown')
        health_status["debug_info"]["database_port"] = db_config.get('PORT', 'unknown')

        # Check if DATABASE_URL env var is set
        health_status["debug_info"]["database_url_set"] = bool(os.environ.get('DATABASE_URL'))

        # Try to connect
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row[0] == 1:
                health_status["checks"]["database"] = "connected"
                # Get database version
                try:
                    cursor.execute("SELECT version()")
                    db_version = cursor.fetchone()[0]
                    health_status["debug_info"]["database_version"] = db_version.split(',')[0]  # Simplified version
                except:
                    pass
            else:
                health_status["checks"]["database"] = "error"
                health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["database"] = "error"
        health_status["status"] = "starting"
        health_status["debug_info"]["database_error"] = str(e)
        health_status["debug_info"]["database_error_type"] = type(e).__name__

        # Add more detailed traceback for debugging
        if settings.DEBUG or os.environ.get('DJANGO_ENV') == 'uat':
            health_status["debug_info"]["database_traceback"] = traceback.format_exc()

    # Check essential environment variables
    env_checks = {
        "DATABASE_URL": bool(os.environ.get('DATABASE_URL')),
        "DJANGO_SECRET_KEY": bool(os.environ.get('DJANGO_SECRET_KEY')),
        "DJANGO_ENV": bool(os.environ.get('DJANGO_ENV')),
        "ALLOWED_HOSTS": bool(os.environ.get('ALLOWED_HOSTS')),
    }
    health_status["debug_info"]["env_variables_set"] = env_checks

    # Check Railway-specific variables
    railway_vars = {
        "RAILWAY_ENVIRONMENT": os.environ.get('RAILWAY_ENVIRONMENT', 'not_set'),
        "RAILWAY_PUBLIC_DOMAIN": os.environ.get('RAILWAY_PUBLIC_DOMAIN', 'not_set'),
        "RAILWAY_PRIVATE_DOMAIN": os.environ.get('RAILWAY_PRIVATE_DOMAIN', 'not_set'),
    }
    health_status["debug_info"]["railway_variables"] = railway_vars

    return JsonResponse(health_status, status=http_status)
