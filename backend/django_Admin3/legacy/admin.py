from django.contrib import admin
from .models import LegacyProduct


@admin.register(LegacyProduct)
class LegacyProductAdmin(admin.ModelAdmin):
    list_display = (
        'full_code', 'subject_code', 'session_code',
        'delivery_format', 'normalized_name', 'legacy_product_name',
    )
    list_filter = ('delivery_format', 'session_code', 'subject_code')
    search_fields = ('normalized_name', 'legacy_product_name', 'full_code')
    readonly_fields = (
        'source_file', 'source_line', 'normalized_name',
    )
