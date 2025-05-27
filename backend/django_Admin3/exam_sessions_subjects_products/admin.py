from django.contrib import admin
from .models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation
from .models.price import Price

@admin.register(ExamSessionSubjectProduct)
class ExamSessionSubjectProductAdmin(admin.ModelAdmin):
    list_display = ('exam_session_subject', 'product', 'created_at', 'updated_at')
    search_fields = ('exam_session_subject__exam_session__session_code', 'product__code')
    list_filter = ('created_at', 'updated_at')

@admin.register(ExamSessionSubjectProductVariation)
class ExamSessionSubjectProductVariationAdmin(admin.ModelAdmin):
    list_display = ('exam_session_subject_product', 'product_product_variation', 'product_code', 'created_at', 'updated_at')
    search_fields = ('product_code',)
    list_filter = ('created_at', 'updated_at')

@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ("variation", "price_type", "amount", "currency", "created_at", "updated_at")
    list_filter = ("price_type", "currency", "created_at", "updated_at")
    search_fields = ("variation__id", "variation__exam_session_subject_product__id", "price_type")
