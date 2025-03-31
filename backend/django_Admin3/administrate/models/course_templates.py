from django.db import models

class CourseTemplate(models.Model):
    LEARNING_MODE_CHOICES = [
        ('CLASSROOM', 'Classroom'),
        ('LMS', 'Online'),
        ('BLENDED', 'Blended'),        
    ]

    external_id = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    event_learning_mode = models.CharField(
        max_length=20,
        choices=LEARNING_MODE_CHOICES,
        null=True,
        blank=True
    )
    categories = models.TextField(blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = 'adm.course_templates'
        ordering = ['code']
        verbose_name = 'Course Template'
        verbose_name_plural = 'Course Templates'

    def __str__(self):
        return f"{self.code}: {self.title}"
