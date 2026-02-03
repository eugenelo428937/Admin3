"""
Tests for email_system email service.
Covers: EmailService
"""
import os
import tempfile
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth.models import User

from email_system.models import EmailTemplate, EmailContentPlaceholder
from email_system.services.email_service import EmailService


class EmailServiceInitTest(TestCase):
    """Tests for EmailService initialization."""

    def test_default_init(self):
        service = EmailService()
        self.assertIsNotNone(service.from_email)
        self.assertEqual(service.base_template_dir, 'emails')
        self.assertEqual(service.mjml_template_dir, 'emails/mjml')

    @override_settings(DEFAULT_FROM_EMAIL='custom@test.com', DEFAULT_REPLY_TO_EMAIL='reply@test.com')
    def test_custom_from_email(self):
        service = EmailService()
        self.assertEqual(service.from_email, 'custom@test.com')
        self.assertEqual(service.reply_to_email, 'reply@test.com')


class HandleDevEmailOverrideTest(TestCase):
    """Tests for development email override."""

    def setUp(self):
        self.service = EmailService()

    @override_settings(DEV_EMAIL_OVERRIDE=True, DEV_EMAIL_RECIPIENTS=['dev@test.com'], DEBUG=True)
    def test_dev_override_active(self):
        context = {}
        result = self.service._handle_dev_email_override(['user@test.com'], context)
        self.assertEqual(result, ['dev@test.com'])
        self.assertTrue(context['dev_mode_active'])
        self.assertEqual(context['dev_original_recipients'], ['user@test.com'])

    @override_settings(DEV_EMAIL_OVERRIDE=False, DEBUG=True)
    def test_dev_override_disabled(self):
        context = {}
        result = self.service._handle_dev_email_override(['user@test.com'], context)
        self.assertEqual(result, ['user@test.com'])
        self.assertFalse(context['dev_mode_active'])

    @override_settings(DEV_EMAIL_OVERRIDE=True, DEV_EMAIL_RECIPIENTS=['dev@test.com'], DEBUG=False)
    def test_dev_override_production(self):
        context = {}
        result = self.service._handle_dev_email_override(['user@test.com'], context)
        self.assertEqual(result, ['user@test.com'])
        self.assertFalse(context['dev_mode_active'])

    @override_settings(DEV_EMAIL_OVERRIDE=True, DEV_EMAIL_RECIPIENTS=[], DEBUG=True)
    def test_dev_override_empty_recipients(self):
        context = {}
        result = self.service._handle_dev_email_override(['user@test.com'], context)
        self.assertEqual(result, ['user@test.com'])


class GetBccRecipientsTest(TestCase):
    """Tests for BCC monitoring."""

    def setUp(self):
        self.service = EmailService()

    @override_settings(EMAIL_BCC_MONITORING=True, EMAIL_BCC_RECIPIENTS=['monitor@test.com'])
    def test_bcc_enabled(self):
        result = self.service._get_bcc_recipients()
        self.assertEqual(result, ['monitor@test.com'])

    @override_settings(EMAIL_BCC_MONITORING=False)
    def test_bcc_disabled(self):
        result = self.service._get_bcc_recipients()
        self.assertEqual(result, [])

    @override_settings(EMAIL_BCC_MONITORING=True, EMAIL_BCC_RECIPIENTS=[])
    def test_bcc_enabled_no_recipients(self):
        result = self.service._get_bcc_recipients()
        self.assertEqual(result, [])


class ShouldUseQueueTest(TestCase):
    """Tests for queue decision logic."""

    def setUp(self):
        self.service = EmailService()
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test',
            content_template_name='test_content',
            enable_queue=True,
            is_active=True,
        )

    def test_override_true(self):
        self.assertTrue(self.service._should_use_queue('test_template', use_queue_override=True))

    def test_override_false(self):
        self.assertFalse(self.service._should_use_queue('test_template', use_queue_override=False))

    def test_template_setting_queue_enabled(self):
        self.assertTrue(self.service._should_use_queue('test_template'))

    def test_template_setting_queue_disabled(self):
        self.template.enable_queue = False
        self.template.save()
        self.assertFalse(self.service._should_use_queue('test_template'))

    def test_template_not_found(self):
        self.assertFalse(self.service._should_use_queue('nonexistent'))

    @patch('email_system.models.EmailTemplate.objects')
    def test_template_lookup_exception(self, mock_objects):
        mock_objects.get.side_effect = Exception('DB error')
        self.assertFalse(self.service._should_use_queue('test_template'))


class SendTemplatedEmailTest(TestCase):
    """Tests for send_templated_email method."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, '_queue_email', return_value=True)
    @patch.object(EmailService, '_should_use_queue', return_value=True)
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    def test_sends_to_queue(self, mock_dev, mock_queue_check, mock_queue):
        result = self.service.send_templated_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertTrue(result)
        mock_queue.assert_called_once()

    @patch.object(EmailService, '_send_mjml_email', return_value={'success': True})
    @patch.object(EmailService, '_should_use_queue', return_value=False)
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    def test_sends_mjml_core_template(self, mock_dev, mock_queue_check, mock_mjml):
        result = self.service.send_templated_email(
            template_name='order_confirmation',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=True,
        )
        mock_mjml.assert_called_once()

    @patch('email_system.services.email_service.get_template')
    @patch.object(EmailService, '_send_mjml_email', return_value={'success': True})
    @patch.object(EmailService, '_should_use_queue', return_value=False)
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    def test_sends_mjml_non_core_template(self, mock_dev, mock_queue_check, mock_mjml, mock_get_tpl):
        result = self.service.send_templated_email(
            template_name='newsletter',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=True,
        )
        mock_mjml.assert_called_once()

    @patch('email_system.services.email_service.get_template', side_effect=Exception('Not found'))
    @patch.object(EmailService, '_send_html_email', return_value=True)
    @patch.object(EmailService, '_should_use_queue', return_value=False)
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    def test_falls_back_to_html_template(self, mock_dev, mock_queue_check, mock_html, mock_get_tpl):
        result = self.service.send_templated_email(
            template_name='newsletter',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=True,
        )
        mock_html.assert_called_once()

    @patch.object(EmailService, '_send_html_email', return_value=True)
    @patch.object(EmailService, '_should_use_queue', return_value=False)
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    def test_sends_html_when_mjml_disabled(self, mock_dev, mock_queue_check, mock_html):
        result = self.service.send_templated_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=False,
        )
        mock_html.assert_called_once()


class QueueEmailTest(TestCase):
    """Tests for _queue_email method."""

    def setUp(self):
        self.service = EmailService()

    @patch('email_system.services.queue_service.email_queue_service')
    def test_queue_email_success(self, mock_queue_service):
        mock_queue_service.queue_email.return_value = MagicMock()
        result = self.service._queue_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertTrue(result)

    @patch.object(EmailService, '_send_mjml_email', return_value={'success': True})
    @patch('email_system.services.queue_service.email_queue_service')
    def test_queue_email_fallback_mjml(self, mock_queue_service, mock_mjml):
        mock_queue_service.queue_email.side_effect = Exception('Queue error')
        result = self.service._queue_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=True,
        )
        mock_mjml.assert_called_once()

    @patch.object(EmailService, '_send_html_email', return_value=True)
    @patch('email_system.services.queue_service.email_queue_service')
    def test_queue_email_fallback_html(self, mock_queue_service, mock_html):
        mock_queue_service.queue_email.side_effect = Exception('Queue error')
        result = self.service._queue_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            use_mjml=False,
        )
        mock_html.assert_called_once()


class SendMjmlEmailTest(TestCase):
    """Tests for _send_mjml_email method."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, '_send_mjml_email_from_content', return_value={'success': True})
    @patch.object(EmailService, '_render_email_with_master_template', return_value='<mjml></mjml>')
    def test_core_template_uses_master(self, mock_render, mock_send):
        result = self.service._send_mjml_email(
            template_name='order_confirmation',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        mock_render.assert_called_once()
        mock_send.assert_called_once()

    @patch.object(EmailService, '_send_mjml_email_from_content', return_value={'success': True})
    @patch('email_system.services.email_service.render_to_string', return_value='<mjml></mjml>')
    def test_non_core_template_renders(self, mock_render, mock_send):
        result = self.service._send_mjml_email(
            template_name='newsletter',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        mock_render.assert_called_once()
        mock_send.assert_called_once()

    def test_exception_returns_error_response(self):
        result = self.service._send_mjml_email(
            template_name='totally_missing_template',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertFalse(result['success'])
        self.assertEqual(result['response_code'], '500')
        self.assertIn('error_type', result['esp_response'])


class SendMjmlEmailFromContentTest(TestCase):
    """Tests for _send_mjml_email_from_content method."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='plain text')
    @patch.object(EmailService, '_enhance_outlook_compatibility', return_value='<html>enhanced</html>')
    @patch('email_system.services.email_service.mjml2html', return_value='<html>content</html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_successful_send(self, mock_email_cls, mock_mjml, mock_enhance, mock_text, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.return_value = 1
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            enhance_outlook_compatibility=True,
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['response_code'], '250')

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='text')
    @patch('email_system.services.email_service.mjml2html', return_value='<html></html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_send_failure_zero_result(self, mock_email_cls, mock_mjml, mock_text, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.return_value = 0
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertFalse(result['success'])
        self.assertEqual(result['response_code'], '554')

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='text')
    @patch('email_system.services.email_service.mjml2html', return_value='<html></html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_smtp_exception(self, mock_email_cls, mock_mjml, mock_text, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.side_effect = Exception('SMTP error')
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertFalse(result['success'])

    @patch.object(EmailService, '_get_bcc_recipients', return_value=['bcc@test.com'])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='text')
    @patch('email_system.services.email_service.mjml2html', return_value='<html></html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_send_with_bcc(self, mock_email_cls, mock_mjml, mock_text, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.return_value = 1
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertTrue(result['success'])

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_attach_files_to_email')
    @patch.object(EmailService, '_html_to_text', return_value='text')
    @patch('email_system.services.email_service.mjml2html', return_value='<html></html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_send_with_attachments(self, mock_email_cls, mock_mjml, mock_text, mock_attach, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.return_value = 1
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
            attachments=[{'path': '/test.pdf', 'name': 'test.pdf'}],
        )
        self.assertTrue(result['success'])
        mock_attach.assert_called_once()

    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch('email_system.services.email_service.mjml2html', side_effect=Exception('MJML parse error'))
    def test_mjml_parse_error(self, mock_mjml, mock_dev):
        result = self.service._send_mjml_email_from_content(
            mjml_content='invalid mjml',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertFalse(result['success'])

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='text')
    @patch('email_system.services.email_service.mjml2html', return_value='<html></html>')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    def test_message_id_extraction(self, mock_email_cls, mock_mjml, mock_text, mock_dev, mock_bcc):
        mock_email = MagicMock()
        mock_email.send.return_value = 1
        mock_email.extra_headers = {'Message-ID': '<msg123@test.com>'}
        mock_email_cls.return_value = mock_email

        result = self.service._send_mjml_email_from_content(
            mjml_content='<mjml></mjml>',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertEqual(result['esp_message_id'], '<msg123@test.com>')


class EnhanceOutlookCompatibilityTest(TestCase):
    """Tests for Outlook compatibility enhancement."""

    def setUp(self):
        self.service = EmailService()

    @patch('email_system.services.email_service.transform')
    def test_enhance_outlook(self, mock_transform):
        mock_transform.return_value = '<html><head></head><body><table><tr><td>test</td></tr></table></body></html>'
        result = self.service._enhance_outlook_compatibility('<html>test</html>')
        mock_transform.assert_called_once()
        self.assertIn('html', result)

    @patch('email_system.services.email_service.transform', side_effect=Exception('Transform error'))
    def test_enhance_outlook_failure(self, mock_transform):
        original = '<html>test</html>'
        result = self.service._enhance_outlook_compatibility(original)
        self.assertEqual(result, original)


class ApplyOutlookSpecificFixesTest(TestCase):
    """Tests for _apply_outlook_specific_fixes."""

    def setUp(self):
        self.service = EmailService()

    def test_adds_doctype(self):
        html = '<html><head></head><body></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertTrue(result.strip().startswith('<!DOCTYPE'))

    def test_preserves_existing_doctype(self):
        html = '<!DOCTYPE html><html><head></head><body></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertEqual(result.count('<!DOCTYPE'), 1)

    def test_adds_outlook_meta(self):
        html = '<html><head></head><body></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertIn('<!--[if gte mso 9]>', result)

    def test_preserves_existing_outlook_meta(self):
        html = '<html><head><!--[if gte mso 9]>existing<![endif]--></head><body></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertEqual(result.count('<!--[if gte mso 9]>'), 1)

    def test_adds_cellpadding_cellspacing(self):
        html = '<!DOCTYPE html><html><head><!--[if gte mso 9]><![endif]--></head><body><table></table></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertIn('cellpadding="0"', result)
        self.assertIn('cellspacing="0"', result)

    def test_fixes_line_height(self):
        html = '<!DOCTYPE html><html><head><!--[if gte mso 9]><![endif]--></head><body><p style="line-height:1;">text</p></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertIn('mso-line-height-rule:exactly', result)

    def test_adds_border_to_images(self):
        html = '<!DOCTYPE html><html><head><!--[if gte mso 9]><![endif]--></head><body><img src="test.png"></body></html>'
        result = self.service._apply_outlook_specific_fixes(html)
        self.assertIn('border="0"', result)


class SendHtmlEmailTest(TestCase):
    """Tests for _send_html_email."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    @patch('email_system.services.email_service.transform', return_value='<html>inlined</html>')
    @patch('email_system.services.email_service.render_to_string')
    def test_successful_send(self, mock_render, mock_transform, mock_email_cls, mock_dev, mock_bcc):
        mock_render.side_effect = ['<html>content</html>', 'plain text']
        mock_email = MagicMock()
        mock_email_cls.return_value = mock_email

        result = self.service._send_html_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertTrue(result)

    @patch.object(EmailService, '_get_bcc_recipients', return_value=[])
    @patch.object(EmailService, '_handle_dev_email_override', return_value=['user@test.com'])
    @patch.object(EmailService, '_html_to_text', return_value='fallback text')
    @patch('email_system.services.email_service.EmailMultiAlternatives')
    @patch('email_system.services.email_service.transform', return_value='<html>inlined</html>')
    @patch('email_system.services.email_service.render_to_string')
    def test_text_template_fallback(self, mock_render, mock_transform, mock_email_cls, mock_text, mock_dev, mock_bcc):
        # First call renders HTML, second call (text template) fails
        mock_render.side_effect = ['<html>content</html>', Exception('No text template')]
        mock_email = MagicMock()
        mock_email_cls.return_value = mock_email

        result = self.service._send_html_email(
            template_name='test',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertTrue(result)
        mock_text.assert_called_once()

    def test_send_html_email_exception(self):
        result = self.service._send_html_email(
            template_name='nonexistent_template',
            context={},
            to_emails=['user@test.com'],
            subject='Test',
        )
        self.assertFalse(result)


class AttachFilesTest(TestCase):
    """Tests for _attach_files_to_email."""

    def setUp(self):
        self.service = EmailService()

    def test_attach_existing_file(self):
        email = MagicMock()
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
            f.write(b'test content')
            temp_path = f.name

        try:
            self.service._attach_files_to_email(email, [
                {'path': temp_path, 'name': 'test.txt', 'mime_type': 'text/plain'}
            ])
            email.attach.assert_called_once()
        finally:
            os.unlink(temp_path)

    def test_attach_missing_file(self):
        email = MagicMock()
        self.service._attach_files_to_email(email, [
            {'path': '/nonexistent/file.txt', 'name': 'test.txt'}
        ])
        email.attach.assert_not_called()

    def test_attach_required_missing_file(self):
        email = MagicMock()
        with self.assertRaises(FileNotFoundError):
            self.service._attach_files_to_email(email, [
                {'path': '/nonexistent/file.txt', 'name': 'test.txt', 'is_required': True}
            ])

    def test_attach_missing_fields(self):
        email = MagicMock()
        self.service._attach_files_to_email(email, [
            {'mime_type': 'text/plain'}  # Missing path and name
        ])
        email.attach.assert_not_called()

    @override_settings(BASE_DIR='/app')
    def test_attach_static_path(self):
        email = MagicMock()
        self.service._attach_files_to_email(email, [
            {'path': 'static/files/test.pdf', 'name': 'test.pdf'}
        ])
        # File won't exist, but path handling is tested
        email.attach.assert_not_called()

    @override_settings(BASE_DIR='/app')
    def test_attach_relative_path(self):
        email = MagicMock()
        self.service._attach_files_to_email(email, [
            {'path': 'files/test.pdf', 'name': 'test.pdf'}
        ])
        email.attach.assert_not_called()

    def test_attach_file_path_alias(self):
        """Test that file_path and display_name aliases work."""
        email = MagicMock()
        self.service._attach_files_to_email(email, [
            {'file_path': '/nonexistent/file.txt', 'display_name': 'test.txt'}
        ])
        email.attach.assert_not_called()

    def test_attach_required_exception_propagated(self):
        """Test that required attachment exceptions propagate."""
        email = MagicMock()
        with self.assertRaises(Exception):
            self.service._attach_files_to_email(email, [
                {'path': '/nonexistent/file.txt', 'name': 'test.txt', 'is_required': True}
            ])


class HtmlToTextTest(TestCase):
    """Tests for _html_to_text."""

    def setUp(self):
        self.service = EmailService()

    @patch('html2text.html2text')
    def test_converts_html(self, mock_html2text):
        mock_html2text.return_value = 'plain text'
        result = self.service._html_to_text('<html><body>test</body></html>')
        self.assertEqual(result, 'plain text')


class GetTemplatePlaceholdersTest(TestCase):
    """Tests for _get_template_placeholders."""

    def setUp(self):
        self.service = EmailService()
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test',
            content_template_name='test_content',
            is_active=True,
        )
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TEST_PLACEHOLDER',
            display_name='Test Placeholder',
            is_active=True,
        )
        self.placeholder.templates.add(self.template)

    def test_get_placeholders(self):
        result = self.service._get_template_placeholders('test_template')
        self.assertIn('TEST_PLACEHOLDER', result)
        self.assertEqual(result['TEST_PLACEHOLDER'], '{{TEST_PLACEHOLDER}}')

    def test_get_placeholders_not_found(self):
        result = self.service._get_template_placeholders('nonexistent')
        # Should return fallback placeholders
        self.assertIn('TUTORIAL_CONTENT', result)


class RenderEmailWithMasterTemplateTest(TestCase):
    """Tests for _render_email_with_master_template."""

    def setUp(self):
        self.service = EmailService()

    @patch('email_system.services.email_service.render_to_string')
    @patch.object(EmailService, '_get_template_placeholders', return_value={})
    def test_successful_render(self, mock_placeholders, mock_render):
        mock_render.side_effect = ['<content>rendered</content>', '<master>final</master>']
        result = self.service._render_email_with_master_template(
            content_template='order_confirmation_content',
            context={},
            email_title='Test',
            email_preview='Preview',
        )
        self.assertEqual(result, '<master>final</master>')

    @patch('email_system.services.email_service.render_to_string', side_effect=Exception('Template not found'))
    @patch.object(EmailService, '_get_template_placeholders', return_value={})
    def test_render_failure(self, mock_placeholders, mock_render):
        with self.assertRaises(Exception):
            self.service._render_email_with_master_template(
                content_template='missing_content',
                context={},
            )


class SendOrderConfirmationTest(TestCase):
    """Tests for send_order_confirmation."""

    def setUp(self):
        self.service = EmailService()
        self.order_data = {
            'customer_name': 'John',
            'first_name': 'John',
            'last_name': 'Doe',
            'student_number': '12345',
            'order_number': 'ORD-001',
            'total_amount': 99.99,
            'created_at': timezone.now(),
            'subtotal': 80.0,
            'vat_amount': 19.99,
            'discount_amount': 0,
            'items': [{'name': 'Test Product', 'quantity': 1}],
        }

    @patch.object(EmailService, '_send_mjml_email', return_value={'success': True})
    def test_send_immediate(self, mock_send):
        result = self.service.send_order_confirmation(
            'user@test.com', self.order_data, use_queue=False
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_via_queue(self, mock_send):
        result = self.service.send_order_confirmation(
            'user@test.com', self.order_data, use_queue=True
        )
        self.assertTrue(result)

    @patch.object(EmailService, '_send_mjml_email_from_content', return_value={'success': True})
    @patch.object(EmailService, '_render_email_with_master_template', return_value='<mjml></mjml>')
    @patch.object(EmailService, '_send_mjml_email', side_effect=Exception('First attempt failed'))
    def test_fallback_on_failure(self, mock_send, mock_render, mock_from_content):
        result = self.service.send_order_confirmation(
            'user@test.com', self.order_data, use_queue=False
        )
        self.assertTrue(result)

    @patch.object(EmailService, '_render_email_with_master_template', side_effect=Exception('Render failed'))
    @patch.object(EmailService, '_send_mjml_email', side_effect=Exception('First failed'))
    def test_total_failure(self, mock_send, mock_render):
        result = self.service.send_order_confirmation(
            'user@test.com', self.order_data, use_queue=False
        )
        self.assertFalse(result)

    def test_order_data_without_created_at(self):
        self.order_data['created_at'] = None
        with patch.object(EmailService, '_send_mjml_email', return_value={'success': True}):
            result = self.service.send_order_confirmation(
                'user@test.com', self.order_data, use_queue=False
            )
            self.assertTrue(result)

    def test_order_data_string_created_at(self):
        self.order_data['created_at'] = '2025-01-01T00:00:00'
        with patch.object(EmailService, '_send_mjml_email', return_value={'success': True}):
            result = self.service.send_order_confirmation(
                'user@test.com', self.order_data, use_queue=False
            )
            self.assertTrue(result)


class SendPasswordResetTest(TestCase):
    """Tests for send_password_reset."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send(self, mock_send):
        result = self.service.send_password_reset(
            'user@test.com',
            {'user': {'first_name': 'John'}, 'reset_url': 'http://test.com/reset'},
        )
        self.assertTrue(result)
        mock_send.assert_called_once()


class SendPasswordResetCompletedTest(TestCase):
    """Tests for send_password_reset_completed."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_datetime(self, mock_send):
        result = self.service.send_password_reset_completed(
            'user@test.com',
            {'user': {'first_name': 'John'}, 'reset_timestamp': timezone.now()},
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_string_timestamp(self, mock_send):
        result = self.service.send_password_reset_completed(
            'user@test.com',
            {'user': {'first_name': 'John'}, 'reset_timestamp': '2025-01-01'},
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_without_timestamp(self, mock_send):
        result = self.service.send_password_reset_completed(
            'user@test.com',
            {'user': {'first_name': 'John'}},
        )
        self.assertTrue(result)


class SendAccountActivationTest(TestCase):
    """Tests for send_account_activation."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_user_object(self, mock_send):
        user = User.objects.create_user(username='testuser', password='pass')
        result = self.service.send_account_activation(
            'user@test.com',
            {'user': user, 'activation_url': 'http://test.com/activate'},
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_without_user_object(self, mock_send):
        result = self.service.send_account_activation(
            'user@test.com',
            {'activation_url': 'http://test.com/activate'},
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_user_having_date_joined(self, mock_send):
        user = User.objects.create_user(username='testuser2', password='pass')
        result = self.service.send_account_activation(
            'user@test.com',
            {'user': user, 'activation_url': 'http://test.com/activate'},
        )
        self.assertTrue(result)


class SendEmailVerificationTest(TestCase):
    """Tests for send_email_verification."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_timestamp(self, mock_send):
        result = self.service.send_email_verification(
            'user@test.com',
            {
                'user': {'first_name': 'John'},
                'verification_email': 'new@test.com',
                'verification_url': 'http://test.com/verify',
                'verification_timestamp': timezone.now(),
            },
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_without_timestamp(self, mock_send):
        result = self.service.send_email_verification(
            'user@test.com',
            {
                'user': {'first_name': 'John'},
                'verification_email': 'new@test.com',
                'verification_url': 'http://test.com/verify',
            },
        )
        self.assertTrue(result)

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send_with_string_timestamp(self, mock_send):
        result = self.service.send_email_verification(
            'user@test.com',
            {
                'user': {'first_name': 'John'},
                'verification_email': 'new@test.com',
                'verification_url': 'http://test.com/verify',
                'verification_timestamp': '2025-01-01',
            },
        )
        self.assertTrue(result)


class SendMasterTemplateEmailTest(TestCase):
    """Tests for send_master_template_email."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send(self, mock_send):
        result = self.service.send_master_template_email(
            'user@test.com',
            {'student': {'first_name': 'John'}, 'order_reference': 'ORD-001'},
        )
        self.assertTrue(result)


class SendSampleEmailTest(TestCase):
    """Tests for send_sample_email."""

    def setUp(self):
        self.service = EmailService()

    @patch.object(EmailService, 'send_templated_email', return_value=True)
    def test_send(self, mock_send):
        result = self.service.send_sample_email(
            'user@test.com',
            {'first_name': 'John', 'email_title': 'Sample'},
        )
        self.assertTrue(result)


class AddPlaceholderToTemplateTest(TestCase):
    """Tests for add_placeholder_to_template."""

    def setUp(self):
        self.service = EmailService()

    def test_add_new_placeholder(self):
        result = self.service.add_placeholder_to_template(
            template_name='new_template',
            placeholder_name='NEW_PLACEHOLDER',
            placeholder_display_name='New Placeholder',
            description='A new placeholder',
        )
        self.assertTrue(result)
        self.assertTrue(EmailContentPlaceholder.objects.filter(name='NEW_PLACEHOLDER').exists())

    def test_add_existing_placeholder(self):
        # First creation
        self.service.add_placeholder_to_template('test_tpl', 'PH1')
        # Second creation (should not error)
        result = self.service.add_placeholder_to_template('test_tpl', 'PH1')
        self.assertTrue(result)

    @patch('email_system.models.EmailTemplate.objects')
    def test_add_placeholder_exception(self, mock_objects):
        mock_objects.get_or_create.side_effect = Exception('DB error')
        result = self.service.add_placeholder_to_template('test', 'PH')
        self.assertFalse(result)


class GlobalInstanceTest(TestCase):
    """Test global service instance."""

    def test_global_instance(self):
        from email_system.services.email_service import email_service
        self.assertIsNotNone(email_service)
        self.assertIsInstance(email_service, EmailService)
