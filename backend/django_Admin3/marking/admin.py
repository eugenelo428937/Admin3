from django.contrib import admin

from marking.models import (
    MarkingPaper,
    Marker,
    MarkingPaperSubmission,
    MarkingPaperGrading,
    MarkingPaperFeedback,
)


@admin.register(MarkingPaper)
class MarkingPaperAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store_product', 'deadline',
                    'recommended_submit_date')
    list_filter = ('deadline',)
    search_fields = ('name',)
    raw_id_fields = ('store_product',)


@admin.register(Marker)
class MarkerAdmin(admin.ModelAdmin):
    list_display = ('id', 'initial', 'user', 'created_at')
    search_fields = ('initial', 'user__username', 'user__email',
                     'user__first_name', 'user__last_name')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperSubmission)
class MarkingPaperSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'marking_paper', 'submission_date',
                    'hub_download_date')
    list_filter = ('submission_date', 'hub_download_date')
    search_fields = ('student__user__email', 'marking_paper__name')
    raw_id_fields = ('student', 'marking_paper', 'marking_voucher',
                     'order_item')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperGrading)
class MarkingPaperGradingAdmin(admin.ModelAdmin):
    list_display = ('id', 'submission', 'marker', 'allocate_date',
                    'score', 'hub_upload_date')
    list_filter = ('allocate_date', 'hub_upload_date')
    search_fields = ('marker__initial', 'marker__user__email')
    raw_id_fields = ('submission', 'marker', 'allocate_by')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperFeedback)
class MarkingPaperFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'grading', 'grade', 'submission_date')
    list_filter = ('grade', 'submission_date')
    raw_id_fields = ('grading',)
    readonly_fields = ('created_at', 'updated_at')
