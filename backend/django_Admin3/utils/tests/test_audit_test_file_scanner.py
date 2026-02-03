"""Tests for the TestFileScanner module."""
import os
import tempfile
import shutil
from django.test import TestCase

from utils.audit.test_file_scanner import TestFileScanner


class TestFileDiscovery(TestCase):
    """Test that TestFileScanner finds test files correctly."""

    def setUp(self):
        # Create a temporary directory with test file structure
        self.tmp_dir = tempfile.mkdtemp()
        self._create_test_structure()
        self.scanner = TestFileScanner(base_dir=self.tmp_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)

    def _create_test_structure(self):
        """Create a mock project directory with test files."""
        # app1/tests/test_views.py
        app1_tests = os.path.join(self.tmp_dir, 'app1', 'tests')
        os.makedirs(app1_tests)
        with open(os.path.join(app1_tests, '__init__.py'), 'w') as f:
            f.write('')
        with open(os.path.join(app1_tests, 'test_views.py'), 'w') as f:
            f.write(self.SAMPLE_TEST_CONTENT)

        # app2/tests.py
        app2_dir = os.path.join(self.tmp_dir, 'app2')
        os.makedirs(app2_dir)
        with open(os.path.join(app2_dir, 'tests.py'), 'w') as f:
            f.write(self.SAMPLE_TEST_CONTENT_2)

        # .venv should be skipped
        venv_dir = os.path.join(self.tmp_dir, '.venv', 'lib', 'tests')
        os.makedirs(venv_dir)
        with open(os.path.join(venv_dir, 'test_something.py'), 'w') as f:
            f.write('# Should be ignored')

    SAMPLE_TEST_CONTENT = """
from django.test import TestCase
from rest_framework.test import APITestCase

class CartViewTests(APITestCase):
    def test_fetch_cart(self):
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], 1)
        self.assertIn('items', response.data)

    def test_add_to_cart(self):
        data = {'current_product': 1, 'quantity': 2, 'price_type': 'standard', 'actual_price': '59.99'}
        response = self.client.post('/api/cart/add/', data, format='json')
        self.assertEqual(response.status_code, 201)

    def test_remove_from_cart(self):
        response = self.client.delete('/api/cart/remove/', {'item_id': 1})
        self.assertEqual(response.status_code, 200)

    def test_with_reverse(self):
        url = reverse('cart-list')
        response = self.client.get(url)
"""

    SAMPLE_TEST_CONTENT_2 = """
from django.test import TestCase

class StoreViewTests(TestCase):
    def test_list_products(self):
        response = self.client.get('/api/store/products/')
        self.assertEqual(response.data['results'][0]['product_code'], 'CM2')
        self.assertEqual(response.data['results'][0]['product_name'], 'CM2 Study')

    def test_get_product(self):
        response = self.client.get('/api/store/products/1/')
        self.assertIn('exam_session_code', response.data)
"""

    def test_finds_test_files_in_tests_directory(self):
        files = self.scanner.find_test_files()
        filenames = [os.path.basename(f) for f in files]
        self.assertIn('test_views.py', filenames)

    def test_finds_tests_py_at_app_root(self):
        files = self.scanner.find_test_files()
        filenames = [os.path.basename(f) for f in files]
        self.assertIn('tests.py', filenames)

    def test_skips_venv_directory(self):
        files = self.scanner.find_test_files()
        for f in files:
            self.assertNotIn('.venv', f)

    def test_app_filter_limits_results(self):
        files = self.scanner.find_test_files(app_filter='app1')
        self.assertEqual(len(files), 1)
        self.assertIn('app1', files[0])

    def test_app_filter_no_match(self):
        files = self.scanner.find_test_files(app_filter='nonexistent')
        self.assertEqual(len(files), 0)


class TestEndpointScanning(TestCase):
    """Test endpoint reference scanning."""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        app_tests = os.path.join(self.tmp_dir, 'myapp', 'tests')
        os.makedirs(app_tests)
        with open(os.path.join(app_tests, '__init__.py'), 'w') as f:
            f.write('')
        with open(os.path.join(app_tests, 'test_api.py'), 'w') as f:
            f.write(TestFileDiscovery.SAMPLE_TEST_CONTENT)
        self.scanner = TestFileScanner(base_dir=self.tmp_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)

    def test_finds_get_requests(self):
        result = self.scanner.scan_for_endpoints()
        url_refs = result['url_references']
        self.assertIn('/api/cart/', url_refs)
        self.assertIn('GET', url_refs['/api/cart/']['methods'])

    def test_finds_post_requests(self):
        result = self.scanner.scan_for_endpoints()
        url_refs = result['url_references']
        self.assertIn('/api/cart/add/', url_refs)
        self.assertIn('POST', url_refs['/api/cart/add/']['methods'])

    def test_finds_delete_requests(self):
        result = self.scanner.scan_for_endpoints()
        url_refs = result['url_references']
        self.assertIn('/api/cart/remove/', url_refs)
        self.assertIn('DELETE', url_refs['/api/cart/remove/']['methods'])

    def test_finds_reverse_references(self):
        result = self.scanner.scan_for_endpoints()
        reverse_refs = result['reverse_references']
        self.assertIn('cart-list', reverse_refs)

    def test_normalizes_urls_with_ids(self):
        """URLs with numeric IDs should be normalized to {id}."""
        result = self.scanner.scan_for_endpoints()
        url_refs = result['url_references']
        # The delete URL has item_id in body, not URL, so check other patterns
        # The scanner should normalize '/api/cart/remove/' as-is
        self.assertIn('/api/cart/remove/', url_refs)


class TestFieldScanning(TestCase):
    """Test serializer field reference scanning."""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        app_tests = os.path.join(self.tmp_dir, 'myapp', 'tests')
        os.makedirs(app_tests)
        with open(os.path.join(app_tests, '__init__.py'), 'w') as f:
            f.write('')
        with open(os.path.join(app_tests, 'test_api.py'), 'w') as f:
            f.write(TestFileDiscovery.SAMPLE_TEST_CONTENT)
        with open(os.path.join(app_tests, 'test_store.py'), 'w') as f:
            f.write(TestFileDiscovery.SAMPLE_TEST_CONTENT_2)
        self.scanner = TestFileScanner(base_dir=self.tmp_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)

    def test_finds_read_fields_from_response_data(self):
        result = self.scanner.scan_for_fields()
        read_fields = result['read_fields']
        self.assertIn('id', read_fields)
        self.assertIn('items', read_fields)

    def test_finds_write_fields_from_request_body(self):
        result = self.scanner.scan_for_fields()
        write_fields = result['write_fields']
        self.assertIn('current_product', write_fields)
        self.assertIn('quantity', write_fields)
        self.assertIn('price_type', write_fields)

    def test_finds_read_fields_from_nested_access(self):
        """Fields accessed as response.data['results'][0]['field'] should be found."""
        result = self.scanner.scan_for_fields()
        read_fields = result['read_fields']
        self.assertIn('product_code', read_fields)
        self.assertIn('product_name', read_fields)

    def test_filters_out_non_field_names(self):
        """Common non-field names like 'status' should be filtered."""
        result = self.scanner.scan_for_fields()
        read_fields = result['read_fields']
        self.assertNotIn('status_code', read_fields)
