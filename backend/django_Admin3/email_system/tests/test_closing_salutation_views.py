from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status as http_status
from email_system.models import ClosingSalutation, EmailTemplate, EmailMasterComponent


class ClosingSalutationViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.salutation = ClosingSalutation.objects.create(
            name='test_sal',
            display_name='The ActEd Team',
            sign_off_text='Best',
            job_title='',
        )

        # Ensure DB master components have content for mjml-shell endpoint
        for name in ('banner', 'styles', 'footer'):
            content = f'<mj-section><!-- {name} -->Mctimoney House</mj-section>' if name == 'footer' else f'<mj-section><!-- {name} --></mj-section>'
            EmailMasterComponent.objects.update_or_create(
                name=name,
                defaults={
                    'component_type': name,
                    'display_name': name.title(),
                    'is_active': True,
                    'mjml_content': content,
                },
            )

    def test_list_salutations(self):
        response = self.client.get('/api/email/closing-salutations/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_create_salutation(self):
        data = {
            'name': 'new_sal',
            'display_name': 'Eugene',
            'sign_off_text': 'Cheers',
            'job_title': 'IT',
        }
        response = self.client.post('/api/email/closing-salutations/', data, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(response.data['job_title'], 'IT')

    def test_retrieve_salutation(self):
        response = self.client.get(f'/api/email/closing-salutations/{self.salutation.id}/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'test_sal')
        self.assertNotIn('signature_type', response.data)

    def test_update_salutation(self):
        response = self.client.patch(
            f'/api/email/closing-salutations/{self.salutation.id}/',
            {'sign_off_text': 'Warm regards', 'job_title': 'Senior Tutor'},
            format='json',
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.salutation.refresh_from_db()
        self.assertEqual(self.salutation.sign_off_text, 'Warm regards')
        self.assertEqual(self.salutation.job_title, 'Senior Tutor')

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
        self.assertIn('Best', response.data['signature_mjml'])
        self.assertIn('The ActEd Team', response.data['signature_mjml'])
        self.assertEqual(response.data['sign_off_text'], 'Best')
        self.assertEqual(response.data['display_name'], 'The ActEd Team')

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
