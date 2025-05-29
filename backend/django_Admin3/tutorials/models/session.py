from django.db import models
from django.core.validators import URLValidator
from administrate.models.instructors import Instructor
from .event import Event

class Session(models.Model):
    """
    Tutorial Session model representing individual days/sessions within a tutorial event.
    Each session represents a specific date and time when the tutorial takes place.
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255)
    day_number = models.PositiveIntegerField()
    classroom_start_date = models.DateField()
    classroom_start_time = models.TimeField()
    classroom_end_date = models.DateField()
    classroom_end_time = models.TimeField()
    session_instructor = models.ForeignKey(
        Instructor, 
        on_delete=models.CASCADE, 
        related_name='session_instructions'
    )
    session_url = models.URLField(max_length=500, blank=True, validators=[URLValidator()])
    cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = 'acted_tutorial_sessions'
        ordering = ['event', 'day_number']
        verbose_name = 'Tutorial Session'
        verbose_name_plural = 'Tutorial Sessions'
        unique_together = ['event', 'day_number']

    def __str__(self):
        return f"{self.event.title} - Day {self.day_number} ({self.classroom_start_date})"
    @property
    def duration_hours(self):
        from datetime import datetime
        start_datetime = datetime.combine(self.classroom_start_date, self.classroom_start_time)
        end_datetime = datetime.combine(self.classroom_end_date, self.classroom_end_time)
        duration = end_datetime - start_datetime
        return duration.total_seconds() / 3600
    @property
    def is_today(self):
        from datetime import date
        return self.classroom_start_date == date.today()
    @property
    def is_past(self):
        from datetime import date
        return self.classroom_start_date < date.today()
    @property
    def is_future(self):
        from datetime import date
        return self.classroom_start_date > date.today()
