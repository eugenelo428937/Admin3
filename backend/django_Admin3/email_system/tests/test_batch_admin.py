from django.test import TestCase
from django.contrib.admin.sites import site
from email_system.models import ExternalApiKey, EmailBatch


class BatchAdminTest(TestCase):
    def test_external_api_key_registered(self):
        self.assertIn(ExternalApiKey, site._registry)

    def test_email_batch_registered(self):
        self.assertIn(EmailBatch, site._registry)
