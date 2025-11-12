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
fi
