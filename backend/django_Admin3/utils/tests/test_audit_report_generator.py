"""Tests for the ReportGenerator module."""
from django.test import TestCase
from unittest.mock import MagicMock, patch

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


class TestReportGeneratorFileOutput(TestCase):
    """Test file output paths for ReportGenerator (coverage gaps)."""

    def setUp(self):
        self.generator = ReportGenerator()
        self.ep_report = {
            'endpoints': [],
            'tested': [],
            'untested': [],
            'summary': {
                'total': 0,
                'tested_count': 0,
                'untested_count': 0,
                'coverage_pct': 0,
                'by_app': {},
            },
        }
        self.ser_report = {
            'serializers': {},
            'summary': {
                'total_serializers': 0,
                'total_fields': 0,
                'read_tested_count': 0,
                'write_tested_count': 0,
                'untested_count': 0,
                'read_coverage_pct': 0,
                'write_coverage_pct': 0,
                'untested_pct': 0,
            },
        }

    @patch('builtins.open', new_callable=MagicMock)
    def test_UTL_json_output_with_path(self, mock_open):
        """Should write JSON report to file when output_path given."""
        import json as json_mod
        mock_file = MagicMock()
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        self.generator.generate(
            self.ep_report,
            self.ser_report,
            format='json',
            output_path='/tmp/UTL_report',
        )
        mock_open.assert_called_once_with('/tmp/UTL_report.json', 'w')

    @patch('builtins.open', new_callable=MagicMock)
    def test_UTL_json_output_with_json_extension(self, mock_open):
        """Should not double .json extension."""
        mock_file = MagicMock()
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        self.generator.generate(
            self.ep_report,
            self.ser_report,
            format='json',
            output_path='/tmp/UTL_report.json',
        )
        mock_open.assert_called_once_with('/tmp/UTL_report.json', 'w')

    @patch('builtins.open', new_callable=MagicMock)
    def test_UTL_text_output_with_path(self, mock_open):
        """Should write text report to file when output_path given."""
        mock_file = MagicMock()
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        self.generator.generate(
            self.ep_report,
            self.ser_report,
            format='text',
            output_path='/tmp/UTL_report',
        )
        mock_open.assert_called_once_with('/tmp/UTL_report.txt', 'w')

    @patch('builtins.open', new_callable=MagicMock)
    def test_UTL_text_output_with_txt_extension(self, mock_open):
        """Should not double .txt extension."""
        mock_file = MagicMock()
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        self.generator.generate(
            self.ep_report,
            self.ser_report,
            format='text',
            output_path='/tmp/UTL_report.txt',
        )
        mock_open.assert_called_once_with('/tmp/UTL_report.txt', 'w')


class TestReportGeneratorManyUntestedFields(TestCase):
    """Test text report with >5 untested fields per serializer."""

    def test_UTL_text_shows_and_more_for_many_untested(self):
        """Should show '... and N more' when >5 untested fields."""
        generator = ReportGenerator()
        ep_report = {
            'endpoints': [],
            'tested': [],
            'untested': [],
            'summary': {
                'total': 0, 'tested_count': 0, 'untested_count': 0,
                'coverage_pct': 0, 'by_app': {},
            },
        }
        ser_report = {
            'serializers': {
                'test.UTLManyGaps': {
                    'module': 'test.serializers',
                    'total_fields': 8,
                    'read_tested': [],
                    'write_tested': [],
                    'untested': ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
                    'fields': {},
                },
            },
            'summary': {
                'total_serializers': 1, 'total_fields': 8,
                'read_tested_count': 0, 'write_tested_count': 0,
                'untested_count': 8, 'read_coverage_pct': 0,
                'write_coverage_pct': 0, 'untested_pct': 100.0,
            },
        }
        result = generator.generate(ep_report, ser_report, format='text')
        text = result['text']
        self.assertIn('... and 3 more', text)
        self.assertIn('UTLManyGaps', text)

    def test_UTL_text_no_untested_apps_skips_section(self):
        """Text report with all tested endpoints should not show 'UNTESTED' section."""
        generator = ReportGenerator()
        ep_report = {
            'endpoints': [
                {'path': '/api/test/', 'methods': ['GET'], 'view': 'test', 'app': 'test', 'tested': True},
            ],
            'tested': [
                {'path': '/api/test/', 'methods': ['GET'], 'view': 'test', 'app': 'test'},
            ],
            'untested': [],
            'summary': {
                'total': 1, 'tested_count': 1, 'untested_count': 0,
                'coverage_pct': 100.0,
                'by_app': {'test': {'total': 1, 'tested': 1, 'untested': 0}},
            },
        }
        ser_report = {
            'serializers': {},
            'summary': {
                'total_serializers': 0, 'total_fields': 0,
                'read_tested_count': 0, 'write_tested_count': 0,
                'untested_count': 0, 'read_coverage_pct': 0,
                'write_coverage_pct': 0, 'untested_pct': 0,
            },
        }
        result = generator.generate(ep_report, ser_report, format='text')
        text = result['text']
        # 'UNTESTED ENDPOINTS BY APP' section should exist but have no app entries with untested
        self.assertIn('ENDPOINT COVERAGE', text)
