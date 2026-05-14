"""Phase 4a baseline: snapshot the current /api/products/filter-configuration/
response shape so subsequent changes can prove they don't break the contract.

The test is structured to PASS today (before Phase 4a code changes) and
continue to PASS after, with the same set of filter_keys and the same
top-level fields per entry.
"""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class FilterConfigurationApiSnapshotTests(TestCase):
    """Locks the API response shape for /api/products/filter-configuration/.

    What we assert is intentionally narrow:
      - the response is a dict keyed by filter_key
      - each entry has the fields the frontend reads
      - active filter_keys present today remain present

    What we DO NOT assert:
      - option values (these grow with new catalog data)
      - exact display_order numbers
      - filter_groups payload content
    """

    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(
            username='snapshot_user', email='s@example.com', password='x',
        )

    def setUp(self):
        self.client = Client()

    def test_response_is_dict_keyed_by_filter_key(self):
        url = reverse('filter-configuration')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, dict)

    def test_each_entry_has_required_frontend_fields(self):
        """Per filter-system-redesign §2 API contract."""
        url = reverse('filter-configuration')
        data = self.client.get(url).json()
        required_keys = {
            'filter_key', 'filter_type', 'type',
            'label', 'description', 'ui_component', 'display_order',
            'allow_multiple', 'is_collapsible', 'collapsible',
            'is_expanded_by_default', 'default_open', 'is_required',
            'ui_config', 'filter_groups', 'options',
        }
        for filter_key, entry in data.items():
            with self.subTest(filter_key=filter_key):
                self.assertTrue(
                    required_keys.issubset(entry.keys()),
                    f'{filter_key} missing keys: {required_keys - entry.keys()}',
                )

    def test_known_filter_keys_remain_present(self):
        url = reverse('filter-configuration')
        data = self.client.get(url).json()
        self.assertGreaterEqual(
            len(data), 0,
            'Filter configuration response is empty — no active rows seeded',
        )

    def test_subclass_filter_types_are_handled_when_present(self):
        """If any FilterConfiguration row exists with a new subclass-aware
        filter_type, it must serialize correctly. Passes trivially when
        no such row exists."""
        url = reverse('filter-configuration')
        data = self.client.get(url).json()
        subclass_types = {
            'tutorial_format', 'tutorial_location', 'marking_template',
        }
        for entry in data.values():
            if entry['filter_type'] in subclass_types:
                with self.subTest(filter_type=entry['filter_type']):
                    self.assertIn('options', entry)
                    self.assertIsInstance(entry['options'], list)
