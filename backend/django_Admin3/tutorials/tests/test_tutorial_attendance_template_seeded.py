"""Verify the tutorial_attendance_reminder template is seeded by migration."""
from django.test import TestCase

from email_system.models import EmailTemplate


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
