# products/admin.py
from django.contrib import admin
from .models import Product, ProductCategory, ProductSubcategory, ProductGroup
from .models.products import ProductVariation
from .models.product_main_category import ProductMainCategory
from .models.product_group_filter import ProductGroupFilter

@admin.register(ProductMainCategory)
class ProductMainCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)

@admin.register(ProductSubcategory)
class ProductSubcategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_category', 'created_at', 'updated_at')
    list_filter = ('product_category',)
    search_fields = ('name', 'product_category__name')

@admin.register(ProductGroup)
class ProductGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "parent")
    search_fields = ("name",)
    list_filter = ("parent",)

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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product_subcategory":
            if request.resolver_match.kwargs.get('object_id'):
                product = self.get_object(request, request.resolver_match.kwargs['object_id'])
                if product and product.product_category:
                    kwargs["queryset"] = ProductSubcategory.objects.filter(
                        product_category=product.product_category
                    )
            else:
                kwargs["queryset"] = ProductSubcategory.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(ProductVariation)
class ProductVariationAdmin(admin.ModelAdmin):
    list_display = ("variation_type", "name", "description")
    list_filter = ("variation_type",)
    search_fields = ("name", "description")
