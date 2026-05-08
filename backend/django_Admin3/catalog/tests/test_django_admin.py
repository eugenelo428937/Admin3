"""Smoke tests for Django admin (not the API admin) registration of catalog models."""
from django.test import Client, TestCase

from catalog.tests.fixtures import create_superuser


class TestSubjectDjangoAdminChangelist(TestCase):
    """Verify the Django admin changelist for Subject loads with the configured fields."""

    def setUp(self):
        self.superuser = create_superuser()
        self.client = Client()
        self.client.force_login(self.superuser)

    def test_changelist_returns_200_and_lists_subject_type(self):
        """Hitting /admin/catalog_subjects/subject/ returns 200 with subject_type in the column header.

        Catches typos or missing fields in `SubjectAdmin.list_display` /
        `SubjectAdmin.list_filter` at CI time rather than when a human opens the page.
        """
        response = self.client.get('/admin/catalog_subjects/subject/')
        self.assertEqual(response.status_code, 200)
        # Body should contain the column name (it is rendered as a sortable header).
        self.assertIn(b'subject_type', response.content)
