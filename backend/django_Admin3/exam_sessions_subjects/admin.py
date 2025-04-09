from django.contrib import admin
from .models import ExamSessionSubject

@admin.register(ExamSessionSubject)
class ExamSessionSubjectAdmin(admin.ModelAdmin):
    list_display = ('exam_session', 'subject', 'created_at', 'updated_at')
    search_fields = ('exam_session__session_code', 'subject__code')
    list_filter = ('created_at', 'updated_at')
