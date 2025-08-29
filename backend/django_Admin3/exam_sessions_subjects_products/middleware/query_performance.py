"""
Query Performance Monitoring Middleware
Phase 3: Database Performance Optimization

Monitors database query performance for filtering operations and logs slow queries.
"""

import logging
import time
from django.conf import settings
from django.db import connections
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('query_performance')


class QueryPerformanceMiddleware(MiddlewareMixin):
    """
    Middleware to monitor database query performance for filtering endpoints.
    Logs slow queries and provides performance metrics.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.slow_query_threshold = getattr(settings, 'SLOW_QUERY_THRESHOLD', 0.2)  # 200ms default
        self.monitored_endpoints = [
            '/api/products/list',
            '/api/products/unified-search',
            '/api/products/fuzzy-search',
            '/api/products/advanced-fuzzy-search'
        ]

    def process_request(self, request):
        """Reset query logging at the start of each request."""
        if self._should_monitor(request):
            request._query_start_time = time.time()
            request._initial_queries = self._get_query_count()
    
    def process_response(self, request, response):
        """Log query performance metrics after request processing."""
        if self._should_monitor(request) and hasattr(request, '_query_start_time'):
            total_time = time.time() - request._query_start_time
            total_queries = self._get_query_count() - request._initial_queries
            
            # Log performance metrics
            self._log_performance_metrics(request, total_time, total_queries)
            
            # Check for slow queries
            if total_time > self.slow_query_threshold:
                self._log_slow_request(request, total_time, total_queries)
            
            # Add performance headers in debug mode
            if settings.DEBUG:
                response['X-DB-Queries'] = str(total_queries)
                response['X-DB-Time'] = f"{total_time:.3f}s"
        
        return response
    
    def _should_monitor(self, request):
        """Determine if this request should be monitored."""
        return any(endpoint in request.path for endpoint in self.monitored_endpoints)
    
    def _get_query_count(self):
        """Get total number of database queries executed."""
        total = 0
        for connection in connections.all():
            if hasattr(connection, 'queries'):
                total += len(connection.queries)
        return total
    
    def _log_performance_metrics(self, request, total_time, total_queries):
        """Log standard performance metrics."""
        logger.info(
            f"Query Performance - {request.method} {request.path} - "
            f"Time: {total_time:.3f}s, Queries: {total_queries}, "
            f"Params: {dict(request.GET)}"
        )
    
    def _log_slow_request(self, request, total_time, total_queries):
        """Log detailed information about slow requests."""
        logger.warning(
            f"SLOW QUERY DETECTED - {request.method} {request.path} - "
            f"Time: {total_time:.3f}s (threshold: {self.slow_query_threshold}s), "
            f"Queries: {total_queries}, "
            f"Params: {dict(request.GET)}, "
            f"User: {getattr(request.user, 'id', 'Anonymous')}"
        )
        
        # Log individual queries if in debug mode
        if settings.DEBUG and hasattr(connections['default'], 'queries'):
            queries = connections['default'].queries[-total_queries:] if total_queries > 0 else []
            for i, query in enumerate(queries, 1):
                query_time = float(query.get('time', 0))
                if query_time > 0.1:  # Log queries taking more than 100ms
                    logger.warning(
                        f"SLOW INDIVIDUAL QUERY {i}/{total_queries} - "
                        f"Time: {query_time:.3f}s - "
                        f"SQL: {query['sql'][:200]}..."
                    )


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
    
    def __exit__(self, exc_type, exc_val, exc_tb):
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