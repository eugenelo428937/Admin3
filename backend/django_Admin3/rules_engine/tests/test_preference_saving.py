"""
Test for preference saving functionality
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from rules_engine.models import ActedRule, UserAcknowledgment

User = get_user_model()


class TestPreferenceSaving(APITestCase):
    """Test saving user preferences creates appropriate UserAcknowledgment records"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_save_preferences_creates_acknowledgments(self):
        """Test that saving preferences creates UserAcknowledgment records"""
        # Save preferences
        url = reverse('rules-preferences')
        data = {
            'preferences': {
                'newsletter': True,
                'promotions': False
            },
            'user_id': str(self.user.id)
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that UserAcknowledgment records were created
        acknowledgments = UserAcknowledgment.objects.filter(
            user=self.user,
            acknowledgment_type='preference'
        )
        
        # Should have 2 acknowledgments - one for each preference
        self.assertEqual(acknowledgments.count(), 2)
        
        # Check that ActedRule records were created for each preference
        newsletter_rule = ActedRule.objects.filter(
            name__startswith='Preference: newsletter'
        ).first()
        self.assertIsNotNone(newsletter_rule)
        self.assertEqual(newsletter_rule.entry_point, 'user_preferences')
        
        promotions_rule = ActedRule.objects.filter(
            name__startswith='Preference: promotions'
        ).first()
        self.assertIsNotNone(promotions_rule)
        self.assertEqual(promotions_rule.entry_point, 'user_preferences')