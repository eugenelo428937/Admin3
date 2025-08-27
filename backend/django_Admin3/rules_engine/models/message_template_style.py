"""
Message Template Style Model
"""
from .base import models
from .message_template import MessageTemplate
from .content_style_theme import ContentStyleTheme
from .content_style import ContentStyle


class MessageTemplateStyle(models.Model):
    """Link message templates to specific style themes"""
    message_template = models.OneToOneField(
        MessageTemplate,
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