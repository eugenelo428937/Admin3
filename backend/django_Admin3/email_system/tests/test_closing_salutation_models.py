from django.test import TestCase
from django.contrib.auth.models import User
from email_system.models import ClosingSalutation, ClosingSalutationStaff
from staff.models import Staff, Team


class ClosingSalutationModelTest(TestCase):
    """Tests for revised ClosingSalutation with Team FK."""

    def setUp(self):
        self.team = Team.objects.create(
            name='acted_main',
            display_name='THE ACTUARIAL EDUCATION COMPANY (ActEd)',
            default_sign_off_text='Kind Regards',
        )

    def test_team_salutation(self):
        """Team salutation references Team model instead of string."""
        sal = ClosingSalutation.objects.create(
            name='team_sal',
            display_name='ActEd Team',
            signature_type='team',
            team=self.team,
        )
        self.assertEqual(sal.team, self.team)

    def test_sign_off_text_fallback_to_team(self):
        """When sign_off_text is blank, falls back to team's default."""
        sal = ClosingSalutation.objects.create(
            name='fallback_sal',
            display_name='Fallback',
            signature_type='team',
            team=self.team,
            sign_off_text='',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Kind Regards')

    def test_sign_off_text_override(self):
        """Explicit sign_off_text overrides team default."""
        sal = ClosingSalutation.objects.create(
            name='override_sal',
            display_name='Override',
            signature_type='team',
            team=self.team,
            sign_off_text='Best wishes',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Best wishes')

    def test_sign_off_text_ultimate_fallback(self):
        """Falls back to 'Kind Regards' when no sign_off_text and no team."""
        sal = ClosingSalutation.objects.create(
            name='no_team_sal',
            display_name='No Team',
            signature_type='staff',
            sign_off_text='',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Kind Regards')

    def test_staff_salutation_uses_staff_name_format(self):
        """Staff salutation respects staff.name_format instead of salutation-level field."""
        user = User.objects.create_user(
            username='sal_staff', password='testpass123',
            first_name='Jane', last_name='Doe',
        )
        staff = Staff.objects.create(user=user, name_format='first_name')
        sal = ClosingSalutation.objects.create(
            name='staff_sal',
            display_name='Staff Sal',
            signature_type='staff',
            sign_off_text='Cheers',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        # Verify render_mjml uses staff's name_format
        mjml = sal.render_mjml()
        self.assertIn('Jane', mjml)
        self.assertNotIn('Doe', mjml)

    def test_staff_salutation_with_job_title(self):
        """Staff with show_job_title=True includes job title in render."""
        user = User.objects.create_user(
            username='sal_jt', password='testpass123',
            first_name='Bob', last_name='Jones',
        )
        staff = Staff.objects.create(
            user=user, job_title='Senior Tutor', show_job_title=True,
        )
        sal = ClosingSalutation.objects.create(
            name='jt_sal',
            display_name='JT Sal',
            signature_type='staff',
            sign_off_text='Regards',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        mjml = sal.render_mjml()
        self.assertIn('Senior Tutor', mjml)

    def test_staff_salutation_without_job_title(self):
        """Staff with show_job_title=False omits job title."""
        user = User.objects.create_user(
            username='sal_nojt', password='testpass123',
            first_name='Eve', last_name='Wilson',
        )
        staff = Staff.objects.create(
            user=user, job_title='Tutor', show_job_title=False,
        )
        sal = ClosingSalutation.objects.create(
            name='nojt_sal',
            display_name='No JT',
            signature_type='staff',
            sign_off_text='Regards',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        mjml = sal.render_mjml()
        self.assertNotIn('Tutor', mjml)

    def test_no_team_signature_field(self):
        """team_signature field should no longer exist."""
        self.assertFalse(
            any(f.name == 'team_signature' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_staff_name_format_field(self):
        """staff_name_format field should no longer exist."""
        self.assertFalse(
            any(f.name == 'staff_name_format' for f in ClosingSalutation._meta.get_fields())
        )
