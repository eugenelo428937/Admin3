"""Django admin configuration for catalog.exam_session."""
from django.contrib import admin
from .models import ExamSession


@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    """Admin interface for ExamSession model."""
    list_display = ('session_code', 'start_date', 'end_date', 'create_date')
    list_filter = ('start_date', 'end_date')
    search_fields = ('session_code',)
    ordering = ('-start_date',)
