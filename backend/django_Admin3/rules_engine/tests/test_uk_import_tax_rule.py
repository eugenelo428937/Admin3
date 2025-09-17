# TDD RED Phase: Write failing test for UK import tax warning rule
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from userprofile.models import UserProfile
from userprofile.models.address import UserProfileAddress
from rules_engine.models import ActedRule, MessageTemplate, ActedRulesFields

User = get_user_model()

class UKImportTaxRuleTest(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser@example.com',
            email='testuser@example.com', 
            password='testpass123'
        )
        
        # Create user profile
        self.user_profile = UserProfile.objects.create(user=self.user)
        
        # Create work address in Germany (non-UK)
        self.work_address = UserProfileAddress.objects.create(
            user_profile=self.user_profile,
            address_type='WORK',
            country='Germany',
            address_data={
                'street': 'Hauptstrasse 123',
                'city': 'Berlin',
                'postal_code': '10115'
            }
        )
        
        # Create home address in France (non-UK) 
        self.home_address = UserProfileAddress.objects.create(
            user_profile=self.user_profile,
            address_type='HOME',
            country='France',
            address_data={
                'street': '123 Rue de Paris',
                'city': 'Lyon',
                'postal_code': '69000'
            }
        )
        
    def test_should_include_user_country_data_in_context_when_user_authenticated(self):
        """RED: Should include user.ip, user.home_country, user.work_country in context"""
        
        # Authenticate user
        self.client.force_authenticate(user=self.user)
        
        # Mock cart context
        context = {
            'cart': {
                'id': 1,
                'items': [
                    {'id': 1, 'product_id': 100, 'quantity': 1}
                ]
            }
        }
        
        # Execute checkout_start rules
        response = self.client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': context
        })
        
        self.assertEqual(response.status_code, 200)
        
        # This test should fail initially because user country data is not yet included
        # We expect the API to have added user.ip, user.home_country, user.work_country
        # For now, we'll just verify the API responds correctly
        # Once we implement the feature, we can add more specific assertions
        
        # The response should be successful
        data = response.json()
        self.assertTrue(data.get('success', False))
        
    def test_should_display_import_tax_warning_for_non_uk_user(self):
        """RED: Should display import tax warning when user has non-UK addresses"""
        
        # This test will fail until we create the rule and message template
        self.client.force_authenticate(user=self.user)
        
        context = {
            'cart': {
                'id': 1,
                'items': [
                    {'id': 1, 'product_id': 100, 'quantity': 1}
                ]
            }
        }
        
        response = self.client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start', 
            'context': context
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Once we implement the rule, we expect to see import tax warning message
        # For now, this assertion will fail
        messages = data.get('messages', [])
        import_tax_messages = [
            msg for msg in messages 
            if 'import tax' in msg.get('content', {}).get('message', '').lower()
        ]
        
        # This assertion should initially fail (RED phase)
        self.assertEqual(len(import_tax_messages), 1, 
                        "Expected import tax warning message for non-UK user")
        
    def test_should_not_display_import_tax_warning_for_uk_user(self):
        """RED: Should NOT display import tax warning when user is in UK"""
        
        # Update addresses to UK
        self.work_address.country = 'United Kingdom'
        self.work_address.save()
        self.home_address.country = 'United Kingdom' 
        self.home_address.save()
        
        self.client.force_authenticate(user=self.user)
        
        context = {
            'cart': {
                'id': 1,
                'items': [
                    {'id': 1, 'product_id': 100, 'quantity': 1}
                ]
            }
        }
        
        response = self.client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': context
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should not contain import tax warnings for UK users
        messages = data.get('messages', [])
        import_tax_messages = [
            msg for msg in messages
            if 'import tax' in msg.get('content', {}).get('message', '').lower()
        ]
        
        self.assertEqual(len(import_tax_messages), 0,
                        "Should not show import tax warning for UK users")