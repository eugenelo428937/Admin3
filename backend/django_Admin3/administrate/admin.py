from django.contrib import admin
from .models import *

# Register your models here.

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'course_template', 'learning_mode', 'location', 'primary_instructor', 'lms_start_date', 'cancelled']
    list_filter = ['learning_mode', 'tutorial_category', 'location', 'cancelled', 'sold_out', 'web_sale']
    search_fields = ['title', 'course_template__code', 'course_template__title', 'external_id']
    date_hierarchy = 'lms_start_date'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('external_id', 'course_template', 'title', 'session_title')
        }),
        ('Tutorial Details', {
            'fields': ('learning_mode', 'tutorial_category', 'sitting')
        }),
        ('Location & Venue', {
            'fields': ('location', 'venue', 'virtual_classroom')
        }),
        ('Instructors', {
            'fields': ('primary_instructor', 'administrator', 'tutors')
        }),
        ('Capacity & Registration', {
            'fields': ('max_places', 'min_places', 'registration_deadline')
        }),
        ('Schedule', {
            'fields': ('lms_start_date', 'lms_end_date', 'access_duration', 'finalisation_date')
        }),
        ('URLs & Links', {
            'fields': ('event_url', 'session_url')
        }),
        ('Status & Flags', {
            'fields': ('lifecycle_state', 'sold_out', 'cancelled', 'web_sale')
        }),
        ('Recordings', {
            'fields': ('recordings', 'recording_pin')
        }),
        ('Integration', {
            'fields': ('ocr_moodle_code', 'sage_code', 'timezone')
        }),
        ('Additional Information', {
            'fields': ('extra_information',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['event', 'day_number', 'title', 'classroom_start_date', 'session_instructor', 'cancelled']
    list_filter = ['event__learning_mode', 'cancelled', 'classroom_start_date']
    search_fields = ['title', 'event__title', 'event__course_template__code']
    date_hierarchy = 'classroom_start_date'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('event', 'day_number', 'title')
        }),
        ('Schedule', {
            'fields': ('classroom_start_date', 'classroom_start_time', 'classroom_end_date', 'classroom_end_time')
        }),
        ('Instructor', {
            'fields': ('session_instructor',)
        }),
        ('Online Session', {
            'fields': ('session_url',)
        }),
        ('Status', {
            'fields': ('cancelled',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
