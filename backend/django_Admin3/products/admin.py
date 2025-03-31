from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('code', 'shortname', 'fullname', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'shortname', 'fullname')
