"""Tests for ``EmailQueueService.queue_email(..., attachments=...)``.

The ``attachments`` kwarg accepts a list of dicts of the form
``{'filename': str, 'content': bytes, 'mime_type': str}`` and persists
each entry as an ``EmailQueueAttachment`` row tied to the new queue item.
"""
from __future__ import annotations

from django.test import TestCase

from email_system.models import EmailQueueAttachment
from email_system.services.queue_service import EmailQueueService
from email_system.tests.factories import make_template


class QueueEmailAttachmentsTest(TestCase):
    def setUp(self):
        self.service = EmailQueueService()
        self.template = make_template(
            name='qa_tutorial_attendance',
            display_name='QA Tutorial Attendance',
            template_type='TUTORIALS',
            subject_template='Attendance reminder',
            mjml_content='<mjml><mj-body></mj-body></mjml>',
            is_active=True,
        )

    def test_persists_attachment_to_queue_attachment_table(self):
        queue_item = self.service.queue_email(
            template_name='qa_tutorial_attendance',
            to_emails=['tutor@example.com'],
            context={'instructor_name': 'Eve'},
            attachments=[{
                'filename': 'roster.xlsx',
                'content': b'PK\x03\x04binary-roster',
                'mime_type': (
                    'application/vnd.openxmlformats-officedocument'
                    '.spreadsheetml.sheet'
                ),
            }],
        )

        attachments = list(queue_item.dynamic_attachments.all())
        self.assertEqual(len(attachments), 1)
        att = attachments[0]
        self.assertEqual(att.filename, 'roster.xlsx')
        self.assertEqual(bytes(att.content), b'PK\x03\x04binary-roster')
        self.assertEqual(
            att.mime_type,
            'application/vnd.openxmlformats-officedocument'
            '.spreadsheetml.sheet',
        )

    def test_persists_multiple_attachments_in_order(self):
        queue_item = self.service.queue_email(
            template_name='qa_tutorial_attendance',
            to_emails=['t@example.com'],
            context={},
            attachments=[
                {'filename': 'a.pdf', 'content': b'aaa',
                 'mime_type': 'application/pdf'},
                {'filename': 'b.xlsx', 'content': b'bb',
                 'mime_type': 'application/octet-stream'},
            ],
        )
        names = list(
            queue_item.dynamic_attachments.order_by('id')
            .values_list('filename', flat=True)
        )
        self.assertEqual(names, ['a.pdf', 'b.xlsx'])

    def test_no_attachments_kwarg_leaves_queue_clean(self):
        queue_item = self.service.queue_email(
            template_name='qa_tutorial_attendance',
            to_emails=['t@example.com'],
            context={},
        )
        self.assertEqual(queue_item.dynamic_attachments.count(), 0)

    def test_empty_attachments_list_creates_no_rows(self):
        queue_item = self.service.queue_email(
            template_name='qa_tutorial_attendance',
            to_emails=['t@example.com'],
            context={},
            attachments=[],
        )
        self.assertEqual(queue_item.dynamic_attachments.count(), 0)

    def test_mime_type_defaults_to_octet_stream(self):
        queue_item = self.service.queue_email(
            template_name='qa_tutorial_attendance',
            to_emails=['t@example.com'],
            context={},
            attachments=[{
                'filename': 'r.bin',
                'content': b'\x00\x01\x02',
                # no mime_type supplied
            }],
        )
        att = queue_item.dynamic_attachments.get()
        self.assertEqual(att.mime_type, 'application/octet-stream')

    def test_rejects_attachment_missing_required_fields(self):
        with self.assertRaises(ValueError) as ctx:
            self.service.queue_email(
                template_name='qa_tutorial_attendance',
                to_emails=['t@example.com'],
                context={},
                attachments=[{'mime_type': 'application/pdf'}],  # no filename / content
            )
        # The underlying error is re-wrapped — make sure the cause text
        # mentions attachments so callers can debug.
        self.assertIn('attachment', str(ctx.exception).lower())
        # No queue rows should have been written.
        self.assertEqual(EmailQueueAttachment.objects.count(), 0)
