from django.contrib import admin
from .models import ExamSession

@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    list_display = ('session_code', 'start_date', 'end_date', 'create_date', 'modified_date')
    list_filter = ('start_date', 'end_date', 'create_date', 'modified_date')
    search_fields = ('session_code',)
    ordering = ('-start_date',)

# Register your models here.
