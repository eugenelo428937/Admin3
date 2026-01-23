from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
import json

from .models import (
    EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailQueue, EmailLog, EmailSettings,
    EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder,
)


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'display_name', 'template_type', 'use_master_template',
        'enable_queue', 'is_active', 'created_at'
    ]
    list_filter = [
        'template_type', 'use_master_template', 'enable_queue',
        'enable_tracking', 'is_active', 'created_at'
    ]
    search_fields = ['name', 'display_name', 'description', 'subject_template']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'template_type', 'display_name', 'description')
        }),
        ('Template Configuration', {
            'fields': (
                'subject_template', 'content_template_name', 'use_master_template'
            )
        }),
        ('Email Settings', {
            'fields': ('from_email', 'reply_to_email', 'default_priority')
        }),
        ('Processing Options', {
            'fields': (
                'enable_tracking', 'enable_queue', 'max_retry_attempts',
                'retry_delay_minutes', 'enhance_outlook_compatibility'
            )
        }),
        ('Metadata', {
            'fields': ('is_active', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by')


class EmailTemplateAttachmentInline(admin.TabularInline):
    model = EmailTemplateAttachment
    extra = 1
    fields = ['attachment', 'is_required', 'order', 'include_condition']
    readonly_fields = ['created_at']


@admin.register(EmailAttachment)
class EmailAttachmentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'display_name', 'attachment_type', 'file_size_display',
        'is_conditional', 'is_active', 'created_at'
    ]
    list_filter = ['attachment_type', 'is_conditional', 'is_active', 'created_at']
    search_fields = ['name', 'display_name', 'description', 'file_path']
    readonly_fields = ['created_at', 'updated_at', 'file_size_display']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'attachment_type', 'description')
        }),
        ('File Information', {
            'fields': ('file_path', 'file_url', 'mime_type', 'file_size_display')
        }),
        ('Configuration', {
            'fields': ('is_conditional', 'condition_rules')
        }),
        ('Metadata', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    inlines = [EmailTemplateAttachmentInline]

    def file_size_display(self, obj):
        """Display file size in human-readable format."""
        if obj.file_size == 0:
            return '-'

        for unit in ['B', 'KB', 'MB', 'GB']:
            if obj.file_size < 1024.0:
                return f"{obj.file_size:.1f} {unit}"
            obj.file_size /= 1024.0
        return f"{obj.file_size:.1f} TB"

    file_size_display.short_description = 'File Size'


@admin.register(EmailQueue)
class EmailQueueAdmin(admin.ModelAdmin):
    list_display = [
        'queue_id_short', 'subject_truncated', 'recipients_display',
        'template', 'priority', 'status', 'scheduled_at', 'attempts'
    ]
    list_filter = [
        'status', 'priority', 'template__template_type',
        'scheduled_at', 'created_at'
    ]
    search_fields = ['queue_id', 'subject', 'to_emails', 'from_email']
    readonly_fields = [
        'queue_id', 'created_at', 'updated_at', 'last_attempt_at',
        'sent_at', 'processing_time_display'
    ]

    fieldsets = (
        ('Queue Information', {
            'fields': ('queue_id', 'template', 'priority', 'status')
        }),
        ('Email Details', {
            'fields': (
                'subject', 'from_email', 'reply_to_email',
                'to_emails', 'cc_emails', 'bcc_emails'
            )
        }),
        ('Content', {
            'fields': ('email_context', 'html_content', 'text_content'),
            'classes': ('collapse',)
        }),
        ('Scheduling', {
            'fields': (
                'scheduled_at', 'process_after', 'expires_at'
            )
        }),
        ('Processing', {
            'fields': (
                'attempts', 'max_attempts', 'last_attempt_at',
                'next_retry_at', 'sent_at'
            )
        }),
        ('Results', {
            'fields': ('error_message', 'error_details'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('tags', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    actions = ['retry_failed_emails', 'cancel_emails', 'mark_as_processed']

    def queue_id_short(self, obj):
        """Display shortened queue ID."""
        return str(obj.queue_id)[:8] + '...'
    queue_id_short.short_description = 'Queue ID'

    def subject_truncated(self, obj):
        """Display truncated subject."""
        if len(obj.subject) > 50:
            return obj.subject[:50] + '...'
        return obj.subject
    subject_truncated.short_description = 'Subject'

    def recipients_display(self, obj):
        """Display recipient count and first few emails."""
        count = len(obj.to_emails)
        if count == 1:
            return obj.to_emails[0]
        elif count <= 3:
            return ', '.join(obj.to_emails)
        else:
            return f"{', '.join(obj.to_emails[:2])} (+{count-2} more)"
    recipients_display.short_description = 'Recipients'

    def processing_time_display(self, obj):
        """Display processing time."""
        return f"{obj.processing_time_ms}ms" if obj.processing_time_ms else '-'
    processing_time_display.short_description = 'Processing Time'

    def retry_failed_emails(self, request, queryset):
        """Retry failed emails."""
        failed_emails = queryset.filter(status='failed')
        count = 0
        for email in failed_emails:
            if email.can_retry():
                email.schedule_retry()
                count += 1

        self.message_user(request, f"Scheduled {count} emails for retry.")
    retry_failed_emails.short_description = "Retry failed emails"

    def cancel_emails(self, request, queryset):
        """Cancel pending emails."""
        pending_emails = queryset.filter(status__in=['pending', 'retry'])
        count = pending_emails.update(status='cancelled')
        self.message_user(request, f"Cancelled {count} emails.")
    cancel_emails.short_description = "Cancel pending emails"

    def mark_as_processed(self, request, queryset):
        """Mark emails as processed (for testing)."""
        count = queryset.filter(status='pending').update(
            status='sent',
            sent_at=timezone.now()
        )
        self.message_user(request, f"Marked {count} emails as sent.")
    mark_as_processed.short_description = "Mark as sent (testing)"


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = [
        'log_id_short', 'subject_truncated', 'to_email', 'template',
        'status', 'queued_at', 'sent_at', 'open_count', 'click_count'
    ]
    list_filter = [
        'status', 'template__template_type', 'priority',
        'queued_at', 'sent_at', 'opened_at'
    ]
    search_fields = [
        'log_id', 'to_email', 'from_email', 'subject',
        'response_code', 'esp_message_id'
    ]
    readonly_fields = [
        'log_id', 'content_hash', 'queued_at', 'sent_at',
        'delivered_at', 'opened_at', 'first_clicked_at',
        'total_size_display', 'processing_time_display'
    ]

    fieldsets = (
        ('Log Information', {
            'fields': ('log_id', 'queue_item', 'template', 'status', 'priority')
        }),
        ('Email Details', {
            'fields': ('to_email', 'from_email', 'subject')
        }),
        ('Content', {
            'fields': (
                'content_hash',
                'attachment_info', 'total_size_display'
            ),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': (
                'queued_at', 'sent_at', 'delivered_at',
                'opened_at', 'first_clicked_at'
            )
        }),
        ('Response Tracking', {
            'fields': (
                'response_code', 'response_message', 'error_message',
                'esp_message_id', 'esp_response'
            ),
            'classes': ('collapse',)
        }),
        ('Analytics', {
            'fields': ('open_count', 'click_count', 'user_agent', 'ip_address')
        }),
        ('Metadata', {
            'fields': (
                'recipient_info', 'email_context', 'metadata',
                'tags', 'processed_by', 'processing_time_display'
            ),
            'classes': ('collapse',)
        })
    )

    def log_id_short(self, obj):
        """Display shortened log ID."""
        return str(obj.log_id)[:8] + '...'
    log_id_short.short_description = 'Log ID'

    def subject_truncated(self, obj):
        """Display truncated subject."""
        if len(obj.subject) > 50:
            return obj.subject[:50] + '...'
        return obj.subject
    subject_truncated.short_description = 'Subject'

    def total_size_display(self, obj):
        """Display total size in human-readable format."""
        if obj.total_size_bytes == 0:
            return '-'

        size = obj.total_size_bytes
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    total_size_display.short_description = 'Total Size'

    def processing_time_display(self, obj):
        """Display processing time."""
        return f"{obj.processing_time_ms}ms" if obj.processing_time_ms else '-'
    processing_time_display.short_description = 'Processing Time'


@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = [
        'key', 'display_name', 'setting_type', 'value_preview',
        'is_required', 'is_sensitive', 'is_active', 'updated_at'
    ]
    list_filter = ['setting_type', 'is_required', 'is_sensitive', 'is_active']
    search_fields = ['key', 'display_name', 'description']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Setting Information', {
            'fields': ('key', 'setting_type', 'display_name', 'description')
        }),
        ('Value', {
            'fields': ('value', 'default_value')
        }),
        ('Configuration', {
            'fields': (
                'is_required', 'is_sensitive', 'validation_rules'
            )
        }),
        ('Metadata', {
            'fields': ('is_active', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def value_preview(self, obj):
        """Display value preview (hide sensitive values)."""
        if obj.is_sensitive:
            return '*** (sensitive) ***'

        value_str = str(obj.value)
        if len(value_str) > 50:
            return value_str[:50] + '...'
        return value_str
    value_preview.short_description = 'Value'

    def save_model(self, request, obj, form, change):
        """Set the updated_by field when saving."""
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


class EmailTemplateContentRuleInline(admin.TabularInline):
    model = EmailTemplateContentRule
    extra = 1
    fields = ['content_rule', 'is_enabled', 'priority_override', 'content_override']
    readonly_fields = ['created_at']


@admin.register(EmailContentRule)
class EmailContentRuleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'rule_type', 'placeholder', 'condition_field',
        'condition_operator', 'priority', 'is_active', 'is_exclusive'
    ]
    list_filter = [
        'rule_type', 'condition_operator', 'placeholder',
        'is_active', 'is_exclusive', 'created_at'
    ]
    search_fields = ['name', 'description', 'condition_field', 'placeholder__name']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'rule_type', 'placeholder')
        }),
        ('Condition Configuration', {
            'fields': (
                'condition_field', 'condition_operator', 'condition_value',
                'additional_conditions', 'custom_logic'
            )
        }),
        ('Priority and Behavior', {
            'fields': ('priority', 'is_exclusive', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        """Auto-set created_by when creating a new rule."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(EmailTemplateContentRule)
class EmailTemplateContentRuleAdmin(admin.ModelAdmin):
    list_display = [
        'template', 'content_rule', 'is_enabled', 'effective_priority', 'created_at'
    ]
    list_filter = [
        'is_enabled', 'template__template_type', 'content_rule__rule_type', 'created_at'
    ]
    search_fields = [
        'template__name', 'content_rule__name', 'template__display_name'
    ]
    readonly_fields = ['created_at', 'effective_priority']

    fieldsets = (
        ('Association', {
            'fields': ('template', 'content_rule', 'is_enabled')
        }),
        ('Rule Overrides', {
            'fields': ('priority_override', 'content_override')
        }),
        ('Metadata', {
            'fields': ('created_at', 'effective_priority'),
            'classes': ('collapse',)
        })
    )

    def effective_priority(self, obj):
        """Display the effective priority for this rule association."""
        return obj.effective_priority
    effective_priority.short_description = 'Effective Priority'


@admin.register(EmailContentPlaceholder)
class EmailContentPlaceholderAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'display_name', 'is_required', 'allow_multiple_rules',
        'is_active', 'created_at'
    ]
    list_filter = [
        'is_required', 'allow_multiple_rules', 'is_active', 'created_at'
    ]
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description')
        }),
        ('Content Template Configuration', {
            'fields': ('default_content_template', 'content_variables', 'insert_position')
        }),
        ('Placeholder Configuration', {
            'fields': (
                'is_required', 'allow_multiple_rules', 'content_separator'
            )
        }),
        ('Metadata', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
