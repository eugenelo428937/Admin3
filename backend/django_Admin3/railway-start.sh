#!/bin/bash
# Railway startup script - conditionally runs web or worker based on SERVICE_TYPE
set -e
echo "Starting WEB service..."
python manage.py migrate --noinput
python manage.py createcachetable


