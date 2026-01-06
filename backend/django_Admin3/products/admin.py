"""Products app admin configuration.

Note: Product, ProductVariation, ProductProductVariation, ProductProductGroup,
ProductBundle, and ProductBundleProduct models have been moved to catalog app
and are now registered in catalog/admin.py.

Models that remain in products app and are registered here:
- ProductGroupFilter (filter system)
- ProductVariationRecommendation
- Filter system models (FilterGroup, FilterConfiguration, etc.) via filter_admin
"""
from django.contrib import admin
from .models.product_group_filter import ProductGroupFilter
from .models import ProductVariationRecommendation

# Import the new filter admin - this ensures the admin classes are registered
from .admin import filter_admin


@admin.register(ProductGroupFilter)
class ProductGroupFilterAdmin(admin.ModelAdmin):
    list_display = ("name", "filter_type")
    list_filter = ("filter_type",)
    search_fields = ("name",)


# Product, ProductVariation, ProductProductVariation admin registrations
# moved to catalog/admin.py. See:
# - catalog.admin.ProductAdmin
# - catalog.admin.ProductVariationAdmin
# - catalog.admin.ProductProductVariationAdmin


@admin.register(ProductVariationRecommendation)
class ProductVariationRecommendationAdmin(admin.ModelAdmin):
    list_display = ("product_product_variation", "recommended_product_product_variation", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = (
        "product_product_variation__product__shortname",
        "product_product_variation__product_variation__name",
        "recommended_product_product_variation__product__shortname",
        "recommended_product_product_variation__product_variation__name"
    )
    autocomplete_fields = ("product_product_variation", "recommended_product_product_variation")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (None, {
            "fields": ("product_product_variation", "recommended_product_product_variation")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )

    def get_form(self, request, obj=None, **kwargs):
        """Override form to provide helpful text."""
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['product_product_variation'].help_text = (
            "The product-variation combination that will show the recommendation"
        )
        form.base_fields['recommended_product_product_variation'].help_text = (
            "The product-variation combination to recommend (e.g., Mock Exam eBook → Mock Exam Marking)"
        )
        return form
