# backend/django_Admin3/waitress_server.py
import os
import logging
from waitress import serve
from django_Admin3.wsgi import application

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('C:\\logs\\admin3\\waitress.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

if __name__ == '__main__':
    logger.info("Starting Waitress WSGI server...")
    
    # Production configuration
    serve(
        application,
        host='127.0.0.1',
        port=8000,
        threads=10,
        max_request_body_size=10485760,  # 10MB
        connection_limit=1000,
        cleanup_interval=30,
        channel_timeout=120,
        log_socket_errors=True,
        ident='Admin3-Waitress'
    )