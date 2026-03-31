from django.test import TestCase
from email_system.models import ClosingSalutation
from email_system.serializers import ClosingSalutationSerializer, ClosingSalutationListSerializer


class ClosingSalutationSerializerTest(TestCase):
    def setUp(self):
        self.salutation = ClosingSalutation.objects.create(
            name='test_salutation',
            display_name='The ActEd Team',
            sign_off_text='Best regards',
            job_title='',
        )

    def test_list_serializer_fields(self):
        serializer = ClosingSalutationListSerializer(self.salutation)
        data = serializer.data
        self.assertEqual(data['name'], 'test_salutation')
        self.assertEqual(data['display_name'], 'The ActEd Team')
        self.assertEqual(data['sign_off_text'], 'Best regards')
        self.assertEqual(data['job_title'], '')
        self.assertNotIn('signature_type', data)
        self.assertNotIn('team', data)
        self.assertNotIn('staff', data)

    def test_detail_serializer_fields(self):
        serializer = ClosingSalutationSerializer(self.salutation)
        data = serializer.data
        self.assertIn('job_title', data)
        self.assertNotIn('signature_type', data)
        self.assertNotIn('team', data)
        self.assertNotIn('staff', data)

    def test_detail_serializer_create(self):
        data = {
            'name': 'new_salutation',
            'display_name': 'Eugene',
            'sign_off_text': 'Cheers',
            'job_title': 'IT',
        }
        serializer = ClosingSalutationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.name, 'new_salutation')
        self.assertEqual(instance.job_title, 'IT')

    def test_detail_serializer_update(self):
        data = {'job_title': 'Senior Developer'}
        serializer = ClosingSalutationSerializer(self.salutation, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.job_title, 'Senior Developer')
