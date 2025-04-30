from django.contrib import admin
from .models import ActedProductCategory

@admin.register(ActedProductCategory)
class ActedProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
