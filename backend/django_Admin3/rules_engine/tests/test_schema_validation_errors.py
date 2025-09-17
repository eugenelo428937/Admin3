"""
Tests for schema validation error handling in rules engine
"""
import json
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User

from ..models import ActedRule, ActedRulesFields
from ..services.rule_engine import rule_engine


class SchemaValidationErrorTest(TestCase):
    """Test proper error handling for schema validation failures"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a schema that requires specific fields
        self.rules_fields = ActedRulesFields.objects.create(
            fields_id='test_schema_validation',
            name='Test Schema Validation',
            description='Test schema for validation errors',
            schema={
                "type": "object",
                "properties": {
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "email": {"type": "string"}
                        },
                        "required": ["id", "email"]
                    },
                    "cart": {
                        "type": "object",
                        "properties": {
                            "total": {"type": "number"},
                            "items": {"type": "array"}
                        },
                        "required": ["total", "items"]
                    }
                },
                "required": ["user", "cart"]
            },
            is_active=True
        )
        
        # Create a rule that uses this schema
        self.rule = ActedRule.objects.create(
            rule_id='test_schema_validation_rule',
            name='Test Schema Validation Rule',
            entry_point='checkout_start',
            priority=10,
            active=True,
            rules_fields_id='test_schema_validation',
            condition={"always": True},
            actions=[{
                "type": "display_message",
                "title": "Test Message",
                "content": "This should not be shown on schema error"
            }]
        )

    def test_schema_validation_error_returns_proper_error_response(self):
        """Test that schema validation failures return proper error response to frontend"""
        # This test should FAIL initially because current implementation 
        # skips invalid rules instead of returning schema validation errors
        
        url = reverse('rules_engine-execute-rules')
        
        # Send context that violates the schema (missing required cart field)
        invalid_context = {
            'entry_point': 'checkout_start',
            'context': {
                'user': {
                    'id': 123,
                    'email': 'test@example.com'
                }
                # Missing required 'cart' field
            }
        }
        
        response = self.client.post(url, invalid_context, format='json')
        
        # Current implementation returns success=True even with schema validation errors
        # This test should FAIL because we want it to return an error response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('schema_validation_error', response_data)
        self.assertIn('required field missing', response_data['schema_validation_error'].lower())

    def test_multiple_schema_validation_errors(self):
        """Test that multiple schema validation errors are properly reported"""
        url = reverse('rules_engine-execute-rules')
        
        # Send context with multiple schema violations
        invalid_context = {
            'entry_point': 'checkout_start',
            'context': {
                'user': {
                    'id': 'not_an_integer',  # Wrong type
                    # Missing required 'email' field
                },
                'cart': {
                    'total': 'not_a_number',  # Wrong type
                    # Missing required 'items' field
                }
            }
        }
        
        response = self.client.post(url, invalid_context, format='json')
        
        # Should return 400 with detailed schema validation errors
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('schema_validation_errors', response_data)
        self.assertIsInstance(response_data['schema_validation_errors'], list)
        self.assertGreater(len(response_data['schema_validation_errors']), 1)

    def test_no_schema_validation_when_rules_fields_id_is_none(self):
        """Test that rules without schema validation still work normally"""
        # Create rule without schema validation
        rule_no_schema = ActedRule.objects.create(
            rule_id='test_no_schema_rule',
            name='Test No Schema Rule',
            entry_point='test_no_schema',
            priority=10,
            active=True,
            rules_fields_id=None,  # No schema validation
            condition={"always": True},
            actions=[{
                "type": "display_message",
                "title": "Test Message",
                "content": "This should work without schema"
            }]
        )
        
        url = reverse('rules_engine-execute-rules')
        
        # Send any context - should work fine
        context = {
            'entry_point': 'test_no_schema',
            'context': {
                'arbitrary': 'data',
                'can': {'be': 'anything'}
            }
        }
        
        response = self.client.post(url, context, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['rules_evaluated'], 1)

    def test_valid_schema_works_normally(self):
        """Test that valid schema validation works as expected"""
        url = reverse('rules_engine-execute-rules')
        
        # Send valid context that matches the schema
        valid_context = {
            'entry_point': 'checkout_start',
            'context': {
                'user': {
                    'id': 123,
                    'email': 'test@example.com'
                },
                'cart': {
                    'total': 99.99,
                    'items': [{'product_id': 1, 'quantity': 2}]
                }
            }
        }
        
        response = self.client.post(url, valid_context, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['rules_evaluated'], 1)
        self.assertEqual(len(response_data['messages']), 1)