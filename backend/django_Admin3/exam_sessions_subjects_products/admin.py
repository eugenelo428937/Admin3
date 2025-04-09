from django.contrib import admin
from .models import ExamSessionSubjectProduct

@admin.register(ExamSessionSubjectProduct)
class ExamSessionSubjectProductAdmin(admin.ModelAdmin):
    list_display = ('exam_session_subject', 'product', 'created_at', 'updated_at')
    search_fields = ('exam_session_subject__exam_session__session_code', 'product__code')
    list_filter = ('created_at', 'updated_at')
