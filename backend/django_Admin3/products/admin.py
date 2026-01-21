"""Products app admin configuration.

Note: Models have been moved to their canonical apps:
- Product, ProductVariation, ProductBundle, ProductVariationRecommendation -> catalog app
- FilterGroup, FilterConfiguration, FilterPreset, FilterUsageAnalytics -> filtering app

Admin registrations for these models are now handled in catalog/admin.py and filtering/admin.py.

Models that remain in products app:
- ProductGroupFilter (legacy filter system)
"""
from django.contrib import admin
from .models.product_group_filter import ProductGroupFilter


@admin.register(ProductGroupFilter)
class ProductGroupFilterAdmin(admin.ModelAdmin):
    """Admin for legacy ProductGroupFilter."""
    list_display = ("name", "filter_type")
    list_filter = ("filter_type",)
    search_fields = ("name",)
