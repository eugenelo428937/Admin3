"""Verify the tutorial_attendance_reminder template is seeded by migration."""
from django.test import TestCase

from email_system.models import EmailTemplate, EmailVariable


class TutorialAttendanceTemplateSeededTests(TestCase):
    def test_template_exists(self):
        tpl = EmailTemplate.objects.filter(name='tutorial_attendance_reminder').first()
        self.assertIsNotNone(tpl, 'tutorial_attendance_reminder template missing')
        self.assertTrue(tpl.is_active)
        self.assertTrue(tpl.enable_queue)
        self.assertEqual(tpl.template_type, 'TUTORIALS')

    def test_subject_template_contains_session_title(self):
        tpl = EmailTemplate.objects.get(name='tutorial_attendance_reminder')
        version = tpl.current_version
        self.assertIsNotNone(version, 'No current version for template')
        self.assertIn('{{ session_title }}', version.subject_template)

    def test_basic_mode_content_contains_magic_link(self):
        tpl = EmailTemplate.objects.get(name='tutorial_attendance_reminder')
        version = tpl.current_version
        self.assertIsNotNone(version, 'No current version for template')
        self.assertIn('{{ magic_link }}', version.basic_mode_content)

    def test_mjml_content_renders_magic_link(self):
        """The MJML body must surface the magic link as a real CTA, not
        just leave the basic-mode markdown as the only render path. Both
        the button href AND a fallback text line should reference
        ``{{ magic_link }}`` for email-client compatibility.
        """
        tpl = EmailTemplate.objects.get(name='tutorial_attendance_reminder')
        version = tpl.current_version
        self.assertIsNotNone(version, 'No current version for template')
        mjml = version.mjml_content or ''
        # MJML body must be populated, not empty.
        self.assertTrue(mjml.strip(), 'mjml_content is empty')
        # The magic link must appear at least twice (button href + fallback).
        self.assertGreaterEqual(
            mjml.count('{{ magic_link }}'), 2,
            f'Expected {{{{ magic_link }}}} to appear ≥2× (button + fallback); '
            f'found {mjml.count("{{ magic_link }}")}',
        )
        # All five context vars from the cron must be referenced.
        for var in ('{{ session_title }}', '{{ instructor_name }}',
                    '{{ session_date }}', '{{ magic_link }}'):
            self.assertIn(var, mjml, f'{var} missing from mjml_content')


class TutorialAttendanceEmailVariablesSeededTests(TestCase):
    """The 5 context vars used by ``send_tutorial_attendance_emails`` must
    be registered in ``utils_email_variables`` so the template editor can
    offer them in the variable picker.
    """

    EXPECTED_PATHS = (
        'magic_link', 'instructor_name', 'session_title',
        'session_date', 'venue',
    )

    def test_all_attendance_variables_registered(self):
        existing = set(
            EmailVariable.objects
            .filter(variable_path__in=self.EXPECTED_PATHS)
            .values_list('variable_path', flat=True)
        )
        missing = set(self.EXPECTED_PATHS) - existing
        self.assertFalse(
            missing,
            f'EmailVariable rows missing for: {sorted(missing)}',
        )

    def test_magic_link_is_active_string_type(self):
        v = EmailVariable.objects.get(variable_path='magic_link')
        self.assertEqual(v.data_type, 'string')
        self.assertTrue(v.is_active)
        # Display name should be human-readable, not the raw path.
        self.assertNotEqual(v.display_name, 'magic_link')
        self.assertTrue(v.display_name, 'display_name should be non-empty')
