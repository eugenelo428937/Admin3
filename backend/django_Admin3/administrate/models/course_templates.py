from django.db import models


class CourseTemplate(models.Model):
    LEARNING_MODE_CHOICES = [
        ('CLASSROOM', 'Classroom'),
        ('LMS', 'Online'),
        ('BLENDED', 'Blended'),
    ]

    external_id = models.CharField(max_length=50, unique=True)
    event_learning_mode = models.CharField(
        max_length=20,
        choices=LEARNING_MODE_CHOICES,
        null=True,
        blank=True
    )
    custom_fields = models.JSONField(default=dict, blank=True)
    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_course_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."course_templates"'
        ordering = ['external_id']
        verbose_name = 'Course Template'
        verbose_name_plural = 'Course Templates'

    def __str__(self):
        if self.tutorial_course_template:
            return str(self.tutorial_course_template)
        return f"CT-{self.external_id}"
