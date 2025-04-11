# products/admin.py
from django.contrib import admin
from .models import Product, ProductType, ProductSubtype

@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)

@admin.register(ProductSubtype)
class ProductSubtypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_type', 'created_at', 'updated_at')
    list_filter = ('product_type',)
    search_fields = ('name', 'product_type__name')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('code', 'shortname', 'product_type', 'product_subtype', 'is_active')
    list_filter = ('product_type', 'product_subtype', 'is_active')
    search_fields = ('code', 'fullname', 'shortname')
    readonly_fields = ('created_at', 'updated_at')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product_subtype":
            if request.resolver_match.kwargs.get('object_id'):
                product = self.get_object(request, request.resolver_match.kwargs['object_id'])
                if product and product.product_type:
                    kwargs["queryset"] = ProductSubtype.objects.filter(
                        product_type=product.product_type
                    )
            else:
                kwargs["queryset"] = ProductSubtype.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
