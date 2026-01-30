"""
Coverage tests for rules_engine/models/message_template.py
and rules_engine/style_models.py

Covers:
- MessageTemplate: __str__, get_content, clean (json validation, content list/dict)
- ContentStyleTheme: __str__, default values
- ContentStyle: __str__, get_style_object, clean
- MessageTemplateStyle: __str__

NOTE: ContentStyleTheme, ContentStyle, and MessageTemplateStyle tables
were commented out in the initial migration (0001) and deleted in
migration 0004. Their tables do NOT exist in the test database.
All tests for these models use in-memory instances (no DB access).
"""

from unittest.mock import MagicMock

from django.test import TestCase
from django.core.exceptions import ValidationError

from rules_engine.models import MessageTemplate
from rules_engine.style_models import (
    ContentStyleTheme,
    ContentStyle,
    MessageTemplateStyle,
)


# ===========================================================================
# MessageTemplate model
# ===========================================================================

class TestMessageTemplateModel(TestCase):
    """Tests for MessageTemplate model methods."""

    def test_str_representation(self):
        """__str__ should return 'name - message_type'."""
        template = MessageTemplate(
            name='RE_test_template',
            title='Test',
            content='Hello',
            message_type='info',
        )
        self.assertEqual(str(template), 'RE_test_template - info')

    def test_get_content_html(self):
        """get_content should return text content for html format."""
        template = MessageTemplate(
            name='RE_html_tpl',
            title='HTML',
            content='<p>Hello</p>',
            content_format='html',
            message_type='info',
        )
        self.assertEqual(template.get_content(), '<p>Hello</p>')

    def test_get_content_json_with_json_content(self):
        """get_content should return json_content when format is json."""
        json_data = {'content': {'title': 'Test', 'message': 'Hello'}}
        template = MessageTemplate(
            name='RE_json_tpl',
            title='JSON',
            content='fallback',
            content_format='json',
            json_content=json_data,
            message_type='info',
        )
        self.assertEqual(template.get_content(), json_data)

    def test_get_content_json_without_json_content(self):
        """get_content should return text content when json format but no json_content."""
        template = MessageTemplate(
            name='RE_json_no_data',
            title='JSON',
            content='fallback text',
            content_format='json',
            json_content=None,
            message_type='info',
        )
        self.assertEqual(template.get_content(), 'fallback text')

    def test_clean_json_format_missing_json_content(self):
        """clean should raise ValidationError when json format but no json_content."""
        template = MessageTemplate(
            name='RE_clean_json_missing',
            title='Test',
            content='text',
            content_format='json',
            json_content=None,
            message_type='info',
        )
        with self.assertRaises(ValidationError) as ctx:
            template.clean()
        self.assertIn('json_content', ctx.exception.message_dict)

    def test_clean_json_content_not_dict(self):
        """clean should reject json_content that is not a dict."""
        template = MessageTemplate(
            name='RE_clean_not_dict',
            title='Test',
            content='text',
            content_format='html',
            json_content=['this', 'is', 'a', 'list'],
            message_type='info',
        )
        with self.assertRaises(ValidationError) as ctx:
            template.clean()
        self.assertIn('json_content', ctx.exception.message_dict)
        self.assertIn('must be a JSON object', str(ctx.exception.message_dict['json_content']))

    def test_clean_json_content_valid_list_format(self):
        """clean should accept json_content with content as list."""
        template = MessageTemplate(
            name='RE_clean_list',
            title='Test',
            content='text',
            content_format='json',
            json_content={
                'content': [
                    {'element': 'p', 'text': 'Hello'},
                    {'element': 'ul', 'text': ['Item 1']},
                ],
            },
            message_type='info',
        )
        # Should not raise
        template.clean()

    def test_clean_json_content_valid_dict_format(self):
        """clean should accept json_content with content as dict."""
        template = MessageTemplate(
            name='RE_clean_dict',
            title='Test',
            content='text',
            content_format='json',
            json_content={
                'content': {'title': 'Hello', 'message': 'World'},
            },
            message_type='info',
        )
        # Should not raise
        template.clean()

    def test_clean_json_content_invalid_content_field(self):
        """clean should reject content field that is neither list nor dict."""
        template = MessageTemplate(
            name='RE_clean_invalid_content',
            title='Test',
            content='text',
            content_format='json',
            json_content={
                'content': 'just_a_string',
            },
            message_type='info',
        )
        with self.assertRaises(ValidationError) as ctx:
            template.clean()
        self.assertIn('json_content', ctx.exception.message_dict)
        self.assertIn('Content field must be', str(ctx.exception.message_dict['json_content']))

    def test_clean_json_content_no_content_key(self):
        """clean should accept json_content without 'content' key."""
        template = MessageTemplate(
            name='RE_clean_no_content_key',
            title='Test',
            content='text',
            content_format='json',
            json_content={
                'title': 'Hello',
                'message': 'Simple format without content key',
            },
            message_type='info',
        )
        # Should not raise since there is no 'content' key to validate
        template.clean()

    def test_clean_html_with_no_json_content(self):
        """clean should pass for html format without json_content."""
        template = MessageTemplate(
            name='RE_clean_html_ok',
            title='Test',
            content='<p>Hello</p>',
            content_format='html',
            json_content=None,
            message_type='info',
        )
        # Should not raise
        template.clean()


# ===========================================================================
# ContentStyleTheme model
# ===========================================================================

class TestContentStyleThemeModel(TestCase):
    """Tests for ContentStyleTheme model (in-memory only, no DB table)."""

    def test_str_representation(self):
        """__str__ should return theme name."""
        theme = ContentStyleTheme(name='RE_Default Theme')
        self.assertEqual(str(theme), 'RE_Default Theme')

    def test_default_is_active(self):
        """Should default is_active to True."""
        theme = ContentStyleTheme(
            name='RE_Active Theme',
            description='Test theme',
        )
        self.assertTrue(theme.is_active)


# ===========================================================================
# ContentStyle model
# ===========================================================================

class TestContentStyleModel(TestCase):
    """Tests for ContentStyle model."""

    def test_str_representation(self):
        """__str__ should return 'name (element_type)'."""
        style = ContentStyle(name='RE_Style1', element_type='p')
        self.assertEqual(str(style), 'RE_Style1 (p)')

    def test_get_style_object_basic(self):
        """get_style_object should return CSS-in-JS style dict."""
        style = ContentStyle(
            name='RE_Basic',
            element_type='p',
            background_color='#fff3cd',
            text_color='#856404',
            border_color='#ffeaa7',
            border_width='2px',
            border_radius='8px',
            padding='12px 16px',
            margin='0 0 16px 0',
            font_size='14px',
            font_weight='bold',
            text_align='center',
        )
        styles = style.get_style_object()
        self.assertEqual(styles['backgroundColor'], '#fff3cd')
        self.assertEqual(styles['color'], '#856404')
        self.assertEqual(styles['borderColor'], '#ffeaa7')
        self.assertEqual(styles['borderWidth'], '2px')
        self.assertEqual(styles['borderRadius'], '8px')
        self.assertEqual(styles['padding'], '12px 16px')
        self.assertEqual(styles['margin'], '0 0 16px 0')
        self.assertEqual(styles['fontSize'], '14px')
        self.assertEqual(styles['fontWeight'], 'bold')
        self.assertEqual(styles['textAlign'], 'center')
        self.assertEqual(styles['borderStyle'], 'solid')

    def test_get_style_object_border_zero(self):
        """get_style_object should not add borderStyle when borderWidth is 0."""
        style = ContentStyle(
            name='RE_NoBorder',
            element_type='p',
            border_width='0',
        )
        styles = style.get_style_object()
        self.assertNotIn('borderStyle', styles)

    def test_get_style_object_empty_fields(self):
        """get_style_object should skip empty fields."""
        style = ContentStyle(
            name='RE_Empty',
            element_type='p',
            background_color='',
            text_color='',
            border_color='',
            border_width='',
            font_size='',
            font_weight='',
        )
        styles = style.get_style_object()
        self.assertNotIn('backgroundColor', styles)
        self.assertNotIn('color', styles)
        self.assertNotIn('borderColor', styles)
        self.assertNotIn('borderWidth', styles)
        self.assertNotIn('fontSize', styles)
        self.assertNotIn('fontWeight', styles)
        self.assertNotIn('borderStyle', styles)

    def test_get_style_object_with_custom_styles(self):
        """get_style_object should merge custom_styles."""
        style = ContentStyle(
            name='RE_Custom',
            element_type='p',
            background_color='#ff0000',
            custom_styles={'boxShadow': '0 2px 4px rgba(0,0,0,0.1)', 'opacity': '0.9'},
        )
        styles = style.get_style_object()
        self.assertEqual(styles['backgroundColor'], '#ff0000')
        self.assertEqual(styles['boxShadow'], '0 2px 4px rgba(0,0,0,0.1)')
        self.assertEqual(styles['opacity'], '0.9')

    def test_get_style_object_empty_custom_styles(self):
        """get_style_object should handle empty custom_styles."""
        style = ContentStyle(
            name='RE_NoCustom',
            element_type='p',
            custom_styles={},
        )
        styles = style.get_style_object()
        # Should not crash, and should have at least default padding/margin/text_align
        self.assertIsInstance(styles, dict)

    def test_clean_valid_custom_styles(self):
        """clean should pass for valid custom_styles dict."""
        style = ContentStyle(
            name='RE_ValidCustom',
            element_type='p',
            custom_styles={'boxShadow': 'none'},
        )
        # Should not raise
        style.clean()

    def test_clean_invalid_custom_styles_not_dict(self):
        """clean should raise ValidationError for non-dict custom_styles."""
        style = ContentStyle(
            name='RE_InvalidCustom',
            element_type='p',
            custom_styles='not a dict',
        )
        with self.assertRaises(ValidationError) as ctx:
            style.clean()
        self.assertIn('custom_styles', ctx.exception.message_dict)

    def test_clean_empty_custom_styles(self):
        """clean should pass for empty custom_styles."""
        style = ContentStyle(
            name='RE_EmptyCustom',
            element_type='p',
            custom_styles={},
        )
        # Should not raise (empty dict is falsy but won't enter the if block)
        style.clean()


# ===========================================================================
# MessageTemplateStyle model
# ===========================================================================

class TestMessageTemplateStyleModel(TestCase):
    """Tests for MessageTemplateStyle model (in-memory only, no DB table)."""

    def test_str_representation(self):
        """__str__ should return 'Styles for {template_name}'."""
        template = MessageTemplate(
            name='RE_style_tpl',
            title='Style Template',
            content='test',
            message_type='info',
        )
        mts = MessageTemplateStyle()
        mts.message_template = template
        self.assertEqual(str(mts), 'Styles for RE_style_tpl')

    def test_theme_can_be_none(self):
        """Should allow null theme."""
        mts = MessageTemplateStyle()
        mts.theme = None
        self.assertIsNone(mts.theme)

    def test_theme_can_be_set(self):
        """Should accept a theme reference."""
        theme = ContentStyleTheme(name='RE_style_theme')
        mts = MessageTemplateStyle()
        mts.theme = theme
        self.assertEqual(mts.theme.name, 'RE_style_theme')
