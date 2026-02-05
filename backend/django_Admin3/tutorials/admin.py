from django.contrib import admin
from .models import TutorialEvents, TutorialSessions


@admin.register(TutorialEvents)
class TutorialEventAdmin(admin.ModelAdmin):
    list_display = ('code', 'venue', 'start_date', 'end_date', 'is_soldout', 'remain_space', 'finalisation_date')
    list_filter = ('is_soldout', 'venue', 'start_date')
    search_fields = ('code', 'venue')
    ordering = ('start_date', 'code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialSessions)
class TutorialSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'tutorial_event', 'sequence', 'location', 'venue', 'start_date', 'end_date')
    list_filter = ('location', 'venue')
    search_fields = ('title', 'location', 'venue')
    ordering = ('tutorial_event', 'sequence')
    readonly_fields = ('created_at', 'updated_at')
