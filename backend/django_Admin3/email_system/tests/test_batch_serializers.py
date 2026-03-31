from django.test import TestCase
from email_system.batch_serializers import SendBatchRequestSerializer, BatchItemSerializer


class BatchItemSerializerTest(TestCase):
    def test_valid_item(self):
        data = {'to_email': 'user@example.com', 'cc_email': ['cc@example.com'], 'payload': {'name': 'Test'}}
        s = BatchItemSerializer(data=data)
        self.assertTrue(s.is_valid())

    def test_to_email_required(self):
        s = BatchItemSerializer(data={'cc_email': [], 'payload': {}})
        self.assertFalse(s.is_valid())

    def test_cc_email_defaults_to_empty(self):
        s = BatchItemSerializer(data={'to_email': 'user@example.com', 'payload': {}})
        self.assertTrue(s.is_valid())
        self.assertEqual(s.validated_data.get('cc_email', []), [])


class SendBatchRequestSerializerTest(TestCase):
    def test_valid_request(self):
        data = {
            'template_id': 1,
            'notify_emails': ['admin@example.com'],
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())

    def test_template_id_required(self):
        data = {'notify_emails': ['a@b.com'], 'items': [{'to_email': 'a@b.com', 'payload': {}}]}
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_items_required(self):
        data = {'template_id': 1, 'notify_emails': ['a@b.com']}
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_notify_emails_optional(self):
        """notify_emails defaults to empty list when not provided."""
        data = {
            'template_id': 1,
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())
        self.assertEqual(s.validated_data['notify_emails'], [])

    def test_notify_emails_accepts_list(self):
        """notify_emails accepts a list of email addresses."""
        data = {
            'template_id': 1,
            'notify_emails': ['admin@example.com', 'ops@example.com'],
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())
        self.assertEqual(len(s.validated_data['notify_emails']), 2)

    def test_notify_emails_validates_email_format(self):
        """notify_emails rejects invalid email formats."""
        data = {
            'template_id': 1,
            'notify_emails': ['not-an-email'],
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_requested_by_not_required(self):
        """requested_by is no longer a field in the serializer."""
        data = {
            'template_id': 1,
            'requested_by': 'Should be ignored',
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())
        self.assertNotIn('requested_by', s.validated_data)
