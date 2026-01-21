"""Django admin configuration for catalog models.

Registers all catalog models with the Django admin interface for
staff management of subjects, exam sessions, products, and bundles.
"""
from django.contrib import admin
from .models import (
    Subject,
    ExamSession,
    ExamSessionSubject,
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
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


@admin.register(ExamSessionSubject)
class ExamSessionSubjectAdmin(admin.ModelAdmin):
    """
    Admin interface for ExamSessionSubject model.

    Manages the association between exam sessions and subjects,
    defining which subjects are available for each exam period.
    """
    list_display = ('id', 'get_session_code', 'get_subject_code', 'is_active', 'created_at')
    list_filter = ('is_active', 'exam_session', 'subject')
    search_fields = ('exam_session__session_code', 'subject__code', 'subject__description')
    ordering = ('-exam_session__session_code', 'subject__code')
    autocomplete_fields = ('exam_session', 'subject')

    @admin.display(description='Exam Session')
    def get_session_code(self, obj):
        return obj.exam_session.session_code

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.subject.code


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


@admin.register(ProductVariationRecommendation)
class ProductVariationRecommendationAdmin(admin.ModelAdmin):
    """
    Admin interface for ProductVariationRecommendation model.

    Manages recommendation relationships between product-variation combinations,
    e.g., Mock Exam eBook recommends Marking Service.
    """
    list_display = ('id', 'get_source_product', 'get_source_variation', 'get_recommended_product', 'get_recommended_variation', 'created_at')
    list_filter = ('created_at',)
    search_fields = (
        'product_product_variation__product__shortname',
        'product_product_variation__product__code',
        'recommended_product_product_variation__product__shortname',
        'recommended_product_product_variation__product__code',
    )
    autocomplete_fields = ('product_product_variation', 'recommended_product_product_variation')
    ordering = ('-created_at',)

    @admin.display(description='Source Product')
    def get_source_product(self, obj):
        return obj.product_product_variation.product.shortname

    @admin.display(description='Source Variation')
    def get_source_variation(self, obj):
        return obj.product_product_variation.product_variation.name

    @admin.display(description='Recommended Product')
    def get_recommended_product(self, obj):
        return obj.recommended_product_product_variation.product.shortname

    @admin.display(description='Recommended Variation')
    def get_recommended_variation(self, obj):
        return obj.recommended_product_product_variation.product_variation.name
