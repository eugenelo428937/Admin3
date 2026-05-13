"""Tests for ``EmailQueueAttachment`` — per-queue-item dynamic attachments.

This model carries attachment bytes that are bound to a single queue row
(not a template), e.g. an xlsx generated for a specific tutorial session.
Lifecycle is FK-CASCADE: deleting the queue row deletes its attachments.
"""
from __future__ import annotations

from django.test import TestCase

from email_system.models import EmailQueue, EmailQueueAttachment
from email_system.tests.factories import make_template


class EmailQueueAttachmentModelTest(TestCase):
    def setUp(self):
        self.template = make_template(
            name='qa_tpl',
            subject_template='subject',
            mjml_content='<mjml><mj-body></mj-body></mjml>',
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['to@example.com'],
            from_email='from@example.com',
            subject='QA',
        )

    def test_create_with_required_fields(self):
        att = EmailQueueAttachment.objects.create(
            queue_item=self.queue_item,
            filename='roster.xlsx',
            content=b'PK\x03\x04binary',
            mime_type=(
                'application/vnd.openxmlformats-officedocument'
                '.spreadsheetml.sheet'
            ),
        )
        self.assertEqual(att.filename, 'roster.xlsx')
        self.assertEqual(bytes(att.content), b'PK\x03\x04binary')
        self.assertEqual(att.queue_item_id, self.queue_item.id)
        self.assertIsNotNone(att.created_at)

    def test_size_bytes_property_reflects_content_length(self):
        att = EmailQueueAttachment.objects.create(
            queue_item=self.queue_item,
            filename='r.xlsx',
            content=b'12345',
            mime_type='application/octet-stream',
        )
        self.assertEqual(att.size_bytes, 5)

    def test_cascade_delete_when_queue_item_removed(self):
        EmailQueueAttachment.objects.create(
            queue_item=self.queue_item,
            filename='r.xlsx',
            content=b'x',
            mime_type='application/octet-stream',
        )
        self.assertEqual(EmailQueueAttachment.objects.count(), 1)
        self.queue_item.delete()
        self.assertEqual(EmailQueueAttachment.objects.count(), 0)

    def test_multiple_attachments_per_queue_item(self):
        EmailQueueAttachment.objects.create(
            queue_item=self.queue_item, filename='a.xlsx',
            content=b'aaa', mime_type='application/octet-stream',
        )
        EmailQueueAttachment.objects.create(
            queue_item=self.queue_item, filename='b.pdf',
            content=b'bb', mime_type='application/pdf',
        )
        self.assertEqual(self.queue_item.dynamic_attachments.count(), 2)

    def test_str_includes_filename_and_size(self):
        att = EmailQueueAttachment.objects.create(
            queue_item=self.queue_item,
            filename='r.xlsx',
            content=b'1234567890',
            mime_type='application/octet-stream',
        )
        s = str(att)
        self.assertIn('r.xlsx', s)
        self.assertIn('10', s)  # 10 bytes
