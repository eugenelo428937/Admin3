from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status as http_status
from email_system.models import ClosingSalutation, EmailTemplate
from staff.models import Team


class ClosingSalutationViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.team = Team.objects.create(
            name='test_team',
            display_name='Test Team',
        )

        self.salutation = ClosingSalutation.objects.create(
            name='test_sal',
            display_name='Test',
            sign_off_text='Best',
            signature_type='team',
            team=self.team,
        )

    def test_list_salutations(self):
        response = self.client.get('/api/email/closing-salutations/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_create_salutation(self):
        team2 = Team.objects.create(name='new_team', display_name='New Team')
        data = {
            'name': 'new_sal',
            'display_name': 'New',
            'sign_off_text': 'Cheers',
            'signature_type': 'team',
            'team': team2.id,
        }
        response = self.client.post('/api/email/closing-salutations/', data, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)

    def test_retrieve_salutation(self):
        response = self.client.get(f'/api/email/closing-salutations/{self.salutation.id}/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'test_sal')

    def test_update_salutation(self):
        response = self.client.patch(
            f'/api/email/closing-salutations/{self.salutation.id}/',
            {'sign_off_text': 'Warm regards'},
            format='json',
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.salutation.refresh_from_db()
        self.assertEqual(self.salutation.sign_off_text, 'Warm regards')

    def test_signature_mjml_endpoint(self):
        template = EmailTemplate.objects.create(
            name='test_tmpl',
            display_name='Test Template',
            subject_template='Test',
            closing_salutation=self.salutation,
        )
        response = self.client.get(f'/api/email/templates/{template.id}/signature-mjml/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('signature_mjml', response.data)
        self.assertIn('Best,', response.data['signature_mjml'])
        self.assertIn('Test Team', response.data['signature_mjml'])

    def test_signature_mjml_returns_empty_when_no_salutation(self):
        template = EmailTemplate.objects.create(
            name='no_sal_tmpl',
            display_name='No Salutation',
            subject_template='Test',
        )
        response = self.client.get(f'/api/email/templates/{template.id}/signature-mjml/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['signature_mjml'], '')

    def test_mjml_shell_includes_signature_placeholder(self):
        response = self.client.get('/api/email/templates/mjml-shell/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('<!-- SIGNATURE_PLACEHOLDER -->', response.data['shell'])
        # Verify ordering: content before signature before footer
        shell = response.data['shell']
        content_pos = shell.index('<!-- CONTENT_PLACEHOLDER -->')
        sig_pos = shell.index('<!-- SIGNATURE_PLACEHOLDER -->')
        footer_pos = shell.index('Mctimoney House')  # footer content
        self.assertLess(content_pos, sig_pos)
        self.assertLess(sig_pos, footer_pos)

    def test_non_superuser_denied(self):
        regular = User.objects.create_user('regular', 'reg@test.com', 'pass')
        client = APIClient()
        client.force_authenticate(user=regular)
        response = client.get('/api/email/closing-salutations/')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
