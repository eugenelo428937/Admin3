#!/bin/bash
# Railway startup script - conditionally runs web or worker based on SERVICE_TYPE

set -e

if [ "$SERVICE_TYPE" = "worker" ]; then
    echo "Starting WORKER service..."
    exec python manage.py process_email_queue --continuous --interval 30
else
    echo "Starting WEB service..."
    python manage.py migrate --noinput
    python manage.py createcachetable
    exec gunicorn django_Admin3.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120
fi
