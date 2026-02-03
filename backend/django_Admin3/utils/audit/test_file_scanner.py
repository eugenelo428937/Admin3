"""
Scan test files for API endpoint references and serializer field assertions.

Searches test files for patterns like:
- self.client.get('/api/.../')
- self.client.post('/api/.../')
- reverse('view-name')
- response.data['field_name']
- {'field_name': value} in POST/PUT/PATCH bodies
"""
import os
import re
from pathlib import Path


class TestFileScanner:
    """Scan test files for endpoint and field references."""

    # Patterns for HTTP method calls with URL paths
    URL_PATTERNS = [
        # self.client.get('/api/...')
        re.compile(r'self\.client\.(get|post|put|patch|delete|head|options)\s*\(\s*[\'"]([^\'"]+)[\'"]'),
        # self.client.get(reverse('name'))
        re.compile(r'self\.client\.(get|post|put|patch|delete|head|options)\s*\(\s*reverse\s*\(\s*[\'"]([^\'"]+)[\'"]'),
        # APIClient().get('/api/...')
        re.compile(r'client\.(get|post|put|patch|delete|head|options)\s*\(\s*[\'"]([^\'"]+)[\'"]'),
        # response = self.client.get(url) where url contains reverse
        re.compile(r'client\.(get|post|put|patch|delete|head|options)\s*\(\s*reverse\s*\(\s*[\'"]([^\'"]+)[\'"]'),
    ]

    # Pattern for reverse() calls (captures view name)
    REVERSE_PATTERN = re.compile(r'reverse\s*\(\s*[\'"]([^\'"]+)[\'"]')

    # Pattern for response.data field access
    RESPONSE_FIELD_PATTERNS = [
        # response.data['field'] or response.data["field"]
        re.compile(r'response\.data\[[\'"](\w+)[\'"]\]'),
        # response.data.get('field')
        re.compile(r'response\.data\.get\([\'"](\w+)[\'"]'),
        # data['field'] (common alias including nested like data['results'][0]['field'])
        re.compile(r'\bdata\[[\'"](\w+)[\'"]\]'),
        # Nested field access: ...][0]['field'] or ...]['key']['field']
        re.compile(r'\]\[[\'"](\w+)[\'"]\]'),
        # assertIn('field', response.data) pattern
        re.compile(r'assertIn\([\'"](\w+)[\'"],\s*response\.data'),
    ]

    # Pattern for request body fields (in POST/PUT/PATCH calls)
    REQUEST_BODY_PATTERNS = [
        # 'field_name': value (inside dict literals)
        re.compile(r'[\'"](\w+)[\'"]\s*:\s*'),
    ]

    def __init__(self, base_dir=None):
        if base_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.base_dir = base_dir

    def find_test_files(self, app_filter=None):
        """Find all test files in the project.

        Args:
            app_filter: Optional app name to filter (e.g., 'store')

        Returns:
            List of absolute paths to test files.
        """
        test_files = []
        for root, dirs, files in os.walk(self.base_dir):
            # Skip venv, migrations, __pycache__
            dirs[:] = [d for d in dirs if d not in ('.venv', 'venv', '__pycache__', 'node_modules', 'migrations')]

            if app_filter:
                # Check if we're within the target app
                rel_path = os.path.relpath(root, self.base_dir)
                parts = Path(rel_path).parts
                if parts and parts[0] != app_filter:
                    continue

            for filename in files:
                if filename.startswith('test') and filename.endswith('.py'):
                    test_files.append(os.path.join(root, filename))
                elif filename == 'tests.py':
                    test_files.append(os.path.join(root, filename))

        return test_files

    def scan_for_endpoints(self, app_filter=None):
        """Scan test files for API endpoint references.

        Returns:
            dict: {
                'url_references': {'/api/cart/': {'methods': {'get', 'post'}, 'files': [...]}},
                'reverse_references': {'cart-list': {'files': [...]}},
            }
        """
        test_files = self.find_test_files(app_filter)
        url_refs = {}
        reverse_refs = {}

        for filepath in test_files:
            try:
                content = self._read_file(filepath)
            except Exception:
                continue

            # Scan for URL patterns
            for pattern in self.URL_PATTERNS:
                for match in pattern.finditer(content):
                    method = match.group(1).upper()
                    url_or_name = match.group(2)

                    if url_or_name.startswith('/') or url_or_name.startswith('http'):
                        # Direct URL reference
                        url = self._normalize_url(url_or_name)
                        if url not in url_refs:
                            url_refs[url] = {'methods': set(), 'files': set()}
                        url_refs[url]['methods'].add(method)
                        url_refs[url]['files'].add(filepath)
                    else:
                        # reverse() name reference
                        if url_or_name not in reverse_refs:
                            reverse_refs[url_or_name] = {'methods': set(), 'files': set()}
                        reverse_refs[url_or_name]['methods'].add(method)
                        reverse_refs[url_or_name]['files'].add(filepath)

            # Also scan for standalone reverse() calls
            for match in self.REVERSE_PATTERN.finditer(content):
                name = match.group(1)
                if name not in reverse_refs:
                    reverse_refs[name] = {'methods': set(), 'files': set()}
                reverse_refs[name]['files'].add(filepath)

        # Convert sets to lists for JSON serialization
        for url_data in url_refs.values():
            url_data['methods'] = sorted(url_data['methods'])
            url_data['files'] = sorted(url_data['files'])
        for rev_data in reverse_refs.values():
            rev_data['methods'] = sorted(rev_data.get('methods', set()))
            rev_data['files'] = sorted(rev_data['files'])

        return {
            'url_references': url_refs,
            'reverse_references': reverse_refs,
        }

    def scan_for_fields(self, app_filter=None):
        """Scan test files for serializer field references.

        Returns:
            dict: {
                'read_fields': {'field_name': {'files': [...]}},
                'write_fields': {'field_name': {'files': [...]}},
            }
        """
        test_files = self.find_test_files(app_filter)
        read_fields = {}
        write_fields = {}

        for filepath in test_files:
            try:
                content = self._read_file(filepath)
            except Exception:
                continue

            # Scan for response field access (read operations)
            for pattern in self.RESPONSE_FIELD_PATTERNS:
                for match in pattern.finditer(content):
                    field = match.group(1)
                    if self._is_likely_field(field):
                        if field not in read_fields:
                            read_fields[field] = {'files': set()}
                        read_fields[field]['files'].add(filepath)

            # Scan for request body fields (write operations)
            # Strategy: find dict literals near POST/PUT/PATCH calls.
            # Handles both inline dicts and variable assignments like:
            #   data = {'field': value}
            #   self.client.post(url, data, ...)
            has_write_methods = bool(re.search(r'\.(post|put|patch)\s*\(', content))
            if has_write_methods:
                # Find all dict literals in the file and extract keys
                # Match 'key': value or "key": value inside { ... }
                dict_pattern = re.compile(r'\{([^{}]+)\}')
                for dict_match in dict_pattern.finditer(content):
                    dict_content = dict_match.group(1)
                    for key_match in self.REQUEST_BODY_PATTERNS[0].finditer(dict_content):
                        field = key_match.group(1)
                        if self._is_likely_field(field):
                            if field not in write_fields:
                                write_fields[field] = {'files': set()}
                            write_fields[field]['files'].add(filepath)

        # Convert sets to lists
        for data in read_fields.values():
            data['files'] = sorted(data['files'])
        for data in write_fields.values():
            data['files'] = sorted(data['files'])

        return {
            'read_fields': read_fields,
            'write_fields': write_fields,
        }

    def _read_file(self, filepath):
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    def _normalize_url(self, url):
        """Normalize URL for matching: lowercase, strip trailing slash variants."""
        url = url.split('?')[0]  # Remove query params
        # Replace numeric IDs with {id} placeholder
        url = re.sub(r'/\d+/', '/{id}/', url)
        # Ensure trailing slash
        if not url.endswith('/'):
            url += '/'
        return url

    def _is_likely_field(self, field):
        """Filter out common non-field names."""
        skip = {
            'self', 'status', 'detail', 'results', 'count', 'next', 'previous',
            'format', 'type', 'data', 'error', 'errors', 'message', 'success',
            'status_code', 'content_type', 'length', 'url', 'method',
            'assertTrue', 'assertFalse', 'assertEqual', 'args', 'kwargs',
        }
        return field not in skip and not field.startswith('_')
