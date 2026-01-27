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
