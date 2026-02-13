# This file previously contained Event and Session models.
# These models have been moved to the tutorials app.
# If you need to use Event or Session, import from tutorials.models instead.

from django.db import models
from django.core.validators import URLValidator
from .course_templates import CourseTemplate
from .locations import Location
from .venues import Venue
from .instructors import Instructor


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

    # Administrate Integration
    external_id = models.CharField(max_length=50, null=True, blank=True, unique=True)

    # Tutorial Integration (cross-schema FK to acted.tutorial_events)
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_events',
    )

    # Course Information
    course_template = models.ForeignKey(CourseTemplate, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    session_title = models.CharField(max_length=255, blank=True)
    
    # Tutorial Type and Category
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
    
    # Location and Venue
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, null=True, blank=True)
    
    # Instructor and Administration
    primary_instructor = models.ForeignKey(
        Instructor, 
        on_delete=models.CASCADE, 
        related_name='primary_events'
    )
    administrator = models.CharField(max_length=255, blank=True)
    
    # Registration and Capacity
    max_places = models.PositiveIntegerField(default=0)
    min_places = models.PositiveIntegerField(default=0)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    
    # LMS and Online Access
    lms_start_date = models.DateTimeField(null=True, blank=True)
    lms_end_date = models.DateTimeField(null=True, blank=True)
    access_duration = models.CharField(max_length=100, blank=True)
    
    # URLs and Virtual Classroom
    event_url = models.URLField(max_length=500, blank=True, validators=[URLValidator()])
    virtual_classroom = models.CharField(max_length=255, blank=True)
    
    # Status and Flags
    lifecycle_state = models.CharField(
        max_length=20,
        choices=LIFECYCLE_STATE_CHOICES,
        default='DRAFT'
    )
    sold_out = models.BooleanField(default=False)
    cancelled = models.BooleanField(default=False)
    web_sale = models.BooleanField(default=True)
    
    # Session Information
    sitting = models.CharField(max_length=50, blank=True)  # e.g., "2025S"
    finalisation_date = models.DateTimeField(null=True, blank=True)
    
    # Integration with other systems
    ocr_moodle_code = models.CharField(max_length=100, blank=True)
    sage_code = models.CharField(max_length=100, blank=True)
    
    # Recordings
    recordings = models.BooleanField(default=False)
    recording_pin = models.CharField(max_length=50, blank=True)
    
    # Additional Information
    extra_information = models.TextField(blank=True)
    tutors = models.CharField(max_length=255, blank=True)
    
    # Timezone
    timezone = models.CharField(max_length=50, default='Europe/London')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."events"'
        ordering = ['title', 'lms_start_date']
        verbose_name = 'Tutorial Event'
        verbose_name_plural = 'Tutorial Events'

    def __str__(self):
        return f"{self.title} ({self.get_learning_mode_display()})"
        
    @property
    def course_code(self):
        """Get the course code from the associated course template"""
        if self.course_template and self.course_template.tutorial_course_template:
            return self.course_template.tutorial_course_template.code
        return ''
        
    @property
    def total_sessions(self):
        """Get the total number of sessions for this event"""
        return self.sessions.count()
        
    @property
    def is_face_to_face(self):
        """Check if this is a face-to-face tutorial"""
        return self.learning_mode == 'CLASSROOM'
        
    @property
    def is_live_online(self):
        """Check if this is a live online tutorial"""
        return self.learning_mode == 'BLENDED'
        
    @property
    def is_online_classroom(self):
        """Check if this is an online classroom tutorial"""
        return self.learning_mode == 'LMS'
        
    @property
    def is_bundle(self):
        """Check if this is a bundle tutorial (5 or 6 day)"""
        return self.tutorial_category in ['BUNDLE_5', 'BUNDLE_6']
        
    def get_sessions_by_date(self):
        """Get sessions ordered by classroom start date"""
        return self.sessions.order_by('classroom_start_date')


class Session(models.Model):
    """
    Tutorial Session model representing individual days/sessions within a tutorial event.
    Each session represents a specific date and time when the tutorial takes place.
    """
    
    # Event relationship
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='sessions')
    
    # Session Information
    title = models.CharField(max_length=255)
    day_number = models.PositiveIntegerField()  # Day 1, 2, 3, etc.
    
    # Classroom Schedule
    classroom_start_date = models.DateField()
    classroom_start_time = models.TimeField()
    classroom_end_date = models.DateField()
    classroom_end_time = models.TimeField()
    
    # Session Instructor (may differ from event primary instructor)
    session_instructor = models.ForeignKey(
        Instructor, 
        on_delete=models.CASCADE, 
        related_name='session_instructions'
    )
    
    # Session URL (for online sessions)
    session_url = models.URLField(max_length=500, blank=True, validators=[URLValidator()])
    
    # Session Status
    cancelled = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."sessions"'
        ordering = ['event', 'day_number']
        verbose_name = 'Tutorial Session'
        verbose_name_plural = 'Tutorial Sessions'
        unique_together = ['event', 'day_number']

    def __str__(self):
        return f"{self.event.title} - Day {self.day_number} ({self.classroom_start_date})"
        
    @property
    def duration_hours(self):
        """Calculate the duration of the session in hours"""
        from datetime import datetime, timedelta
        
        start_datetime = datetime.combine(self.classroom_start_date, self.classroom_start_time)
        end_datetime = datetime.combine(self.classroom_end_date, self.classroom_end_time)
        
        duration = end_datetime - start_datetime
        return duration.total_seconds() / 3600
        
    @property
    def is_today(self):
        """Check if this session is scheduled for today"""
        from datetime import date
        return self.classroom_start_date == date.today()
        
    @property
    def is_past(self):
        """Check if this session is in the past"""
        from datetime import date
        return self.classroom_start_date < date.today()
        
    @property
    def is_future(self):
        """Check if this session is in the future"""
        from datetime import date
        return self.classroom_start_date > date.today()
