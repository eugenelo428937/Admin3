"""Django admin configuration for catalog models.

Registers all catalog models with the Django admin interface for
staff management of subjects, exam sessions, products, and bundles.
"""
from django.contrib import admin
from .models import (
    Subject,
    ExamSession,
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin interface for Subject model."""
    list_display = ('code', 'description', 'active', 'created_at', 'updated_at')
    list_filter = ('active', 'created_at')
    search_fields = ('code', 'description')
    ordering = ('code',)


@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    """Admin interface for ExamSession model."""
    list_display = ('session_code', 'start_date', 'end_date', 'create_date')
    list_filter = ('start_date', 'end_date')
    search_fields = ('session_code',)
    ordering = ('-start_date',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model."""
    list_display = ('code', 'shortname', 'fullname', 'is_active', 'buy_both', 'created_at')
    list_filter = ('is_active', 'buy_both')
    search_fields = ('code', 'shortname', 'fullname', 'description')
    ordering = ('shortname',)
    # Note: groups and product_variations use through models, so filter_horizontal not available
    # Manage relationships through ProductProductGroup and ProductProductVariation admin


@admin.register(ProductVariation)
class ProductVariationAdmin(admin.ModelAdmin):
    """Admin interface for ProductVariation model."""
    list_display = ('code', 'name', 'variation_type', 'description_short')
    list_filter = ('variation_type',)
    search_fields = ('code', 'name', 'description')
    ordering = ('variation_type', 'name')


@admin.register(ProductProductVariation)
class ProductProductVariationAdmin(admin.ModelAdmin):
    """Admin interface for Product-ProductVariation junction."""
    list_display = ('id', 'product', 'product_variation')
    list_filter = ('product_variation__variation_type',)
    search_fields = ('product__shortname', 'product_variation__name')
    autocomplete_fields = ('product', 'product_variation')


@admin.register(ProductProductGroup)
class ProductProductGroupAdmin(admin.ModelAdmin):
    """Admin interface for Product-FilterGroup junction."""
    list_display = ('id', 'product', 'product_group')
    list_filter = ('product_group',)
    search_fields = ('product__shortname', 'product_group__name')
    autocomplete_fields = ('product',)


@admin.register(ProductBundle)
class ProductBundleAdmin(admin.ModelAdmin):
    """Admin interface for ProductBundle model."""
    list_display = ('bundle_name', 'subject', 'is_active', 'is_featured', 'display_order')
    list_filter = ('is_active', 'is_featured', 'subject')
    search_fields = ('bundle_name', 'bundle_description', 'subject__code')
    ordering = ('subject__code', 'display_order', 'bundle_name')
    autocomplete_fields = ('subject',)


@admin.register(ProductBundleProduct)
class ProductBundleProductAdmin(admin.ModelAdmin):
    """Admin interface for ProductBundle-Product junction."""
    list_display = ('id', 'bundle', 'product_product_variation', 'quantity', 'sort_order', 'is_active')
    list_filter = ('is_active', 'bundle')
    search_fields = ('bundle__bundle_name',)
    ordering = ('bundle', 'sort_order')
