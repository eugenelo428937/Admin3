from django.contrib import admin
from .models import Event, Session

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'learning_mode', 'location', 'venue', 'primary_instructor', 'sitting', 'lifecycle_state', 'sold_out')
    list_filter = ('learning_mode', 'location', 'venue', 'lifecycle_state', 'sold_out')
    search_fields = ('title', 'session_title', 'sitting', 'primary_instructor__name')
    ordering = ('title', 'lms_start_date')
    inlines = []  # You can add SessionInline here if you want to edit sessions inline

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('event', 'title', 'day_number', 'classroom_start_date', 'classroom_start_time', 'session_instructor', 'cancelled')
    list_filter = ('event', 'session_instructor', 'cancelled')
    search_fields = ('title', 'event__title', 'session_instructor__name')
    ordering = ('event', 'day_number')
