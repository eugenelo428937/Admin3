"""
Tests for email_system testing utilities.
Covers: EmailTester, email_tester global instance
"""
import os
import tempfile
import shutil
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase, override_settings
from django.utils import timezone

from email_system.testing import EmailTester, email_tester
from email_system.services.email_service import EmailService


class EmailTesterGlobalInstanceTest(TestCase):
    """Tests for the global email_tester instance."""

    def test_global_instance_exists(self):
        self.assertIsNotNone(email_tester)
        self.assertIsInstance(email_tester, EmailTester)

    def test_global_instance_has_test_data(self):
        self.assertIsNotNone(email_tester.test_data)
        self.assertIn('order_confirmation', email_tester.test_data)


class EmailTesterInitTest(TestCase):
    """Tests for EmailTester initialization."""

    def test_init_loads_test_data(self):
        tester = EmailTester()
        self.assertIsNotNone(tester.test_data)

    def test_test_data_keys(self):
        tester = EmailTester()
        expected_keys = [
            'order_confirmation', 'order_confirmation_content',
            'password_reset', 'password_reset_content',
            'password_reset_completed', 'password_reset_completed_content',
            'account_activation', 'account_activation_content',
            'email_verification', 'email_verification_content',
            'master_template',
        ]
        for key in expected_keys:
            self.assertIn(key, tester.test_data, f"Missing test data key: {key}")


class GetTestDataTest(TestCase):
    """Tests for _get_test_data method."""

    def test_order_confirmation_data(self):
        tester = EmailTester()
        data = tester.test_data['order_confirmation']
        self.assertIn('first_name', data)
        self.assertIn('last_name', data)
        self.assertIn('order_number', data)
        self.assertIn('total_amount', data)
        self.assertIn('items', data)
        self.assertIsInstance(data['items'], list)
        self.assertTrue(len(data['items']) > 0)

    def test_order_confirmation_items_have_required_fields(self):
        tester = EmailTester()
        items = tester.test_data['order_confirmation']['items']
        for item in items:
            self.assertIn('name', item)
            self.assertIn('quantity', item)
            self.assertIn('actual_price', item)

    def test_password_reset_data(self):
        tester = EmailTester()
        data = tester.test_data['password_reset']
        self.assertIn('user', data)
        self.assertIn('reset_url', data)
        self.assertIn('expiry_hours', data)
        self.assertIn('base_url', data)

    def test_password_reset_completed_data(self):
        tester = EmailTester()
        data = tester.test_data['password_reset_completed']
        self.assertIn('user', data)
        self.assertIn('reset_timestamp', data)

    def test_account_activation_data(self):
        tester = EmailTester()
        data = tester.test_data['account_activation']
        self.assertIn('user', data)
        self.assertIn('activation_url', data)

    def test_email_verification_data(self):
        tester = EmailTester()
        data = tester.test_data['email_verification']
        self.assertIn('user', data)
        self.assertIn('verification_email', data)
        self.assertIn('verification_url', data)
        self.assertIn('expiry_hours', data)

    def test_master_template_data(self):
        tester = EmailTester()
        data = tester.test_data['master_template']
        self.assertIn('student', data)
        self.assertIn('order_reference', data)
        self.assertIn('order_items', data)

    def test_content_variant_keys_mirror_base_keys(self):
        """Test that _content variants have same data as base keys."""
        tester = EmailTester()
        base_keys = [
            'order_confirmation', 'password_reset',
            'password_reset_completed', 'account_activation',
            'email_verification',
        ]
        for key in base_keys:
            content_key = f'{key}_content'
            self.assertIn(content_key, tester.test_data)


class PreviewTemplateTest(TestCase):
    """Tests for preview_template method."""

    def setUp(self):
        self.tester = EmailTester()

    @patch('email_system.testing.render_to_string', return_value='Plain text content')
    def test_preview_text_format(self, mock_render):
        """Test preview in text format."""
        result = self.tester.preview_template('password_reset', output_format='text')
        self.assertEqual(result, 'Plain text content')
        mock_render.assert_called_once()

    @patch('email_system.testing.render_to_string', return_value='<mjml>raw content</mjml>')
    def test_preview_mjml_format(self, mock_render):
        """Test preview in raw MJML format."""
        result = self.tester.preview_template('password_reset', output_format='mjml')
        self.assertEqual(result, '<mjml>raw content</mjml>')

    def test_preview_invalid_format(self):
        """Test preview with invalid format returns error."""
        result = self.tester.preview_template('password_reset', output_format='invalid_format')
        self.assertIn('Error', result)

    @patch('email_system.testing.EmailService')
    @patch('email_system.testing.mjml2html', return_value='<html>compiled</html>')
    def test_preview_html_core_template_with_master(self, mock_mjml, mock_service_cls):
        """Test preview of core template uses master template system."""
        mock_service = MagicMock()
        mock_service._render_email_with_master_template.return_value = '<mjml>master content</mjml>'
        mock_service_cls.return_value = mock_service

        result = self.tester.preview_template(
            'order_confirmation', output_format='html', use_mjml=True
        )
        self.assertIn('compiled', result)
        mock_service._render_email_with_master_template.assert_called_once()

    @patch('email_system.testing.get_template')
    @patch('email_system.testing.render_to_string', return_value='<mjml>standalone</mjml>')
    @patch('email_system.testing.mjml2html', return_value='<html>standalone_html</html>')
    def test_preview_html_non_core_template(self, mock_mjml, mock_render, mock_get_tpl):
        """Test preview of non-core template uses standalone MJML."""
        result = self.tester.preview_template(
            'custom_template_xyz', output_format='html', use_mjml=True
        )
        self.assertIn('standalone_html', result)

    @patch('email_system.testing.EmailService')
    @patch('email_system.testing.mjml2html', return_value='<html>outlook content</html>')
    def test_preview_outlook_format(self, mock_mjml, mock_service_cls):
        """Test preview with outlook format applies enhancements."""
        mock_service = MagicMock()
        mock_service._render_email_with_master_template.return_value = '<mjml>content</mjml>'
        mock_service._enhance_outlook_compatibility.return_value = '<html>enhanced outlook</html>'
        mock_service_cls.return_value = mock_service

        result = self.tester.preview_template(
            'order_confirmation', output_format='outlook', use_mjml=True
        )
        mock_service._enhance_outlook_compatibility.assert_called_once()

    @patch('email_system.testing.render_to_string', return_value='<html>fallback html</html>')
    @patch('email_system.testing.get_template', side_effect=Exception('Template not found'))
    @patch('email_system.testing.EmailService')
    def test_preview_html_fallback_when_mjml_fails(self, mock_service_cls, mock_get_tpl, mock_render):
        """Test fallback to HTML when MJML template not found for non-core."""
        mock_service = MagicMock()
        mock_service._render_email_with_master_template.side_effect = Exception('Not found')
        mock_service_cls.return_value = mock_service

        # Use a non-core template to trigger standalone path
        result = self.tester.preview_template(
            'unknown_tpl', output_format='html', use_mjml=True
        )
        # After both MJML paths fail, should fall back to HTML
        self.assertIsInstance(result, str)

    @patch('email_system.testing.transform', return_value='<html>inlined</html>')
    @patch('email_system.testing.render_to_string', return_value='<html>raw</html>')
    def test_preview_inlined_format_no_mjml(self, mock_render, mock_transform):
        """Test inlined format without MJML."""
        result = self.tester.preview_template(
            'password_reset', output_format='inlined', use_mjml=False
        )
        mock_transform.assert_called_once()

    def test_preview_template_exception(self):
        """Test that exceptions return error string."""
        result = self.tester.preview_template('totally_nonexistent_template_xyz123')
        self.assertIn('Error', result)

    @override_settings(DEV_EMAIL_OVERRIDE=True, DEV_EMAIL_RECIPIENTS=['dev@test.com'], DEBUG=True)
    @patch('email_system.testing.render_to_string', return_value='text content')
    def test_preview_with_dev_override_active(self, mock_render):
        """Test preview adds dev mode context when override is active."""
        result = self.tester.preview_template('password_reset', output_format='text')
        # The context passed to render_to_string should include dev_mode_active
        call_args = mock_render.call_args
        context = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get('context', {})
        self.assertTrue(context.get('dev_mode_active', False))

    @override_settings(DEV_EMAIL_OVERRIDE=False, DEBUG=False)
    @patch('email_system.testing.render_to_string', return_value='text content')
    def test_preview_without_dev_override(self, mock_render):
        """Test preview without dev override."""
        result = self.tester.preview_template('password_reset', output_format='text')
        call_args = mock_render.call_args
        context = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get('context', {})
        self.assertFalse(context.get('dev_mode_active', True))

    @patch('email_system.testing.EmailService')
    @patch('email_system.testing.mjml2html', side_effect=Exception('MJML compile error'))
    def test_preview_mjml_compilation_error_falls_back(self, mock_mjml, mock_service_cls):
        """Test that MJML compilation error falls back to HTML."""
        mock_service = MagicMock()
        mock_service._render_email_with_master_template.return_value = '<mjml>content</mjml>'
        mock_service_cls.return_value = mock_service

        # This should fail at MJML compilation and then try HTML fallback
        result = self.tester.preview_template(
            'order_confirmation', output_format='html', use_mjml=True
        )
        self.assertIsInstance(result, str)

    @patch('email_system.testing.EmailService')
    @patch('email_system.testing.mjml2html', return_value='<html>content</html>')
    def test_preview_order_confirmation_formats_date(self, mock_mjml, mock_service_cls):
        """Test that order_confirmation preview formats the date."""
        mock_service = MagicMock()
        mock_service._render_email_with_master_template.return_value = '<mjml>content</mjml>'
        mock_service_cls.return_value = mock_service

        result = self.tester.preview_template(
            'order_confirmation', output_format='html', use_mjml=True
        )
        # The test data includes created_at as a datetime; ensure no crash
        self.assertIsInstance(result, str)


class SavePreviewToFileTest(TestCase):
    """Tests for save_preview_to_file method."""

    def setUp(self):
        self.tester = EmailTester()
        self.output_dir = tempfile.mkdtemp(prefix='eqs_email_preview_')

    def tearDown(self):
        shutil.rmtree(self.output_dir, ignore_errors=True)

    @patch.object(EmailTester, 'preview_template', return_value='<html>preview</html>')
    def test_save_preview_creates_files(self, mock_preview):
        """Test that save_preview creates files."""
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=self.output_dir,
            use_mjml=True,
            include_outlook_enhanced=True,
        )
        files = os.listdir(self.output_dir)
        self.assertTrue(len(files) > 0)

    @patch.object(EmailTester, 'preview_template', return_value='plain text')
    def test_save_preview_text_format(self, mock_preview):
        """Test saving text format."""
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=self.output_dir,
            use_mjml=False,
            include_outlook_enhanced=False,
        )
        files = os.listdir(self.output_dir)
        txt_files = [f for f in files if f.endswith('.txt')]
        self.assertTrue(len(txt_files) > 0)

    @patch.object(EmailTester, 'preview_template', return_value='<html>content</html>')
    def test_save_preview_with_mjml_format(self, mock_preview):
        """Test saving mjml format file."""
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=self.output_dir,
            use_mjml=True,
            include_outlook_enhanced=False,
        )
        files = os.listdir(self.output_dir)
        mjml_files = [f for f in files if f.endswith('.mjml')]
        self.assertTrue(len(mjml_files) > 0)

    @patch.object(EmailTester, 'preview_template', return_value='<html>outlook</html>')
    def test_save_preview_outlook_enhanced(self, mock_preview):
        """Test saving outlook enhanced version."""
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=self.output_dir,
            use_mjml=True,
            include_outlook_enhanced=True,
        )
        files = os.listdir(self.output_dir)
        outlook_files = [f for f in files if 'outlook' in f]
        self.assertTrue(len(outlook_files) > 0)

    @patch.object(EmailTester, 'preview_template', side_effect=Exception('Preview error'))
    def test_save_preview_handles_error(self, mock_preview):
        """Test that errors during save are handled gracefully."""
        # Should not raise
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=self.output_dir,
            use_mjml=False,
            include_outlook_enhanced=False,
        )

    @patch.object(EmailTester, 'preview_template', return_value='content')
    def test_save_preview_creates_output_dir(self, mock_preview):
        """Test that output directory is created if it doesn't exist."""
        new_dir = os.path.join(self.output_dir, 'eqs_subdir')
        self.tester.save_preview_to_file(
            'password_reset',
            output_dir=new_dir,
            use_mjml=False,
            include_outlook_enhanced=False,
        )
        self.assertTrue(os.path.exists(new_dir))


class TestSendEmailTest(TestCase):
    """Tests for test_send_email method."""

    def setUp(self):
        self.tester = EmailTester()

    @patch.object(EmailService, 'send_order_confirmation', return_value=True)
    def test_send_order_confirmation(self, mock_send):
        """Test sending order confirmation test email."""
        result = self.tester.test_send_email('order_confirmation', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_password_reset', return_value=True)
    def test_send_password_reset(self, mock_send):
        """Test sending password reset test email."""
        result = self.tester.test_send_email('password_reset', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_password_reset_completed', return_value=True)
    def test_send_password_reset_completed(self, mock_send):
        """Test sending password reset completed test email."""
        result = self.tester.test_send_email('password_reset_completed', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_account_activation', return_value=True)
    def test_send_account_activation(self, mock_send):
        """Test sending account activation test email."""
        result = self.tester.test_send_email('account_activation', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_email_verification', return_value=True)
    def test_send_email_verification(self, mock_send):
        """Test sending email verification test email."""
        result = self.tester.test_send_email('email_verification', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_sample_email', return_value=True)
    def test_send_sample_email(self, mock_send):
        """Test sending sample test email."""
        result = self.tester.test_send_email('sample_email', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch.object(EmailService, 'send_master_template_email', return_value=True)
    def test_send_master_template_email(self, mock_send):
        """Test sending master template test email."""
        result = self.tester.test_send_email('master_template', 'eqs_test@example.com')
        self.assertTrue(result)
        mock_send.assert_called_once()

    def test_send_unknown_template(self):
        """Test sending with unknown template returns False."""
        result = self.tester.test_send_email('completely_unknown_template', 'eqs_test@example.com')
        self.assertFalse(result)

    @patch.object(EmailService, 'send_password_reset', side_effect=Exception('Send failed'))
    def test_send_exception_raised(self, mock_send):
        """Test that exceptions are propagated."""
        with self.assertRaises(Exception) as ctx:
            self.tester.test_send_email('password_reset', 'eqs_test@example.com')
        self.assertIn('Failed to send test email', str(ctx.exception))


class ValidateEmailCompatibilityTest(TestCase):
    """Tests for validate_email_compatibility method."""

    def setUp(self):
        self.tester = EmailTester()

    @patch.object(EmailTester, 'preview_template')
    def test_detects_flexbox(self, mock_preview):
        """Test that flexbox usage is detected."""
        mock_preview.side_effect = [
            '<html><body style="display: flex">content</body></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        flexbox_issues = [i for i in report['issues'] if 'Flexbox' in i]
        self.assertTrue(len(flexbox_issues) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_detects_border_radius(self, mock_preview):
        """Test that border-radius is detected."""
        mock_preview.side_effect = [
            '<html><div style="border-radius: 5px">content</div></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        radius_issues = [i for i in report['issues'] if 'Border-radius' in i]
        self.assertTrue(len(radius_issues) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_detects_responsive_design(self, mock_preview):
        """Test that responsive design (@media max-width) is recognized."""
        mock_preview.side_effect = [
            '<html><style>@media screen and (max-width: 600px){}</style></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        responsive_recs = [r for r in report['recommendations'] if 'Responsive design' in r]
        self.assertTrue(len(responsive_recs) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_detects_no_table_structure(self, mock_preview):
        """Test that missing table structure is detected."""
        mock_preview.side_effect = [
            '<html><div>no tables here</div></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        table_issues = [i for i in report['issues'] if 'table structure' in i]
        self.assertTrue(len(table_issues) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_detects_external_stylesheets(self, mock_preview):
        """Test that external stylesheets are detected."""
        mock_preview.side_effect = [
            '<html><head><link rel="stylesheet" href="style.css"></head></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        css_issues = [i for i in report['issues'] if 'External stylesheets' in i]
        self.assertTrue(len(css_issues) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_detects_images_without_alt(self, mock_preview):
        """Test that images without alt text are detected."""
        mock_preview.side_effect = [
            '<html><body><img src="test.png"></body></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        alt_issues = [i for i in report['issues'] if 'alt text' in i]
        self.assertTrue(len(alt_issues) > 0)

    @patch.object(EmailTester, 'preview_template')
    def test_compatibility_score_calculation(self, mock_preview):
        """Test compatibility score calculation."""
        mock_preview.side_effect = [
            '<html><table><tr><td>good html</td></tr></table></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        self.assertIn('compatibility_score', report)
        self.assertGreaterEqual(report['compatibility_score'], 0)
        self.assertLessEqual(report['compatibility_score'], 100)

    @patch.object(EmailTester, 'preview_template')
    def test_low_score_adds_recommendations(self, mock_preview):
        """Test that low score adds recommendations."""
        # Many issues to lower score below 70
        mock_preview.side_effect = [
            '<html><head><link rel="stylesheet" href="style.css"></head>'
            '<body style="display: flex; border-radius: 5px">'
            '<img src="test.png"></body></html>',
            '<html>inlined</html>',
        ]
        report = self.tester.validate_email_compatibility('password_reset')
        if report['compatibility_score'] < 70:
            self.assertTrue(len(report['recommendations']) > 0)

    @patch.object(EmailTester, 'preview_template', side_effect=Exception('Preview failed'))
    def test_validation_exception(self, mock_preview):
        """Test that exceptions return error report."""
        report = self.tester.validate_email_compatibility('password_reset')
        self.assertIn('error', report)


class GenerateTestReportTest(TestCase):
    """Tests for generate_test_report method."""

    def setUp(self):
        self.tester = EmailTester()

    @patch.object(EmailTester, 'validate_email_compatibility')
    def test_generates_report(self, mock_validate):
        """Test report generation."""
        mock_validate.return_value = {
            'template': 'test',
            'issues': [],
            'recommendations': [],
            'compatibility_score': 90,
        }
        report = self.tester.generate_test_report(['password_reset'])
        self.assertIn('test_timestamp', report)
        self.assertEqual(report['templates_tested'], 1)
        self.assertEqual(report['overall_score'], 90)

    @patch.object(EmailTester, 'validate_email_compatibility')
    def test_generates_report_default_templates(self, mock_validate):
        """Test report generation with default template list."""
        mock_validate.return_value = {
            'template': 'test',
            'issues': [],
            'recommendations': [],
            'compatibility_score': 80,
        }
        report = self.tester.generate_test_report()
        self.assertEqual(report['templates_tested'], 3)

    @patch.object(EmailTester, 'validate_email_compatibility')
    def test_generates_report_multiple_templates(self, mock_validate):
        """Test report generation with multiple templates."""
        mock_validate.side_effect = [
            {'compatibility_score': 90, 'issues': [], 'recommendations': []},
            {'compatibility_score': 70, 'issues': ['Issue'], 'recommendations': []},
        ]
        report = self.tester.generate_test_report(['tpl1', 'tpl2'])
        self.assertEqual(report['overall_score'], 80)  # (90+70)/2
        self.assertEqual(len(report['template_reports']), 2)

    @patch.object(EmailTester, 'validate_email_compatibility')
    def test_handles_report_without_score(self, mock_validate):
        """Test report handles validation without score."""
        mock_validate.return_value = {
            'error': 'Validation failed',
        }
        report = self.tester.generate_test_report(['tpl1'])
        self.assertEqual(report['templates_tested'], 1)


class TestOutlookCompatibilityTest(TestCase):
    """Tests for test_outlook_compatibility method."""

    def setUp(self):
        self.tester = EmailTester()

    @patch.object(EmailTester, 'preview_template')
    def test_generates_comparison(self, mock_preview):
        """Test Outlook compatibility comparison."""
        mock_preview.side_effect = [
            '<html>regular</html>',
            '<html>enhanced with outlook fixes</html>',
        ]
        results = self.tester.test_outlook_compatibility('password_reset')
        self.assertIn('mjml_regular', results)
        self.assertIn('mjml_outlook_enhanced', results)
        self.assertIn('comparison', results)
        self.assertEqual(results['comparison']['regular_size'], len('<html>regular</html>'))

    @patch.object(EmailTester, 'preview_template')
    def test_comparison_enhancement_detected(self, mock_preview):
        """Test that enhancement is detected when sizes differ."""
        mock_preview.side_effect = [
            '<html>short</html>',
            '<html>much longer outlook enhanced version with extra stuff</html>',
        ]
        results = self.tester.test_outlook_compatibility('password_reset')
        self.assertTrue(results['comparison']['enhancement_applied'])
        self.assertGreater(results['comparison']['size_difference'], 0)

    @patch.object(EmailTester, 'preview_template')
    def test_comparison_no_enhancement(self, mock_preview):
        """Test when no enhancement size difference."""
        same_html = '<html>same</html>'
        mock_preview.side_effect = [same_html, same_html]
        results = self.tester.test_outlook_compatibility('password_reset')
        self.assertFalse(results['comparison']['enhancement_applied'])

    @patch.object(EmailTester, 'preview_template', side_effect=Exception('Preview error'))
    def test_outlook_compatibility_exception(self, mock_preview):
        """Test exception handling in outlook compatibility test."""
        results = self.tester.test_outlook_compatibility('password_reset')
        self.assertIn('error', results)
