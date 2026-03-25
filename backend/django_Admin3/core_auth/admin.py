from django.contrib import admin
from .models import MachineToken


@admin.register(MachineToken)
class MachineTokenAdmin(admin.ModelAdmin):
    list_display = ['machine_name', 'user', 'is_active', 'created_at', 'last_used_at']
    list_filter = ['is_active']
    search_fields = ['machine_name', 'user__email']
    readonly_fields = ['token_hash', 'created_at', 'last_used_at']
