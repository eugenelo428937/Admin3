from django.contrib import admin
from .models import Country

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "iso_code", "phone_code", "vat_percent", "have_postcode")
    search_fields = ("name", "iso_code", "phone_code")
    list_filter = ("have_postcode",)
