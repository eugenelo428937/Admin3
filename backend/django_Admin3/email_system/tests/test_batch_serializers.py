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
            'requested_by': 'Test User',
            'notify_email': 'admin@example.com',
            'items': [{'to_email': 'user@example.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())

    def test_template_id_required(self):
        data = {'requested_by': 'Test', 'notify_email': 'a@b.com', 'items': [{'to_email': 'a@b.com', 'payload': {}}]}
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_items_required(self):
        data = {'template_id': 1, 'requested_by': 'Test', 'notify_email': 'a@b.com'}
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())
