from django.contrib import admin
from .models import (
    TutorialEvents, TutorialSessions,
    TutorialCourseTemplate, Staff, TutorialInstructor,
    TutorialLocation, TutorialVenue,
)


@admin.register(TutorialEvents)
class TutorialEventAdmin(admin.ModelAdmin):
    list_display = ('code', 'venue', 'start_date', 'end_date', 'is_soldout', 'remain_space', 'finalisation_date')
    list_filter = ('is_soldout', 'venue', 'start_date')
    search_fields = ('code', 'venue')
    ordering = ('start_date', 'code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialSessions)
class TutorialSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'tutorial_event', 'sequence', 'location', 'venue', 'start_date', 'end_date')
    list_filter = ('location', 'venue')
    search_fields = ('title', 'location', 'venue')
    ordering = ('tutorial_event', 'sequence')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialCourseTemplate)
class TutorialCourseTemplateAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('code', 'title')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialInstructor)
class TutorialInstructorAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'staff', 'is_active', 'created_at')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialLocation)
class TutorialLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorialVenue)
class TutorialVenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
