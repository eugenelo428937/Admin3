from django.test import TestCase
from email_system.models import ClosingSalutation
from email_system.serializers import ClosingSalutationSerializer, ClosingSalutationListSerializer
from staff.models import Team


class ClosingSalutationSerializerTest(TestCase):
    def setUp(self):
        self.team = Team.objects.create(
            name='test_team',
            display_name='The Test Team',
        )
        self.salutation = ClosingSalutation.objects.create(
            name='test_salutation',
            display_name='Test',
            sign_off_text='Best regards',
            signature_type='team',
            team=self.team,
        )

    def test_list_serializer_fields(self):
        serializer = ClosingSalutationListSerializer(self.salutation)
        data = serializer.data
        self.assertEqual(data['name'], 'test_salutation')
        self.assertEqual(data['sign_off_text'], 'Best regards')
        self.assertEqual(data['signature_type'], 'team')
        self.assertNotIn('staff_members', data)

    def test_detail_serializer_includes_staff_members(self):
        serializer = ClosingSalutationSerializer(self.salutation)
        data = serializer.data
        self.assertIn('staff_members', data)
        self.assertEqual(data['staff_members'], [])

    def test_detail_serializer_create(self):
        team2 = Team.objects.create(name='new_team', display_name='New Team')
        data = {
            'name': 'new_salutation',
            'display_name': 'New',
            'sign_off_text': 'Cheers',
            'signature_type': 'team',
            'team': team2.id,
        }
        serializer = ClosingSalutationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.name, 'new_salutation')
