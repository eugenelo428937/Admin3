"""Django admin configuration for catalog.subject."""
from django.contrib import admin
from .models import Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin interface for Subject model."""
    list_display = ('code', 'description', 'active', 'created_at', 'updated_at')
    list_filter = ('active', 'created_at')
    search_fields = ('code', 'description')
    ordering = ('code',)
