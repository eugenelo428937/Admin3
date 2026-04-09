"""Tests for EmailVariable model and EmailTemplate schema auto-generation.

After the versioning refactor, ``payload_schema`` and ``get_renderable_*``
helpers live on ``EmailTemplateVersion``. These tests drive content through
``make_template`` (which creates a template + an initial version) and then
read ``t.current_version.payload_schema`` etc.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from email_system.models import EmailTemplate, EmailVariable
from email_system.tests.factories import make_template


class EmailVariableModelTest(TestCase):
    """Tests for the EmailVariable model."""

    def test_create_variable(self):
        var = EmailVariable.objects.create(
            display_name='First Name',
            variable_path='user.first_name',
            data_type='string',
            default_value='student',
        )
        self.assertEqual(str(var), 'First Name (user.first_name)')
        self.assertTrue(var.is_active)

    def test_variable_path_unique(self):
        EmailVariable.objects.create(
            display_name='First Name',
            variable_path='user.first_name',
        )
        with self.assertRaises(Exception):
            EmailVariable.objects.create(
                display_name='Given Name',
                variable_path='user.first_name',
            )


class TemplateSchemaGenerationTest(TestCase):
    """Tests for auto-generating payload_schema on EmailTemplate save."""

    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@test.com', 'pass')
        EmailVariable.objects.create(
            display_name='First Name',
            variable_path='user.first_name',
            data_type='string',
            default_value='student',
        )
        EmailVariable.objects.create(
            display_name='Last Name',
            variable_path='user.last_name',
            data_type='string',
        )
        EmailVariable.objects.create(
            display_name='Pay Amount',
            variable_path='pay_amount',
            data_type='float',
        )

    _seq = 0

    def _create_template(self, **kwargs):
        # Unique name per call so repeated runs in the same test class don't collide
        TemplateSchemaGenerationTest._seq += 1
        defaults = {
            'name': f'test-template-{TemplateSchemaGenerationTest._seq}',
            'display_name': 'Test Template',
            'subject_template': 'Hello',
            'created_by': self.user,
        }
        defaults.update(kwargs)
        return make_template(**defaults)

    def test_no_variables_empty_schema(self):
        t = self._create_template(mjml_content='<p>No variables here</p>')
        self.assertEqual(t.current_version.payload_schema, {})

    def test_simple_variable_in_content(self):
        t = self._create_template(mjml_content='Hello {{user.first_name}}!')
        schema = t.current_version.payload_schema
        self.assertIn('user', schema)
        self.assertIn('first_name', schema['user'])
        self.assertEqual(schema['user']['first_name']['type'], 'string')
        self.assertFalse(schema['user']['first_name']['required'])

    def test_mandatory_variable(self):
        t = self._create_template(mjml_content='Hello {{!user.first_name}}!')
        schema = t.current_version.payload_schema
        self.assertTrue(schema['user']['first_name']['required'])

    def test_template_default_overrides_catalog(self):
        t = self._create_template(
            mjml_content='{{!user.first_name|default:"custom_default"}}'
        )
        schema = t.current_version.payload_schema
        self.assertEqual(schema['user']['first_name']['default'], 'custom_default')

    def test_catalog_default_used_when_no_template_default(self):
        t = self._create_template(mjml_content='{{user.first_name}}')
        schema = t.current_version.payload_schema
        self.assertEqual(schema['user']['first_name']['default'], 'student')

    def test_flat_variable(self):
        t = self._create_template(mjml_content='Total: {{pay_amount}}')
        schema = t.current_version.payload_schema
        self.assertIn('pay_amount', schema)
        self.assertEqual(schema['pay_amount']['type'], 'float')

    def test_variables_from_subject_template(self):
        t = self._create_template(
            subject_template='Order for {{!user.first_name}}',
            mjml_content='<p>Body</p>',
        )
        schema = t.current_version.payload_schema
        self.assertTrue(schema['user']['first_name']['required'])

    def test_variables_merged_across_fields(self):
        """If subject has {{user.first_name}} (optional) and body has {{!user.first_name}} (mandatory),
        mandatory wins."""
        t = self._create_template(
            subject_template='Hi {{user.first_name}}',
            mjml_content='Dear {{!user.first_name}},',
        )
        schema = t.current_version.payload_schema
        self.assertTrue(schema['user']['first_name']['required'])

    def test_unknown_variable_defaults_to_string(self):
        t = self._create_template(mjml_content='{{unknown.field}}')
        schema = t.current_version.payload_schema
        self.assertEqual(schema['unknown']['field']['type'], 'string')

    def test_multiple_variables_nested(self):
        t = self._create_template(
            mjml_content='{{!user.first_name}} {{user.last_name}} owes {{pay_amount}}'
        )
        schema = t.current_version.payload_schema
        self.assertIn('user', schema)
        self.assertIn('first_name', schema['user'])
        self.assertIn('last_name', schema['user'])
        self.assertIn('pay_amount', schema)

    def test_schema_rebuilt_on_update(self):
        """A fresh version rebuilds payload_schema from its own content."""
        t = self._create_template(mjml_content='{{user.first_name}}')
        self.assertIn('user', t.current_version.payload_schema)

        t.create_version(mjml_content='<p>No variables now</p>')
        self.assertEqual(t.current_version.payload_schema, {})

    def test_basic_mode_content_parsed(self):
        t = self._create_template(
            mjml_content='',
            basic_mode_content='Hello {{!user.first_name}}!',
        )
        schema = t.current_version.payload_schema
        self.assertTrue(schema['user']['first_name']['required'])

    def test_whitespace_tolerant_syntax(self):
        """Spaces around !, variable path, and | should be accepted."""
        t = self._create_template(
            mjml_content='{{ !user.first_name | default:"Marker " }}'
        )
        schema = t.current_version.payload_schema
        self.assertIn('user', schema)
        self.assertTrue(schema['user']['first_name']['required'])
        self.assertEqual(schema['user']['first_name']['default'], 'Marker ')

    def test_whitespace_optional_variable(self):
        t = self._create_template(mjml_content='{{ user.last_name }}')
        schema = t.current_version.payload_schema
        self.assertIn('user', schema)
        self.assertFalse(schema['user']['last_name']['required'])

    def test_get_renderable_content_strips_required_marker(self):
        """get_renderable_content strips ! so Django template engine can render."""
        t = self._create_template(
            mjml_content='Hello {{ !user.first_name | default:"Marker" }}!'
        )
        renderable = t.current_version.get_renderable_content()
        self.assertNotIn('{{!', renderable)
        self.assertNotIn('{{ !', renderable)
        self.assertIn('{{ user.first_name', renderable)

    def test_get_renderable_content_leaves_optional_unchanged(self):
        t = self._create_template(mjml_content='Hello {{user.first_name}}!')
        renderable = t.current_version.get_renderable_content()
        self.assertIn('{{user.first_name}}', renderable)

    def test_get_renderable_subject_strips_required_marker(self):
        t = self._create_template(
            subject_template='Order for {{!user.first_name}}',
        )
        renderable = t.current_version.get_renderable_subject()
        self.assertNotIn('{{!', renderable)
        self.assertIn('{{ user.first_name', renderable)

    def test_renderable_content_valid_django_template(self):
        """Renderable content must parse as valid Django template."""
        from django.template import Template, Context
        t = self._create_template(
            mjml_content='Hello {{ !user.first_name | default:"Marker" }}, you owe {{pay_amount}}!'
        )
        renderable = t.current_version.get_renderable_content()
        # Should not raise
        rendered = Template(renderable).render(Context({
            'user': {'first_name': 'Alice'},
            'pay_amount': 42.5,
        }))
        self.assertIn('Alice', rendered)
