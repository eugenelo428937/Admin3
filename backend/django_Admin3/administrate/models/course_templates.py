from django.db import models

class CourseTemplate(models.Model):
    PRICING_BAND_CHOICES = [
        ('OC', 'Online Classroom'),
        ('F2F', 'Face-to-face'),
        ('LO', 'Live Online'),
    ]
    
    LEARNING_MODE_CHOICES = [
        ('C', 'Classroom'),
        ('L', 'LMS'),
        ('B', 'Blended'),
    ]

    external_id = models.CharField(max_length=50, unique=True)
    course_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    categories = models.TextField(blank=True)
    pricing_band = models.CharField(
        max_length=3,
        choices=PRICING_BAND_CHOICES
    )
    learning_mode = models.CharField(
        max_length=1,
        choices=LEARNING_MODE_CHOICES
    )
    ocr_moodle_code = models.CharField(max_length=50, blank=True)
    subject = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = 'adm.course_templates'
        ordering = ['course_code']
        verbose_name = 'Course Template'
        verbose_name_plural = 'Course Templates'

    def __str__(self):
        return f"{self.course_code}: {self.title}"
