"""
Holiday Calendar Model
"""
from .base import models


class HolidayCalendar(models.Model):
    """Store holidays and special dates that might affect delivery/operations"""
    name = models.CharField(max_length=100)
    date = models.DateField()
    country = models.CharField(max_length=2, default='GB', help_text="ISO country code")
    is_business_day = models.BooleanField(default=False)
    delivery_delay_days = models.IntegerField(default=0, help_text="Additional delivery delay for this holiday")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'acted_holiday_calendar'
        verbose_name = 'Holiday'
        verbose_name_plural = 'Holiday Calendar'
        unique_together = ['date', 'country']

    def __str__(self):
        return f"{self.name} ({self.date}) - {self.country}"