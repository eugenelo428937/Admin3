"""
Stage 2 TDD Tests: RuleFields (Schema Validation)
- Verify schema is stored as JSON
- Verify valid context passes schema validation
- Verify missing/extra/wrong type fields trigger validation errors
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from rules_engine.models.acted_rules_fields import ActedRulesFields
import jsonschema
from jsonschema import ValidationError as JsonSchemaValidationError


class Stage2RuleFieldsTests(TestCase):
    """TDD Stage 2: RuleFields Schema Validation Tests"""

    def setUp(self):
        """Set up test data"""
        # Clean up any data from previous test runs (important for --keepdb)
        ActedRulesFields.objects.all().delete()

        self.valid_schema_data = {
            'fields_code': 'checkout_context_v1',
            'name': 'Checkout Context Schema',
            'description': 'Schema for checkout process context validation',
            'schema': {
                'type': 'object',
                'properties': {                    
                    'cart': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer'},
                            'user': {'type': ['integer', 'null']},
                            'session_key': {'type': ['string', 'null']},
                            'items': {
                                'type': 'array',
                                'item': {
                                    'type': 'object',
                                    'properties': {
                                        'id': {'type': 'integer'},
                                        'current_product': {'type': 'integer'},
                                        'product_id': {'type': 'integer'},
                                        'product_name': {'type': 'string'},
                                        'product_code': {'type': 'string'},
                                        'subject_code': {'type': 'string'},
                                        'exam_session_code': {'type': 'string'},
                                        'product_type': {'type': 'string'},
                                        'quantity': {'type': 'integer', 'minimum': 1},
                                        'price_type': {'type': 'string'},
                                        'actual_price': {'type': 'string'},
                                        'metadata': {
                                            'type': 'object',
                                            'properties': {
                                                'variationId': {'type': 'integer'},
                                                'variationName': {'type': 'string'}
                                            },
                                            'required': ['variationId']
                                        },
                                        'is_marking': {'type': 'boolean'},
                                        'has_expired_deadline': {'type': 'boolean'}
                                    },
                                    'required': ['id', 'current_product', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata']
                                }
                            },
                            'total': {'type': 'number', 'minimum': 0},
                            'created_at': {'type': 'string'},
                            'updated_at': {'type': 'string'},
                            'has_marking': {'type': 'boolean'},
                            'has_material': {'type': 'boolean'},
                            'has_tutorial': {'type': 'boolean'},
                        },
                        'required': ['id','user','session_key','items']
                    }
                },
                'required': ['cart']
            },
            'version': 1,
            'is_active': True
        }
        
        self.valid_context = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': None,
                'items': [
                    {
                        'id': 425,
                        'current_product': 2763,
                        'product_id': 117,
                        'product_name': 'Series X Assignments (Marking)',
                        'product_code': 'X',
                        'subject_code': 'CB2',
                        'exam_session_code': '25A',
                        'product_type': 'marking',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '35.00',
                        'metadata': {
                            'variationId': 6,
                            'variationName': 'Marking Product'
                        },
                        'is_marking': True,
                        'has_expired_deadline': True
                    }
                ],
                'total': 35.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': True
            }
        }
    
    def test_schema_creation_and_json_storage(self):
        """
        TDD RED: Test schema can be created and stored as JSON
        Expected to FAIL initially - no JSON field implementation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Verify it was saved
        self.assertIsNotNone(schema_obj.id)
        self.assertEqual(schema_obj.fields_code, 'checkout_context_v1')
        self.assertIsInstance(schema_obj.schema, dict)

        # Verify JSON schema structure
        self.assertEqual(schema_obj.schema['type'], 'object')
        self.assertIn('cart', schema_obj.schema['properties'])

        # Verify it can be fetched from DB
        fetched = ActedRulesFields.objects.get(fields_code='checkout_context_v1')
        self.assertEqual(fetched.schema['type'], 'object')
    
    def test_unique_fields_code_constraint(self):
        """
        TDD RED: Test that duplicate fields_code are not allowed
        Expected to FAIL initially - no unique constraint
        """
        # Create first schema
        ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Attempt to create duplicate - should raise IntegrityError
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            ActedRulesFields.objects.create(**self.valid_schema_data)
    
    def test_valid_context_passes_schema_validation(self):
        """
        TDD RED: Test that valid context passes schema validation
        Expected to FAIL initially - no validation method
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Should not raise any exceptions
        try:
            jsonschema.validate(self.valid_context, schema_obj.schema)
        except JsonSchemaValidationError:
            self.fail("Valid context should pass schema validation")
    
    def test_missing_required_field_triggers_validation_error(self):
        """
        TDD RED: Test that missing required fields trigger validation errors
        Expected to FAIL initially - no validation implementation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Test missing required 'user' field in cart
        invalid_context_missing_user = {
            'cart': {
                'id': 196,
                'session_key': None,
                'items': []
                # Missing 'user' field which is required in cart
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_missing_user, schema_obj.schema)
        
        self.assertIn("'user' is a required property", str(cm.exception))
        
        # Test missing required 'cart' field
        invalid_context_missing_cart = {
            # Missing 'cart' field which is required at root level
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_missing_cart, schema_obj.schema)
        
        self.assertIn("'cart' is a required property", str(cm.exception))
    
    def test_missing_nested_required_field_triggers_validation_error(self):
        """
        TDD RED: Test that missing nested required fields trigger validation errors
        Expected to FAIL initially - no nested validation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Test missing required 'user.id' field
        invalid_context = {
            'user': {
                'region': 'EU'  # Missing required 'id'
            },
            'cart': {
                'items': [],
                'total': 0
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context, schema_obj.schema)
        
        self.assertIn("'id' is a required property", str(cm.exception))
    
    def test_wrong_type_fields_trigger_validation_error(self):
        """
        TDD RED: Test that wrong type fields trigger validation errors
        Expected to FAIL initially - no type validation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Test wrong type for cart.total (string instead of number)
        invalid_context_wrong_type = {            
            'cart': {
                'id': 196,
                'user': 1,
                'session_key': None,
                'items': [],
                'total': '59.99'  # Should be number, not string
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_wrong_type, schema_obj.schema)
        
        self.assertIn("is not of type 'number'", str(cm.exception))
        
        # Test another wrong type case
        invalid_context_wrong_total = {
            'cart': {
                'id': 196,
                'user': 1,
                'session_key': None,
                'items': [],
                'total': 'fifty-nine-ninety-nine'  # Should be number, not string
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_wrong_total, schema_obj.schema)
        
        self.assertIn("is not of type 'number'", str(cm.exception))
    
    def test_extra_fields_allowed_by_default(self):
        """
        TDD RED: Test that extra fields are allowed by default
        Expected to FAIL initially - no additionalProperties handling
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Add extra fields that are not in schema
        context_with_extra = self.valid_context.copy()
        context_with_extra['extra_field'] = 'some_value'
        context_with_extra['cart']['extra_user_field'] = 'items_value'
        
        # Should not raise exceptions (additionalProperties: true by default)
        try:
            jsonschema.validate(context_with_extra, schema_obj.schema)
        except JsonSchemaValidationError:
            self.fail("Extra fields should be allowed by default")
    
    def test_strict_schema_rejects_extra_fields(self):
        """
        TDD RED: Test that strict schema rejects extra fields
        Expected to FAIL initially - no strict validation option
        """
        # Create schema with additionalProperties: false
        strict_schema_data = self.valid_schema_data.copy()
        strict_schema_data['fields_code'] = 'strict_checkout_v1'
        strict_schema_data['schema']['additionalProperties'] = False        
        strict_schema_data['schema']['properties']['cart']['additionalProperties'] = False
        
        schema_obj = ActedRulesFields.objects.create(**strict_schema_data)
        
        # Add extra field at root level
        context_with_extra_root = self.valid_context.copy()
        context_with_extra_root['unauthorized_field'] = 'value'
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(context_with_extra_root, schema_obj.schema)
        
        self.assertIn("Additional properties are not allowed", str(cm.exception))
    
    def test_minimum_value_constraint_validation(self):
        """
        TDD RED: Test that minimum value constraints are validated
        Expected to FAIL initially - no constraint validation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
               
        # Test negative cart total (violates minimum: 0)
        invalid_context_negative_total = {            
            'cart': {
                'user': 1,
                'id': 196,
                'session_key': None,
                'items': [],
                'total': -10.50  # Violates minimum: 0
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_negative_total, schema_obj.schema)
        
        self.assertIn("is less than the minimum of 0", str(cm.exception))
    
    def test_array_type_validation(self):
        """
        TDD RED: Test that array types are properly validated
        Expected to FAIL initially - no array validation
        """
        schema_obj = ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Test wrong type for cart.items (should be array)
        invalid_context_wrong_items = {            
            'cart': {
                'items': 'not_an_array',  # Should be array
                'total': 59.99,
                'user': 1,
                'id': 196,
                'session_key': None,
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context_wrong_items, schema_obj.schema)
        
        self.assertIn("is not of type 'array'", str(cm.exception))
    
    def test_schema_version_tracking(self):
        """
        TDD RED: Test that schema versions are properly tracked
        Expected to FAIL initially - no versioning implementation
        """
        # Create version 1
        schema_v1 = ActedRulesFields.objects.create(**self.valid_schema_data)
        self.assertEqual(schema_v1.version, 1)
        
        # Create version 2 with different fields_code
        schema_data_v2 = self.valid_schema_data.copy()
        schema_data_v2['fields_code'] = 'checkout_context_v2'
        schema_data_v2['version'] = 2
        schema_data_v2['schema']['properties']['cart']['properties']['id'] = {'type': 'integer'}
        
        schema_v2 = ActedRulesFields.objects.create(**schema_data_v2)
        self.assertEqual(schema_v2.version, 2)
        
        # Verify both versions exist
        all_schemas = ActedRulesFields.objects.all().order_by('version')
        self.assertEqual(all_schemas.count(), 2)
        self.assertEqual(all_schemas[0].version, 1)
        self.assertEqual(all_schemas[1].version, 2)
    
    def test_inactive_schema_filtering(self):
        """
        TDD RED: Test that inactive schemas can be filtered out
        Expected to FAIL initially - no is_active filtering
        """
        # Create active schema
        ActedRulesFields.objects.create(**self.valid_schema_data)
        
        # Create inactive schema
        inactive_schema_data = self.valid_schema_data.copy()
        inactive_schema_data['fields_code'] = 'inactive_schema'
        inactive_schema_data['is_active'] = False
        ActedRulesFields.objects.create(**inactive_schema_data)
        
        # Filter only active schemas
        active_schemas = ActedRulesFields.objects.filter(is_active=True)
        self.assertEqual(active_schemas.count(), 1)
        self.assertEqual(active_schemas.first().fields_code, 'checkout_context_v1')
        
        # Verify inactive schema exists but is filtered out
        all_schemas = ActedRulesFields.objects.all()
        self.assertEqual(all_schemas.count(), 2)
    
    def test_schema_string_representation(self):
        """
        TDD RED: Test schema string representation includes version
        Expected to FAIL initially - no __str__ method with version
        """
        schema_obj = ActedRulesFields(**self.valid_schema_data)
        expected_str = "Checkout Context Schema (v1)"
        self.assertEqual(str(schema_obj), expected_str)