from django.contrib import admin
from .models import TutorialEvents

@admin.register(TutorialEvents)
class TutorialEventAdmin(admin.ModelAdmin):
    list_display = ('code', 'venue', 'start_date', 'end_date', 'is_soldout', 'remain_space', 'finalisation_date')
    list_filter = ('is_soldout', 'venue', 'start_date')
    search_fields = ('code', 'venue')
    ordering = ('start_date', 'code')
    readonly_fields = ('created_at', 'updated_at')
