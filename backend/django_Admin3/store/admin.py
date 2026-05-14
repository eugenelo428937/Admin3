"""Admin configuration for the store app.

Phase 3.1: the single `ProductAdmin` is now a read-only cross-cut "All
Products" view. The three subclass admins (MaterialProduct,
TutorialProduct, MarkingProduct) are the canonical edit surfaces.
"""
from django.contrib import admin
from store.models import (
    Product,
    MaterialProduct,
    TutorialProduct,
    MarkingProduct,
    Price,
    Bundle,
    BundleProduct,
    Purchasable,
    GenericItem,
)


@admin.register(Purchasable)
class PurchasableAdmin(admin.ModelAdmin):
    """Admin for the unified store.Purchasable catalog parent.

    Product rows also appear here (MTI subclass); edit subclass-specific
    fields via MaterialProductAdmin / TutorialProductAdmin /
    MarkingProductAdmin. GenericItem rows have their own admin.
    """
    list_display = ['code', 'kind', 'name', 'is_active', 'dynamic_pricing', 'updated_at']
    list_filter = ['kind', 'is_active', 'dynamic_pricing']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']
    list_per_page = 50


@admin.register(GenericItem)
class GenericItemAdmin(admin.ModelAdmin):
    """Admin for non-ESS catalog items (marking vouchers, binders, additional charges)."""
    list_display = [
        'code', 'kind', 'name', 'validity_period_days',
        'stock_tracked', 'dynamic_pricing', 'is_active',
    ]
    list_filter = ['kind', 'is_active', 'stock_tracked', 'dynamic_pricing']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['kind', 'code']


class PriceInline(admin.TabularInline):
    """Inline admin for prices within a product.

    Price.purchasable is the FK; Product is an MTI subclass of Purchasable
    so this inline resolves correctly when added to any subclass admin.
    """
    model = Price
    fk_name = 'purchasable'
    extra = 0
    fields = ['price_type', 'amount', 'currency']


class BundleProductInline(admin.TabularInline):
    model = BundleProduct
    extra = 0
    fields = ['product', 'quantity', 'default_price_type', 'sort_order', 'is_active']
    raw_id_fields = ['product']


# ──────────────────────────────────────────────────────────────────────
# Shared mixin — every admin below has an `exam_session_subject` FK
# ──────────────────────────────────────────────────────────────────────
class ESSAdminMixin:
    """Shared display columns + select_related for admins whose models
    have an `exam_session_subject` FK (Product + its three subclasses
    + Bundle).

    Subclasses can extend the select_related set by overriding
    `_extra_select_related()` to return a tuple of additional paths.
    """

    _base_select_related = (
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
    )

    def _extra_select_related(self):
        return ()

    def get_queryset(self, request):
        paths = self._base_select_related + tuple(self._extra_select_related())
        return super().get_queryset(request).select_related(*paths)

    @admin.display(description='Subject', ordering='exam_session_subject__subject__code')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session', ordering='exam_session_subject__exam_session__session_code')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code


# ──────────────────────────────────────────────────────────────────────
# Product cross-cut admin — read-only "All Products" list
# ──────────────────────────────────────────────────────────────────────
@admin.register(Product)
class ProductAdmin(ESSAdminMixin, admin.ModelAdmin):
    """Read-only cross-cut view of every store.Product (any subclass).

    Editing happens via the subclass admins. This view exists so staff
    can scan all products in one place without knowing the subclass.
    """
    list_display = [
        'product_code',
        'get_kind',
        'get_subject_code',
        'get_session_code',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
    ]
    search_fields = ['product_code']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    ordering = ['product_code']

    def has_add_permission(self, request):
        # Adding is done via subclass admins; this view is read-only.
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Kind', ordering='kind')
    def get_kind(self, obj):
        return obj.kind


# ──────────────────────────────────────────────────────────────────────
# Per-subclass admins — the canonical edit surfaces
# ──────────────────────────────────────────────────────────────────────
@admin.register(MaterialProduct)
class MaterialProductAdmin(ESSAdminMixin, admin.ModelAdmin):
    """Admin for store.MaterialProduct (eBook / Printed / Hub material rows).

    `product_product_variation` still lives on the Product parent through
    Phases 1–4; Phase 5 moves it to MaterialProduct.
    """
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'get_variation_type',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'product_product_variation__product_variation__variation_type',
    ]
    search_fields = ['product_code']
    raw_id_fields = ['exam_session_subject', 'product_product_variation']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    def _extra_select_related(self):
        return ('product_product_variation__product_variation',)

    @admin.display(description='Variation')
    def get_variation_type(self, obj):
        ppv = obj.product_product_variation
        return ppv.product_variation.variation_type if ppv else '—'


@admin.register(TutorialProduct)
class TutorialProductAdmin(ESSAdminMixin, admin.ModelAdmin):
    """Admin for store.TutorialProduct (Face-to-Face / Live Online / OC)."""
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'format',
        'get_location',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'format',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'tutorial_location',
    ]
    search_fields = ['product_code']
    raw_id_fields = [
        'exam_session_subject',
        'tutorial_course_template',
        'tutorial_location',
    ]
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    def _extra_select_related(self):
        return ('tutorial_location',)

    @admin.display(description='Location')
    def get_location(self, obj):
        loc = obj.tutorial_location
        return loc.code if loc else '—'


@admin.register(MarkingProduct)
class MarkingProductAdmin(ESSAdminMixin, admin.ModelAdmin):
    """Admin for store.MarkingProduct (Series X, Mock Marking N, etc.)."""
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'get_template_code',
        'paper_count',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'marking_template',
    ]
    search_fields = ['product_code', 'marking_template__code', 'marking_template__name']
    raw_id_fields = ['exam_session_subject', 'marking_template']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    def _extra_select_related(self):
        return ('marking_template',)

    @admin.display(description='Template', ordering='marking_template__code')
    def get_template_code(self, obj):
        mt = obj.marking_template
        return mt.code if mt else '—'


# ──────────────────────────────────────────────────────────────────────
# Price / Bundle admins (unchanged from pre-Phase-3)
# ──────────────────────────────────────────────────────────────────────
@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ['get_purchasable_code', 'price_type', 'amount', 'currency']
    list_filter = ['price_type', 'currency']
    search_fields = ['purchasable__code']
    raw_id_fields = ['purchasable']

    @admin.display(description='Purchasable')
    def get_purchasable_code(self, obj):
        return obj.purchasable.code if obj.purchasable_id else '—'


@admin.register(Bundle)
class BundleAdmin(ESSAdminMixin, admin.ModelAdmin):
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

    @admin.display(description='Products')
    def get_product_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()


@admin.register(BundleProduct)
class BundleProductAdmin(admin.ModelAdmin):
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
