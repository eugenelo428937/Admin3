"""
TutorialCourseTemplate model.

Acted-owned course template record containing code, title, and description.
Represents the tutorial system's authoritative course definition.
"""
from django.db import models


class TutorialCourseTemplate(models.Model):
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_course_templates"'
        ordering = ['code']
        verbose_name = 'Tutorial Course Template'
        verbose_name_plural = 'Tutorial Course Templates'

    def __str__(self):
        return f"{self.code}: {self.title}"
