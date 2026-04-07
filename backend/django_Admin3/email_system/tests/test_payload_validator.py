"""Tests for payload validation against template schemas."""
from django.test import TestCase
from email_system.services.payload_validator import validate_payload


class PayloadValidatorTest(TestCase):
    """Unit tests for the validate_payload function."""

    def test_empty_schema_accepts_anything(self):
        errors = validate_payload({'foo': 'bar'}, {})
        self.assertEqual(errors, {})

    def test_valid_flat_payload(self):
        schema = {
            'name': {'type': 'string', 'required': True},
            'age': {'type': 'int', 'required': False},
        }
        errors = validate_payload({'name': 'Alice', 'age': 25}, schema)
        self.assertEqual(errors, {})

    def test_missing_required_field(self):
        schema = {
            'name': {'type': 'string', 'required': True},
        }
        errors = validate_payload({}, schema)
        self.assertIn('name', errors)
        self.assertIn('Required field is missing', errors['name'])

    def test_missing_required_with_default_still_errors(self):
        """Required means the API caller must provide the value, even if a default exists."""
        schema = {
            'name': {'type': 'string', 'required': True, 'default': 'anon'},
        }
        errors = validate_payload({}, schema)
        self.assertIn('name', errors)
        self.assertIn('Required field is missing', errors['name'])

    def test_missing_optional_field_passes(self):
        schema = {
            'nickname': {'type': 'string', 'required': False},
        }
        errors = validate_payload({}, schema)
        self.assertEqual(errors, {})

    def test_wrong_type_string(self):
        schema = {'name': {'type': 'string', 'required': False}}
        errors = validate_payload({'name': 123}, schema)
        self.assertIn('name', errors)
        self.assertIn("Expected type 'string'", errors['name'])

    def test_wrong_type_int(self):
        schema = {'count': {'type': 'int', 'required': False}}
        errors = validate_payload({'count': 'five'}, schema)
        self.assertIn('count', errors)

    def test_wrong_type_float(self):
        schema = {'amount': {'type': 'float', 'required': False}}
        errors = validate_payload({'amount': 'ten'}, schema)
        self.assertIn('amount', errors)

    def test_int_accepted_as_float(self):
        schema = {'amount': {'type': 'float', 'required': False}}
        errors = validate_payload({'amount': 10}, schema)
        self.assertEqual(errors, {})

    def test_bool_not_accepted_as_int(self):
        schema = {'count': {'type': 'int', 'required': False}}
        errors = validate_payload({'count': True}, schema)
        self.assertIn('count', errors)

    def test_wrong_type_bool(self):
        schema = {'active': {'type': 'bool', 'required': False}}
        errors = validate_payload({'active': 1}, schema)
        self.assertIn('active', errors)

    def test_nested_object_valid(self):
        schema = {
            'user': {
                'first_name': {'type': 'string', 'required': True},
                'age': {'type': 'int', 'required': False},
            }
        }
        errors = validate_payload({'user': {'first_name': 'Bob', 'age': 30}}, schema)
        self.assertEqual(errors, {})

    def test_nested_missing_required(self):
        schema = {
            'user': {
                'first_name': {'type': 'string', 'required': True},
            }
        }
        errors = validate_payload({'user': {}}, schema)
        self.assertIn('user.first_name', errors)

    def test_nested_parent_missing_reports_child_errors(self):
        schema = {
            'user': {
                'first_name': {'type': 'string', 'required': True},
            }
        }
        errors = validate_payload({}, schema)
        self.assertIn('user.first_name', errors)

    def test_nested_parent_wrong_type(self):
        schema = {
            'user': {
                'first_name': {'type': 'string', 'required': True},
            }
        }
        errors = validate_payload({'user': 'not-a-dict'}, schema)
        self.assertIn('user', errors)
        self.assertIn('Expected object', errors['user'])

    def test_extra_fields_allowed(self):
        schema = {'name': {'type': 'string', 'required': True}}
        errors = validate_payload({'name': 'Alice', 'extra': 'ok'}, schema)
        self.assertEqual(errors, {})

    def test_null_value_required_no_default(self):
        schema = {'name': {'type': 'string', 'required': True}}
        errors = validate_payload({'name': None}, schema)
        self.assertIn('name', errors)
        self.assertIn('null', errors['name'])

    def test_null_value_required_with_default_still_errors(self):
        """Required means the API caller must provide a non-null value."""
        schema = {'name': {'type': 'string', 'required': True, 'default': 'anon'}}
        errors = validate_payload({'name': None}, schema)
        self.assertIn('name', errors)

    def test_multiple_errors_reported(self):
        schema = {
            'name': {'type': 'string', 'required': True},
            'age': {'type': 'int', 'required': True},
        }
        errors = validate_payload({}, schema)
        self.assertEqual(len(errors), 2)
        self.assertIn('name', errors)
        self.assertIn('age', errors)
