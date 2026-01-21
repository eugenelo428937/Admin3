"""Admin configuration for the store app."""
from django.contrib import admin
from store.models import Product, Price, Bundle, BundleProduct


class PriceInline(admin.TabularInline):
    """Inline admin for prices within a product."""
    model = Price
    extra = 0
    fields = ['price_type', 'amount', 'currency']


class BundleProductInline(admin.TabularInline):
    """Inline admin for products within a bundle."""
    model = BundleProduct
    extra = 0
    fields = ['product', 'quantity', 'default_price_type', 'sort_order', 'is_active']
    raw_id_fields = ['product']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin for store.Product model."""
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'exam_session_subject__subject', 'exam_session_subject__exam_session']
    search_fields = ['product_code']
    raw_id_fields = ['exam_session_subject', 'product_product_variation']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    """Admin for store.Price model."""
    list_display = ['get_product_code', 'price_type', 'amount', 'currency']
    list_filter = ['price_type', 'currency']
    search_fields = ['product__product_code']
    raw_id_fields = ['product']

    @admin.display(description='Product')
    def get_product_code(self, obj):
        return obj.product.product_code


@admin.register(Bundle)
class BundleAdmin(admin.ModelAdmin):
    """Admin for store.Bundle model."""
    list_display = [
        'name',
        'get_subject_code',
        'get_session_code',
        'is_active',
        'display_order',
        'get_product_count',
    ]
    list_filter = ['is_active', 'exam_session_subject__subject', 'exam_session_subject__exam_session']
    search_fields = ['override_name', 'bundle_template__bundle_name']
    raw_id_fields = ['bundle_template', 'exam_session_subject']
    inlines = [BundleProductInline]
    ordering = ['display_order', 'created_at']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code

    @admin.display(description='Products')
    def get_product_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()


@admin.register(BundleProduct)
class BundleProductAdmin(admin.ModelAdmin):
    """Admin for store.BundleProduct model."""
    list_display = ['get_bundle_name', 'get_product_code', 'quantity', 'default_price_type', 'is_active']
    list_filter = ['is_active', 'default_price_type']
    search_fields = ['bundle__override_name', 'product__product_code']
    raw_id_fields = ['bundle', 'product']

    @admin.display(description='Bundle')
    def get_bundle_name(self, obj):
        return obj.bundle.name

    @admin.display(description='Product')
    def get_product_code(self, obj):
        return obj.product.product_code
