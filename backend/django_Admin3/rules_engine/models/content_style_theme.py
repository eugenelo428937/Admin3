"""
Content Style Theme Model
"""
from .base import models


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