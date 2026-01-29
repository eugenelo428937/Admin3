"""
Introspect Django URL patterns to discover all API endpoints,
then cross-reference with test files to identify untested endpoints.
"""
import re
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.routers import SimpleRouter
from rest_framework.viewsets import ViewSetMixin
from rest_framework.decorators import action

from .test_file_scanner import TestFileScanner


# Standard HTTP methods for ViewSet actions
VIEWSET_ACTION_METHODS = {
    'list': ['GET'],
    'create': ['POST'],
    'retrieve': ['GET'],
    'update': ['PUT'],
    'partial_update': ['PATCH'],
    'destroy': ['DELETE'],
}


class EndpointAuditor:
    """Discover all URL endpoints and check test coverage."""

    def __init__(self, scanner=None):
        self.scanner = scanner or TestFileScanner()

    def audit(self, app_filter=None):
        """Run the endpoint audit.

        Args:
            app_filter: Optional app name to filter (e.g., 'store')

        Returns:
            dict with 'endpoints', 'tested', 'untested', 'summary'
        """
        # Step 1: Discover all endpoints
        endpoints = self._discover_endpoints()

        # Step 2: Filter by app if requested
        if app_filter:
            endpoints = [ep for ep in endpoints if ep.get('app') == app_filter]

        # Step 3: Scan test files
        test_refs = self.scanner.scan_for_endpoints(app_filter)

        # Step 4: Cross-reference
        tested = []
        untested = []

        for ep in endpoints:
            is_tested = self._is_endpoint_tested(ep, test_refs)
            ep['tested'] = is_tested
            if is_tested:
                tested.append(ep)
            else:
                untested.append(ep)

        # Build summary by app
        app_summary = {}
        for ep in endpoints:
            app = ep.get('app', 'unknown')
            if app not in app_summary:
                app_summary[app] = {'total': 0, 'tested': 0, 'untested': 0}
            app_summary[app]['total'] += 1
            if ep['tested']:
                app_summary[app]['tested'] += 1
            else:
                app_summary[app]['untested'] += 1

        return {
            'endpoints': endpoints,
            'tested': tested,
            'untested': untested,
            'summary': {
                'total': len(endpoints),
                'tested_count': len(tested),
                'untested_count': len(untested),
                'coverage_pct': round(len(tested) / max(len(endpoints), 1) * 100, 1),
                'by_app': app_summary,
            }
        }

    def _discover_endpoints(self):
        """Walk the URL resolver tree and discover all API endpoints."""
        resolver = get_resolver()
        endpoints = []
        self._walk_patterns(resolver.url_patterns, prefix='/', endpoints=endpoints)
        return endpoints

    def _walk_patterns(self, patterns, prefix, endpoints, namespace=None):
        """Recursively walk URL patterns."""
        for pattern in patterns:
            if isinstance(pattern, URLResolver):
                # Nested resolver (include())
                new_prefix = prefix + self._pattern_to_path(pattern.pattern)
                new_ns = pattern.namespace or namespace
                self._walk_patterns(
                    pattern.url_patterns,
                    prefix=new_prefix,
                    endpoints=endpoints,
                    namespace=new_ns
                )
            elif isinstance(pattern, URLPattern):
                path = prefix + self._pattern_to_path(pattern.pattern)
                endpoint_info = self._extract_endpoint_info(pattern, path, namespace)
                if endpoint_info:
                    endpoints.append(endpoint_info)

    def _pattern_to_path(self, pattern):
        """Convert a URL pattern to a readable path string."""
        # RoutePattern (path()) or RegexPattern (re_path())
        path_str = str(pattern)
        # Replace Django path converters with placeholders
        path_str = re.sub(r'<(\w+:)?(\w+)>', r'{\2}', path_str)
        # Remove regex artifacts
        path_str = path_str.replace('^', '').replace('$', '')
        return path_str

    def _extract_endpoint_info(self, pattern, path, namespace):
        """Extract information about an endpoint."""
        # Skip admin, docs, and non-API paths
        if not path.startswith('/api/') and path != '/api/health/':
            return None

        # Skip DRF format-suffix URLs (auto-generated .json/.api variants)
        # and any paths containing raw regex syntax from re_path/RegexPattern
        if '(?P' in path or '.(?P' in path:
            return None

        # Skip DRF API root views (auto-generated endpoint listing pages)
        # These match patterns like /api/rules/ or /api/store/ with {format} suffix
        if '{format}' in path:
            return None

        # Skip DRF API root views (DefaultRouter generates 'api-root' named pattern)
        if pattern.name and 'api-root' in pattern.name:
            return None

        callback = pattern.callback
        if callback is None:
            return None

        # Determine the view class/function
        view_name = self._get_view_name(callback)
        app = self._detect_app(path, callback, namespace)
        methods = self._get_http_methods(callback, pattern)
        action_name = self._get_action_name(callback, pattern)

        return {
            'path': path,
            'methods': methods,
            'view': view_name,
            'app': app,
            'name': pattern.name or '',
            'namespace': namespace or '',
            'action': action_name,
        }

    def _get_view_name(self, callback):
        """Get a readable name for the view."""
        if hasattr(callback, 'cls'):
            return f"{callback.cls.__module__}.{callback.cls.__name__}"
        if hasattr(callback, 'view_class'):
            return f"{callback.view_class.__module__}.{callback.view_class.__name__}"
        if hasattr(callback, '__name__'):
            module = getattr(callback, '__module__', '')
            return f"{module}.{callback.__name__}"
        return str(callback)

    def _detect_app(self, path, callback, namespace):
        """Detect which app an endpoint belongs to."""
        # Try namespace first
        if namespace:
            return namespace.split(':')[0]

        # Try extracting from URL path
        path_app_map = {
            '/api/auth/': 'core_auth',
            '/api/users/': 'users',
            '/api/students/': 'students',
            '/api/products/': 'filtering',
            '/api/cart/': 'cart',
            '/api/orders/': 'orders',
            '/api/rules/': 'rules_engine',
            '/api/utils/': 'utils',
            '/api/countries/': 'misc',
            '/api/markings/': 'marking',
            '/api/marking-vouchers/': 'marking_vouchers',
            '/api/tutorials/': 'tutorials',
            '/api/catalog/': 'catalog',
            '/api/search/': 'search',
            '/api/store/': 'store',
            '/api/health/': 'utils',
        }
        for prefix, app_name in path_app_map.items():
            if path.startswith(prefix):
                return app_name

        # Fall back to module name
        if hasattr(callback, 'cls'):
            return callback.cls.__module__.split('.')[0]
        if hasattr(callback, '__module__'):
            return callback.__module__.split('.')[0]

        return 'unknown'

    def _get_http_methods(self, callback, pattern):
        """Determine allowed HTTP methods for an endpoint."""
        methods = []

        # ViewSet actions via initkwargs
        if hasattr(callback, 'initkwargs'):
            actions = callback.initkwargs.get('actions', {})
            if actions:
                methods = [m.upper() for m in actions.keys()]
                return sorted(set(methods))

        # Check cls for allowed methods
        if hasattr(callback, 'cls'):
            cls = callback.cls
            if hasattr(cls, 'http_method_names'):
                # Filter to actually implemented methods
                for method in cls.http_method_names:
                    if method.upper() in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'):
                        handler = method.lower()
                        if hasattr(cls, handler) and handler != 'options':
                            methods.append(method.upper())

        # view_class (CBV)
        if hasattr(callback, 'view_class'):
            cls = callback.view_class
            for method in ('get', 'post', 'put', 'patch', 'delete'):
                if hasattr(cls, method):
                    methods.append(method.upper())

        # Function-based views - check decorators
        if not methods:
            if hasattr(callback, 'initkwargs'):
                http_method_names = callback.initkwargs.get('http_method_names', None)
                if http_method_names:
                    methods = [m.upper() for m in http_method_names if m != 'options']

        # Default to GET if we can't determine
        if not methods:
            methods = ['GET']

        return sorted(set(methods))

    def _get_action_name(self, callback, pattern):
        """Get the ViewSet action name if applicable."""
        if hasattr(callback, 'initkwargs'):
            actions = callback.initkwargs.get('actions', {})
            if actions:
                # Return the most specific action name
                action_names = list(actions.values())
                return action_names[0] if action_names else ''
        return ''

    def _is_endpoint_tested(self, endpoint, test_refs):
        """Check if an endpoint has test coverage."""
        path = endpoint['path']
        name = endpoint.get('name', '')
        namespace = endpoint.get('namespace', '')

        url_refs = test_refs['url_references']
        reverse_refs = test_refs['reverse_references']

        # Check 1: Direct URL match
        normalized_path = path.replace('{id}', '{id}').replace('{pk}', '{id}')
        for tested_url in url_refs:
            if self._paths_match(normalized_path, tested_url):
                return True

        # Check 2: reverse() name match
        if name:
            full_name = f"{namespace}:{name}" if namespace else name
            if full_name in reverse_refs or name in reverse_refs:
                return True

            # Check without namespace prefix
            for ref_name in reverse_refs:
                if ref_name.endswith(name) or name.endswith(ref_name):
                    return True

        return False

    def _paths_match(self, endpoint_path, test_path):
        """Check if an endpoint path matches a test URL reference."""
        # Normalize both paths
        ep = self._normalize_path(endpoint_path)
        tp = self._normalize_path(test_path)

        if ep == tp:
            return True

        # Try matching with ID placeholders
        # Escape regex-special chars first, then replace placeholders
        ep_escaped = re.escape(ep)
        ep_pattern = re.sub(r'\\{[^}]+\\}', r'[^/]+', ep_escaped)
        try:
            if re.fullmatch(ep_pattern, tp):
                return True
        except re.PatternError:
            pass

        return False

    def _normalize_path(self, path):
        """Normalize a path for comparison."""
        # Remove query strings
        path = path.split('?')[0]
        # Replace numeric IDs
        path = re.sub(r'/\d+/', '/{id}/', path)
        # Ensure trailing slash
        if not path.endswith('/'):
            path += '/'
        return path.lower()
