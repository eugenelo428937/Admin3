"""Tests for the EndpointAuditor module."""
from django.test import TestCase
from unittest.mock import patch, MagicMock

from utils.audit.endpoint_auditor import EndpointAuditor


class TestEndpointDiscovery(TestCase):
    """Test that EndpointAuditor discovers URL endpoints correctly."""

    def setUp(self):
        self.auditor = EndpointAuditor()

    def test_discovers_api_endpoints(self):
        """Should find all /api/ prefixed endpoints."""
        endpoints = self.auditor._discover_endpoints()
        # Should find at least some endpoints
        self.assertGreater(len(endpoints), 0)
        # All endpoints should start with /api/
        for ep in endpoints:
            self.assertTrue(
                ep['path'].startswith('/api/'),
                f"Endpoint {ep['path']} should start with /api/"
            )

    def test_discovers_cart_endpoints(self):
        """Should find cart endpoints from router-registered ViewSet."""
        endpoints = self.auditor._discover_endpoints()
        cart_paths = [ep['path'] for ep in endpoints if ep['app'] == 'cart']
        self.assertGreater(len(cart_paths), 0, "Should find cart endpoints")

    def test_discovers_catalog_function_views(self):
        """Should find function-based views in catalog app."""
        endpoints = self.auditor._discover_endpoints()
        catalog_paths = [ep['path'] for ep in endpoints if ep['app'] == 'catalog']
        # Should find navigation-data and search function views
        path_strs = [ep['path'] for ep in endpoints if 'catalog' in ep['path']]
        nav_found = any('navigation-data' in p for p in path_strs)
        search_found = any('search' in p for p in path_strs)
        self.assertTrue(nav_found, "Should find navigation-data endpoint")
        self.assertTrue(search_found, "Should find search endpoint")

    def test_discovers_store_viewset_endpoints(self):
        """Should find store ViewSet endpoints including custom actions."""
        endpoints = self.auditor._discover_endpoints()
        store_paths = [ep['path'] for ep in endpoints if ep['app'] == 'store']
        self.assertGreater(len(store_paths), 0, "Should find store endpoints")
        # Should find both list and detail endpoints
        store_path_strs = [ep['path'] for ep in endpoints if 'store' in ep['path']]
        has_list = any('products' in p and '{' not in p for p in store_path_strs)
        self.assertTrue(has_list, "Should find store products list endpoint")

    def test_endpoint_has_required_fields(self):
        """Each endpoint should have path, methods, view, app."""
        endpoints = self.auditor._discover_endpoints()
        for ep in endpoints[:5]:  # Check first 5
            self.assertIn('path', ep)
            self.assertIn('methods', ep)
            self.assertIn('view', ep)
            self.assertIn('app', ep)
            self.assertIsInstance(ep['methods'], list)

    def test_endpoint_methods_are_uppercase(self):
        """HTTP methods should be uppercase."""
        endpoints = self.auditor._discover_endpoints()
        for ep in endpoints[:10]:
            for method in ep['methods']:
                self.assertEqual(method, method.upper(),
                                 f"Method {method} should be uppercase")

    def test_detects_app_from_path(self):
        """Should correctly detect app from URL path prefix."""
        auditor = self.auditor
        self.assertEqual(auditor._detect_app('/api/cart/', None, None), 'cart')
        self.assertEqual(auditor._detect_app('/api/store/products/', None, None), 'store')
        self.assertEqual(auditor._detect_app('/api/catalog/subjects/', None, None), 'catalog')
        self.assertEqual(auditor._detect_app('/api/auth/login/', None, None), 'core_auth')
        self.assertEqual(auditor._detect_app('/api/health/', None, None), 'utils')


class TestEndpointAudit(TestCase):
    """Test the full audit flow with cross-referencing."""

    def test_audit_returns_expected_structure(self):
        """Audit result should have endpoints, tested, untested, summary."""
        auditor = EndpointAuditor()
        result = auditor.audit()
        self.assertIn('endpoints', result)
        self.assertIn('tested', result)
        self.assertIn('untested', result)
        self.assertIn('summary', result)

    def test_audit_summary_has_counts(self):
        """Summary should have total, tested_count, untested_count, coverage_pct."""
        auditor = EndpointAuditor()
        result = auditor.audit()
        summary = result['summary']
        self.assertIn('total', summary)
        self.assertIn('tested_count', summary)
        self.assertIn('untested_count', summary)
        self.assertIn('coverage_pct', summary)
        self.assertEqual(summary['total'], summary['tested_count'] + summary['untested_count'])

    def test_audit_with_app_filter(self):
        """Filtering by app should reduce results."""
        auditor = EndpointAuditor()
        all_result = auditor.audit()
        filtered_result = auditor.audit(app_filter='cart')
        self.assertLessEqual(
            len(filtered_result['endpoints']),
            len(all_result['endpoints'])
        )
        for ep in filtered_result['endpoints']:
            self.assertEqual(ep['app'], 'cart')

    def test_audit_summary_has_by_app(self):
        """Summary should include per-app breakdown."""
        auditor = EndpointAuditor()
        result = auditor.audit()
        summary = result['summary']
        self.assertIn('by_app', summary)
        self.assertIsInstance(summary['by_app'], dict)

    def test_paths_match_exact(self):
        """Exact path matching should work."""
        auditor = EndpointAuditor()
        self.assertTrue(auditor._paths_match('/api/cart/', '/api/cart/'))
        self.assertFalse(auditor._paths_match('/api/cart/', '/api/store/'))

    def test_paths_match_with_id_placeholder(self):
        """Path matching should handle {id} vs numeric IDs."""
        auditor = EndpointAuditor()
        self.assertTrue(auditor._paths_match('/api/store/products/{pk}/', '/api/store/products/{id}/'))


class TestEndpointAuditorHelpers(TestCase):
    """Test EndpointAuditor internal helper methods."""

    def setUp(self):
        self.auditor = EndpointAuditor()

    # --- _get_view_name ---

    def test_UTL_get_view_name_with_cls(self):
        """Should return module.ClassName when callback has .cls."""
        callback = MagicMock()
        callback.cls.__module__ = 'cart.views'
        callback.cls.__name__ = 'CartViewSet'
        del callback.view_class  # Ensure cls branch is taken
        result = self.auditor._get_view_name(callback)
        self.assertEqual(result, 'cart.views.CartViewSet')

    def test_UTL_get_view_name_with_view_class(self):
        """Should return module.ClassName when callback has .view_class."""
        callback = MagicMock(spec=[])
        callback.view_class = MagicMock()
        callback.view_class.__module__ = 'store.views'
        callback.view_class.__name__ = 'ProductView'
        result = self.auditor._get_view_name(callback)
        self.assertEqual(result, 'store.views.ProductView')

    def test_UTL_get_view_name_with_function(self):
        """Should return module.func_name for function views."""
        def utl_my_view(request):
            pass
        result = self.auditor._get_view_name(utl_my_view)
        self.assertIn('utl_my_view', result)

    def test_UTL_get_view_name_fallback(self):
        """Should return str(callback) as fallback."""
        callback = object()
        result = self.auditor._get_view_name(callback)
        self.assertIsInstance(result, str)

    # --- _detect_app ---

    def test_UTL_detect_app_from_namespace(self):
        """Should use namespace as app name."""
        result = self.auditor._detect_app('/api/unknown/', None, 'my_namespace')
        self.assertEqual(result, 'my_namespace')

    def test_UTL_detect_app_from_nested_namespace(self):
        """Should use first part of colon-separated namespace."""
        result = self.auditor._detect_app('/api/unknown/', None, 'rules_engine:actions')
        self.assertEqual(result, 'rules_engine')

    def test_UTL_detect_app_from_path_map(self):
        """Should detect app from known path prefixes."""
        test_cases = {
            '/api/users/profile/': 'users',
            '/api/students/list/': 'students',
            '/api/cart/items/': 'cart',
            '/api/orders/history/': 'orders',
            '/api/rules/execute/': 'rules_engine',
            '/api/utils/health/': 'utils',
            '/api/countries/list/': 'misc',
            '/api/markings/list/': 'marking',
            '/api/marking-vouchers/list/': 'marking_vouchers',
            '/api/tutorials/events/': 'tutorials',
            '/api/search/query/': 'search',
        }
        for path, expected_app in test_cases.items():
            result = self.auditor._detect_app(path, None, None)
            self.assertEqual(result, expected_app, f"Path {path} should map to {expected_app}")

    def test_UTL_detect_app_fallback_to_cls_module(self):
        """Should fall back to callback.cls module name."""
        callback = MagicMock()
        callback.cls.__module__ = 'cart.views'
        del callback.__module__
        result = self.auditor._detect_app('/api/unknown-path/', callback, None)
        self.assertEqual(result, 'cart')

    def test_UTL_detect_app_fallback_to_module(self):
        """Should fall back to callback.__module__ when no cls."""
        callback = MagicMock(spec=[])
        callback.__module__ = 'store.views'
        result = self.auditor._detect_app('/api/unknown-path/', callback, None)
        self.assertEqual(result, 'store')

    def test_UTL_detect_app_returns_unknown(self):
        """Should return 'unknown' when nothing matches."""
        callback = object()
        result = self.auditor._detect_app('/unknown/', callback, None)
        self.assertEqual(result, 'unknown')

    # --- _get_http_methods ---

    def test_UTL_get_http_methods_from_initkwargs_actions(self):
        """Should extract methods from initkwargs actions dict."""
        callback = MagicMock()
        callback.initkwargs = {'actions': {'get': 'list', 'post': 'create'}}
        pattern = MagicMock()
        result = self.auditor._get_http_methods(callback, pattern)
        self.assertIn('GET', result)
        self.assertIn('POST', result)

    def test_UTL_get_http_methods_from_view_class(self):
        """Should detect methods from view_class."""
        callback = MagicMock(spec=[])
        callback.view_class = type('TestView', (), {
            'get': lambda self, r: None,
            'post': lambda self, r: None,
        })
        result = self.auditor._get_http_methods(callback, MagicMock())
        self.assertIn('GET', result)
        self.assertIn('POST', result)

    def test_UTL_get_http_methods_from_fbv_initkwargs(self):
        """Should get methods from function-based view http_method_names."""
        callback = MagicMock(spec=[])
        callback.initkwargs = {'http_method_names': ['get', 'post', 'options']}
        result = self.auditor._get_http_methods(callback, MagicMock())
        self.assertIn('GET', result)
        self.assertIn('POST', result)
        self.assertNotIn('OPTIONS', result)

    def test_UTL_get_http_methods_defaults_to_get(self):
        """Should default to GET when no methods can be determined."""
        callback = object()
        result = self.auditor._get_http_methods(callback, MagicMock())
        self.assertEqual(result, ['GET'])

    # --- _get_action_name ---

    def test_UTL_get_action_name_with_actions(self):
        """Should return first action name from initkwargs."""
        callback = MagicMock()
        callback.initkwargs = {'actions': {'get': 'list', 'post': 'create'}}
        result = self.auditor._get_action_name(callback, MagicMock())
        self.assertEqual(result, 'list')

    def test_UTL_get_action_name_empty_actions(self):
        """Should return empty string for empty actions."""
        callback = MagicMock()
        callback.initkwargs = {'actions': {}}
        result = self.auditor._get_action_name(callback, MagicMock())
        self.assertEqual(result, '')

    def test_UTL_get_action_name_no_initkwargs(self):
        """Should return empty string when no initkwargs."""
        callback = object()
        result = self.auditor._get_action_name(callback, MagicMock())
        self.assertEqual(result, '')

    # --- _normalize_path ---

    def test_UTL_normalize_path_removes_query_string(self):
        """Should strip query strings."""
        result = self.auditor._normalize_path('/api/cart/?page=1')
        self.assertEqual(result, '/api/cart/')

    def test_UTL_normalize_path_replaces_numeric_ids(self):
        """Should replace numeric IDs with {id}."""
        result = self.auditor._normalize_path('/api/cart/123/')
        self.assertEqual(result, '/api/cart/{id}/')

    def test_UTL_normalize_path_adds_trailing_slash(self):
        """Should add trailing slash if missing."""
        result = self.auditor._normalize_path('/api/cart')
        self.assertEqual(result, '/api/cart/')

    def test_UTL_normalize_path_lowercases(self):
        """Should lowercase the path."""
        result = self.auditor._normalize_path('/API/Cart/')
        self.assertEqual(result, '/api/cart/')

    # --- _is_endpoint_tested ---

    def test_UTL_is_endpoint_tested_by_url(self):
        """Should match endpoints by URL path."""
        endpoint = {'path': '/api/cart/', 'name': '', 'namespace': ''}
        test_refs = {
            'url_references': {'/api/cart/': {}},
            'reverse_references': {},
        }
        result = self.auditor._is_endpoint_tested(endpoint, test_refs)
        self.assertTrue(result)

    def test_UTL_is_endpoint_tested_by_reverse_name(self):
        """Should match endpoints by reverse name."""
        endpoint = {'path': '/api/unknown/', 'name': 'cart-list', 'namespace': ''}
        test_refs = {
            'url_references': {},
            'reverse_references': {'cart-list': {}},
        }
        result = self.auditor._is_endpoint_tested(endpoint, test_refs)
        self.assertTrue(result)

    def test_UTL_is_endpoint_tested_by_namespaced_name(self):
        """Should match endpoints by namespace:name."""
        endpoint = {'path': '/api/unknown/', 'name': 'list', 'namespace': 'cart'}
        test_refs = {
            'url_references': {},
            'reverse_references': {'cart:list': {}},
        }
        result = self.auditor._is_endpoint_tested(endpoint, test_refs)
        self.assertTrue(result)

    def test_UTL_is_endpoint_tested_by_partial_name_match(self):
        """Should match when name is suffix of tested reverse name."""
        endpoint = {'path': '/api/unknown/', 'name': 'product-list', 'namespace': ''}
        test_refs = {
            'url_references': {},
            'reverse_references': {'store:product-list': {}},
        }
        result = self.auditor._is_endpoint_tested(endpoint, test_refs)
        self.assertTrue(result)

    def test_UTL_is_endpoint_not_tested(self):
        """Should return False when no match found."""
        endpoint = {'path': '/api/untested/', 'name': 'untested-view', 'namespace': ''}
        test_refs = {
            'url_references': {},
            'reverse_references': {},
        }
        result = self.auditor._is_endpoint_tested(endpoint, test_refs)
        self.assertFalse(result)

    # --- _pattern_to_path ---

    def test_UTL_pattern_to_path_removes_regex(self):
        """Should remove ^ and $ regex artifacts."""
        result = self.auditor._pattern_to_path('^cart/$')
        self.assertEqual(result, 'cart/')

    # --- _extract_endpoint_info ---

    def test_UTL_extract_skips_non_api_path(self):
        """Should skip non-API paths."""
        pattern = MagicMock()
        result = self.auditor._extract_endpoint_info(pattern, '/admin/login/', None)
        self.assertIsNone(result)

    def test_UTL_extract_skips_regex_path(self):
        """Should skip paths with regex syntax."""
        pattern = MagicMock()
        result = self.auditor._extract_endpoint_info(pattern, '/api/cart/(?P<pk>\\d+)/', None)
        self.assertIsNone(result)

    def test_UTL_extract_skips_format_suffix(self):
        """Should skip paths with {format} suffix."""
        pattern = MagicMock()
        result = self.auditor._extract_endpoint_info(pattern, '/api/cart/{format}/', None)
        self.assertIsNone(result)

    def test_UTL_extract_skips_api_root(self):
        """Should skip DRF API root patterns."""
        pattern = MagicMock()
        pattern.name = 'api-root'
        result = self.auditor._extract_endpoint_info(pattern, '/api/', None)
        self.assertIsNone(result)

    def test_UTL_extract_skips_none_callback(self):
        """Should skip patterns with no callback."""
        pattern = MagicMock()
        pattern.callback = None
        pattern.name = 'test-view'
        result = self.auditor._extract_endpoint_info(pattern, '/api/test/', None)
        self.assertIsNone(result)

    def test_UTL_paths_match_regex_error(self):
        """Should handle regex pattern errors gracefully."""
        # This is a pathological case - force a bad pattern
        result = self.auditor._paths_match('/api/[invalid/', '/api/[invalid/')
        # Should not crash, may return True for exact match
        self.assertIsInstance(result, bool)
