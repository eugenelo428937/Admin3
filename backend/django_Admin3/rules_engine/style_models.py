from django.db import models
from django.core.exceptions import ValidationError
import json

class ContentStyleTheme(models.Model):
    """Predefined themes that staff can select from"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'acted_content_style_themes'
        verbose_name = 'Content Style Theme'
        verbose_name_plural = 'Content Style Themes'
    
    def __str__(self):
        return self.name

class ContentStyle(models.Model):
    """Staff-configurable styles for JSON content elements"""
    
    ELEMENT_TYPES = [
        ('container', 'Container'),
        ('box', 'Box'),
        ('p', 'Paragraph'),
        ('h1', 'Heading 1'),
        ('h2', 'Heading 2'),
        ('h3', 'Heading 3'),
        ('h4', 'Heading 4'),
        ('h5', 'Heading 5'),
        ('h6', 'Heading 6'),
        ('ul', 'Unordered List'),
        ('ol', 'Ordered List'),
        ('li', 'List Item'),
    ]
    
    STYLE_CATEGORIES = [
        ('alert', 'Alert/Notice'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('info', 'Information'),
        ('holiday', 'Holiday Notice'),
        ('terms', 'Terms & Conditions'),
        ('general', 'General'),
    ]
    
    name = models.CharField(max_length=100, unique=True, help_text="Unique name for this style")
    element_type = models.CharField(max_length=20, choices=ELEMENT_TYPES)
    category = models.CharField(max_length=20, choices=STYLE_CATEGORIES, default='general')
    css_class_selector = models.CharField(
        max_length=200, 
        blank=True,
        help_text="CSS class that triggers this style (e.g., 'alert alert-warning')"
    )
    theme = models.ForeignKey(
        ContentStyleTheme, 
        on_delete=models.CASCADE, 
        related_name='styles',
        null=True, 
        blank=True
    )
    
    # Visual properties that staff can configure
    background_color = models.CharField(max_length=20, blank=True, help_text="e.g., #fff3cd, rgba(255,243,205,1)")
    text_color = models.CharField(max_length=20, blank=True, help_text="e.g., #856404, #000000")
    border_color = models.CharField(max_length=20, blank=True, help_text="e.g., #ffeaa7")
    border_width = models.CharField(max_length=10, default='1px', help_text="e.g., 1px, 2px, 0")
    border_radius = models.CharField(max_length=10, default='4px', help_text="e.g., 4px, 8px, 0")
    padding = models.CharField(max_length=20, default='12px 16px', help_text="e.g., 12px 16px, 10px")
    margin = models.CharField(max_length=20, default='0 0 16px 0', help_text="e.g., 0 0 16px 0, 10px")
    font_size = models.CharField(max_length=10, blank=True, help_text="e.g., 14px, 1.2rem, inherit")
    font_weight = models.CharField(max_length=10, blank=True, help_text="e.g., normal, bold, 600")
    text_align = models.CharField(max_length=10, default='left', help_text="left, center, right, justify")
    
    # Advanced styling (JSON field for flexibility)
    custom_styles = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Additional CSS properties as JSON (e.g., {'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})"
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=100, help_text="Higher numbers = higher priority when multiple styles match")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'acted_content_styles'
        verbose_name = 'Content Style'
        verbose_name_plural = 'Content Styles'
        ordering = ['-priority', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.element_type})"
    
    def get_style_object(self):
        """Convert database fields to CSS-in-JS style object"""
        styles = {}
        
        # Basic styles
        if self.background_color:
            styles['backgroundColor'] = self.background_color
        if self.text_color:
            styles['color'] = self.text_color
        if self.border_color:
            styles['borderColor'] = self.border_color
        if self.border_width:
            styles['borderWidth'] = self.border_width
        if self.border_radius:
            styles['borderRadius'] = self.border_radius
        if self.padding:
            styles['padding'] = self.padding
        if self.margin:
            styles['margin'] = self.margin
        if self.font_size:
            styles['fontSize'] = self.font_size
        if self.font_weight:
            styles['fontWeight'] = self.font_weight
        if self.text_align:
            styles['textAlign'] = self.text_align
        
        # Add border style if border width is set
        if self.border_width and self.border_width != '0':
            styles['borderStyle'] = 'solid'
        
        # Merge custom styles
        if self.custom_styles:
            styles.update(self.custom_styles)
        
        return styles
    
    def clean(self):
        """Validate custom styles JSON"""
        if self.custom_styles:
            try:
                if not isinstance(self.custom_styles, dict):
                    raise ValidationError({
                        'custom_styles': 'Custom styles must be a JSON object'
                    })
            except (TypeError, ValueError) as e:
                raise ValidationError({
                    'custom_styles': f'Invalid JSON: {str(e)}'
                })

class MessageTemplateStyle(models.Model):
    """Link message templates to specific style themes"""
    message_template = models.OneToOneField(
        'MessageTemplate',
        on_delete=models.CASCADE,
        related_name='style_config'
    )
    theme = models.ForeignKey(
        ContentStyleTheme,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    custom_styles = models.ManyToManyField(
        ContentStyle,
        blank=True,
        help_text="Override specific styles for this template"
    )
    
    class Meta:
        db_table = 'acted_message_template_styles'
        verbose_name = 'Message Template Style'
        verbose_name_plural = 'Message Template Styles'
    
    def __str__(self):
        return f"Styles for {self.message_template.name}"