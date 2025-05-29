from django.db import models
from django.core.validators import URLValidator
from administrate.models.course_templates import CourseTemplate
from administrate.models.locations import Location
from administrate.models.venues import Venue
from administrate.models.instructors import Instructor
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

class Event(models.Model):
    """
    Tutorial Event model representing a tutorial product (course) that contains multiple sessions.
    Supports three types of tutorial products:
    1. Face-to-face tuition
    2. Live Online tuition
    3. Online Classroom
    
    Tutorial categories:
    - Regular Tutorials (3-5 days spread throughout session)
    - Block Tutorials (closer to exams, some consecutive days) 
    - 5/6-day Bundle (combines tutorial + Paper B Preparation Day)
    """
    LEARNING_MODE_CHOICES = [
        ('CLASSROOM', 'Face-to-face tuition'),
        ('BLENDED', 'Live Online tuition'),
        ('LMS', 'Online Classroom'),
    ]
    TUTORIAL_CATEGORY_CHOICES = [
        ('REGULAR', 'Regular Tutorials'),
        ('BLOCK', 'Block Tutorials'),
        ('BUNDLE_5', '5-day Bundle'),
        ('BUNDLE_6', '6-day Bundle'),
    ]
    
    LIFECYCLE_STATE_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('CANCELLED', 'Cancelled'),
    ]
    external_id = models.CharField(max_length=50, null=True, blank=True, unique=True)
    exam_session_subject_product = models.ForeignKey(
        ExamSessionSubjectProduct, 
        on_delete=models.CASCADE,
        related_name='tutorial_events',
        help_text='Related exam session subject product for this tutorial event'
    )
    course_template = models.ForeignKey(CourseTemplate, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    session_title = models.CharField(max_length=255, blank=True)
    learning_mode = models.CharField(
        max_length=20, 
        choices=LEARNING_MODE_CHOICES,
        default='BLENDED'
    )
    tutorial_category = models.CharField(
        max_length=20,
        choices=TUTORIAL_CATEGORY_CHOICES,
        default='REGULAR'
    )
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, null=True, blank=True)
    primary_instructor = models.ForeignKey(
        Instructor, 
        on_delete=models.CASCADE, 
        related_name='primary_events'
    )
    administrator = models.CharField(max_length=255, blank=True)
    max_places = models.PositiveIntegerField(default=0)
    min_places = models.PositiveIntegerField(default=0)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    lms_start_date = models.DateTimeField(null=True, blank=True)
    lms_end_date = models.DateTimeField(null=True, blank=True)
    access_duration = models.CharField(max_length=100, blank=True)
    event_url = models.URLField(max_length=500, blank=True, validators=[URLValidator()])
    virtual_classroom = models.CharField(max_length=255, blank=True)
    lifecycle_state = models.CharField(
        max_length=20,
        choices=LIFECYCLE_STATE_CHOICES,
        default='DRAFT'
    )
    sold_out = models.BooleanField(default=False)
    cancelled = models.BooleanField(default=False)
    web_sale = models.BooleanField(default=True)
    sitting = models.CharField(max_length=50, blank=True)
    finalisation_date = models.DateTimeField(null=True, blank=True)
    ocr_moodle_code = models.CharField(max_length=100, blank=True)
    sage_code = models.CharField(max_length=100, blank=True)
    recordings = models.BooleanField(default=False)
    recording_pin = models.CharField(max_length=50, blank=True)
    extra_information = models.TextField(blank=True)
    tutors = models.CharField(max_length=255, blank=True)
    timezone = models.CharField(max_length=50, default='Europe/London')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = 'acted_tutorial_events'
        ordering = ['title', 'lms_start_date']
        verbose_name = 'Tutorial Event'
        verbose_name_plural = 'Tutorial Events'

    def __str__(self):
        return f"{self.title} ({self.get_learning_mode_display()})"
    @property
    def course_code(self):
        return self.course_template.code if self.course_template else ''
    @property
    def total_sessions(self):
        return self.sessions.count()
    @property
    def is_face_to_face(self):
        return self.learning_mode == 'CLASSROOM'
    @property
    def is_live_online(self):
        return self.learning_mode == 'BLENDED'
    @property
    def is_online_classroom(self):
        return self.learning_mode == 'LMS'
    @property
    def is_bundle(self):
        return self.tutorial_category in ['BUNDLE_5', 'BUNDLE_6']
    def get_sessions_by_date(self):
        return self.sessions.order_by('classroom_start_date')
