from django.test import TestCase
from email_system.models import ClosingSalutation


class ClosingSalutationModelTest(TestCase):
    """Tests for simplified ClosingSalutation model."""

    def test_create_salutation(self):
        sal = ClosingSalutation.objects.create(
            name='team_sal',
            display_name='The ActEd Team',
            sign_off_text='Kind Regards',
            job_title='',
        )
        sal.refresh_from_db()
        self.assertEqual(sal.name, 'team_sal')
        self.assertEqual(sal.display_name, 'The ActEd Team')
        self.assertEqual(sal.sign_off_text, 'Kind Regards')
        self.assertEqual(sal.job_title, '')
        self.assertTrue(sal.is_active)

    def test_create_with_job_title(self):
        sal = ClosingSalutation.objects.create(
            name='staff_sal',
            display_name='Eugene',
            sign_off_text='Best Wishes',
            job_title='IT',
        )
        self.assertEqual(sal.job_title, 'IT')

    def test_sign_off_text_default(self):
        sal = ClosingSalutation.objects.create(
            name='default_sal',
            display_name='Default',
        )
        self.assertEqual(sal.sign_off_text, 'Kind Regards')

    def test_str_representation(self):
        sal = ClosingSalutation.objects.create(
            name='str_sal',
            display_name='The ActEd Team',
        )
        self.assertEqual(str(sal), 'The ActEd Team')

    def test_unique_name(self):
        from django.db import IntegrityError
        ClosingSalutation.objects.create(name='unique_sal', display_name='First')
        with self.assertRaises(IntegrityError):
            ClosingSalutation.objects.create(name='unique_sal', display_name='Second')

    def test_db_table_name(self):
        self.assertEqual(ClosingSalutation._meta.db_table, 'utils_email_closing_salutation')

    def test_ordering(self):
        self.assertEqual(ClosingSalutation._meta.ordering, ['name'])

    def test_no_signature_type_field(self):
        """signature_type field should no longer exist."""
        self.assertFalse(
            any(f.name == 'signature_type' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_team_field(self):
        """team FK should no longer exist."""
        self.assertFalse(
            any(f.name == 'team' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_staff_field(self):
        """staff FK should no longer exist."""
        self.assertFalse(
            any(f.name == 'staff' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_team_signature_field(self):
        """team_signature field should not exist."""
        self.assertFalse(
            any(f.name == 'team_signature' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_staff_name_format_field(self):
        """staff_name_format field should not exist."""
        self.assertFalse(
            any(f.name == 'staff_name_format' for f in ClosingSalutation._meta.get_fields())
        )
