from django.contrib import admin
from .models import Staff, Team, TeamStaff


class TeamStaffInline(admin.TabularInline):
    model = TeamStaff
    extra = 1
    autocomplete_fields = ['staff']


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'job_title', 'name_format', 'show_job_title', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'job_title')
    list_filter = ('name_format', 'show_job_title')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'default_sign_off_text', 'is_active', 'created_at')
    search_fields = ('name', 'display_name')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [TeamStaffInline]


@admin.register(TeamStaff)
class TeamStaffAdmin(admin.ModelAdmin):
    list_display = ('team', 'staff', 'is_active', 'created_at')
    list_filter = ('is_active', 'team')
    autocomplete_fields = ['team', 'staff']
    readonly_fields = ('created_at', 'updated_at')
