"""Tests for the ReportGenerator module."""
from django.test import TestCase

from utils.audit.report_generator import ReportGenerator


class TestReportGenerator(TestCase):
    """Test report generation in both formats."""

    def setUp(self):
        self.generator = ReportGenerator()
        self.sample_endpoint_report = {
            'endpoints': [
                {'path': '/api/cart/', 'methods': ['GET'], 'view': 'cart.views.CartViewSet', 'app': 'cart', 'name': 'cart-list', 'tested': True},
                {'path': '/api/store/products/', 'methods': ['GET', 'POST'], 'view': 'store.views.ProductViewSet', 'app': 'store', 'name': 'product-list', 'tested': False},
            ],
            'tested': [
                {'path': '/api/cart/', 'methods': ['GET'], 'view': 'cart.views.CartViewSet', 'app': 'cart', 'name': 'cart-list'},
            ],
            'untested': [
                {'path': '/api/store/products/', 'methods': ['GET', 'POST'], 'view': 'store.views.ProductViewSet', 'app': 'store', 'name': 'product-list'},
            ],
            'summary': {
                'total': 2,
                'tested_count': 1,
                'untested_count': 1,
                'coverage_pct': 50.0,
                'by_app': {
                    'cart': {'total': 1, 'tested': 1, 'untested': 0},
                    'store': {'total': 1, 'tested': 0, 'untested': 1},
                },
            },
        }
        self.sample_serializer_report = {
            'serializers': {
                'cart.CartItemSerializer': {
                    'module': 'cart.serializers',
                    'total_fields': 3,
                    'read_tested': ['id', 'quantity'],
                    'write_tested': ['quantity'],
                    'untested': ['vat_amount'],
                    'fields': {
                        'id': {'type': 'IntegerField', 'read_only': True, 'read_tested': True, 'write_tested': False, 'untested': False},
                        'quantity': {'type': 'IntegerField', 'read_only': False, 'read_tested': True, 'write_tested': True, 'untested': False},
                        'vat_amount': {'type': 'DecimalField', 'read_only': True, 'read_tested': False, 'write_tested': False, 'untested': True},
                    }
                },
            },
            'summary': {
                'total_serializers': 1,
                'total_fields': 3,
                'read_tested_count': 2,
                'write_tested_count': 1,
                'untested_count': 1,
                'read_coverage_pct': 66.7,
                'write_coverage_pct': 33.3,
                'untested_pct': 33.3,
            },
        }

    def test_generate_text_report(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='text',
        )
        self.assertIn('text', result)
        text = result['text']
        self.assertIn('ENDPOINT COVERAGE', text)
        self.assertIn('Total endpoints:', text)
        self.assertIn('SERIALIZER FIELD COVERAGE', text)

    def test_text_report_shows_coverage_numbers(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='text',
        )
        text = result['text']
        self.assertIn('50.0%', text)  # Endpoint coverage
        self.assertIn('66.7%', text)  # Read coverage

    def test_text_report_lists_untested_endpoints(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='text',
        )
        text = result['text']
        self.assertIn('/api/store/products/', text)
        self.assertIn('store', text)

    def test_generate_json_report(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='json',
        )
        self.assertIn('json', result)
        json_report = result['json']
        self.assertIn('generated_at', json_report)
        self.assertIn('summary', json_report)
        self.assertIn('untested_endpoints', json_report)
        self.assertIn('serializer_coverage', json_report)

    def test_json_report_summary_values(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='json',
        )
        summary = result['json']['summary']
        self.assertEqual(summary['total_endpoints'], 2)
        self.assertEqual(summary['tested_endpoints'], 1)
        self.assertEqual(summary['untested_endpoints'], 1)
        self.assertEqual(summary['endpoint_coverage_pct'], 50.0)

    def test_generate_both_formats(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='both',
        )
        self.assertIn('text', result)
        self.assertIn('json', result)

    def test_text_report_shows_serializer_gaps(self):
        result = self.generator.generate(
            self.sample_endpoint_report,
            self.sample_serializer_report,
            format='text',
        )
        text = result['text']
        self.assertIn('CartItemSerializer', text)
        self.assertIn('vat_amount', text)
