"""
Message Template Model
"""
from .base import models, ValidationError


class MessageTemplate(models.Model):
    """Store reusable message templates with variables"""
    
    CONTENT_FORMATS = [
        ('html', 'HTML Content'),
        ('json', 'JSON Structure'),
        ('markdown', 'Markdown'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    content = models.TextField()
    content_format = models.CharField(
        max_length=10, 
        choices=CONTENT_FORMATS, 
        default='html',
        help_text="Format of the content field"
    )
    json_content = models.JSONField(
        null=True, 
        blank=True,
        help_text="Structured JSON content for rendering with Material UI components"
    )
    message_type = models.CharField(max_length=20, choices=[
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('terms', 'Terms & Conditions'),
    ])
    variables = models.JSONField(default=list, help_text="List of variable names used in template")
    dismissible = models.BooleanField(default=True, help_text="Whether the message can be dismissed by the user")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."rules_message_templates"'
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'

    def __str__(self):
        return f"{self.name} - {self.message_type}"
    
    def get_content(self):
        """Get the appropriate content based on content_format"""
        if self.content_format == 'json' and self.json_content:
            return self.json_content
        return self.content
    
    def clean(self):
        """Validate that JSON content is provided when content_format is 'json'"""
        super().clean()
        if self.content_format == 'json' and not self.json_content:
            raise ValidationError({
                'json_content': 'JSON content is required when content format is JSON'
            })
        
        # Validate JSON structure if provided
        if self.json_content:
            try:
                # Basic validation that it's valid JSON and has expected structure
                if not isinstance(self.json_content, dict):
                    raise ValidationError({
                        'json_content': 'JSON content must be a JSON object'
                    })

                # Validate 'content' field if present
                # Supports two formats:
                # 1. List format: {"content": [{"element": "p", "text": "..."}, ...]}
                # 2. Dict format: {"content": {"title": "...", "message": "..."}}
                if 'content' in self.json_content:
                    content = self.json_content['content']
                    if not isinstance(content, (list, dict)):
                        raise ValidationError({
                            'json_content': 'Content field must be a list of elements or a dict with title/message'
                        })

            except (TypeError, ValueError) as e:
                raise ValidationError({
                    'json_content': f'Invalid JSON structure: {str(e)}'
                })