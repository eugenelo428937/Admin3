"""
Query Performance Monitoring Utilities
Phase 3: Database Performance Optimization

Provides utilities for monitoring database query performance in view methods.

Note: The QueryPerformanceMiddleware class was removed as it was not registered
in Django settings (dead code). Only the decorator and context manager remain.
"""

import logging
import time
from django.db import connections

logger = logging.getLogger('query_performance')


class DatabaseQueryLogger:
    """
    Utility class for logging database query performance in views.
    """
    
    def __init__(self, operation_name, logger_name='query_performance'):
        self.operation_name = operation_name
        self.logger = logging.getLogger(logger_name)
        self.start_time = None
        self.start_queries = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.start_queries = self._get_query_count()
        return self
    
    def __exit__(self, _exc_type, _exc_val, _exc_tb):
        if self.start_time is not None:
            duration = time.time() - self.start_time
            query_count = self._get_query_count() - self.start_queries
            
            log_level = logging.WARNING if duration > 0.2 else logging.INFO
            self.logger.log(
                log_level,
                f"{self.operation_name} - Duration: {duration:.3f}s, Queries: {query_count}"
            )
    
    def _get_query_count(self):
        """Get total number of database queries executed."""
        total = 0
        for connection in connections.all():
            if hasattr(connection, 'queries'):
                total += len(connection.queries)
        return total


def monitor_query_performance(operation_name):
    """
    Decorator for monitoring query performance in view methods.
    
    Usage:
    @monitor_query_performance('Product List Filtering')
    def list_products(self, request):
        # method implementation
    """
    def decorator(func):
        import functools
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            with DatabaseQueryLogger(operation_name):
                return func(*args, **kwargs)
        return wrapper
    return decorator