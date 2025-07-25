# products/admin.py
from django.contrib import admin
from .models import Product
from .models.products import ProductVariation
from .models.product_group_filter import ProductGroupFilter

# Import the new filter admin - this ensures the admin classes are registered
from .admin import filter_admin


@admin.register(ProductGroupFilter)
class ProductGroupFilterAdmin(admin.ModelAdmin):
    list_display = ("name", "filter_type")
    list_filter = ("filter_type",)
    search_fields = ("name",)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('shortname', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('fullname', 'shortname', 'code')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ProductVariation)
class ProductVariationAdmin(admin.ModelAdmin):
    list_display = ("variation_type", "name", "description")
    list_filter = ("variation_type",)
    search_fields = ("name", "description")
