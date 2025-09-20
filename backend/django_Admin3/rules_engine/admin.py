from django.contrib import admin
from .models import (
    RuleEntryPoint, MessageTemplate,
    ActedRulesFields, ActedRule, ActedRuleExecution,
    RuleExecution  # Alias for ActedRuleExecution
)


@admin.register(RuleEntryPoint)
class RuleEntryPointAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['code']


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'message_type', 'content_format', 'is_active', 'created_at']
    list_filter = ['message_type', 'content_format', 'is_active', 'created_at']
    search_fields = ['name', 'title', 'content']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        (None, {
            'fields': ['name', 'title', 'message_type', 'content_format', 'is_active']
        }),
        ('HTML/Markdown Content', {
            'fields': ['content'],
            'classes': ['wide'],
            'description': 'Traditional HTML or Markdown content'
        }),
        ('JSON Content', {
            'fields': ['json_content'],
            'classes': ['wide'],
            'description': 'Structured JSON content for Material UI rendering. Use this for better control over frontend components.'
        }),
        ('Variables & Metadata', {
            'fields': ['variables'],
            'classes': ['wide']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]



# =============================================================================
# JSONB-BASED RULES ENGINE ADMIN
# =============================================================================

@admin.register(ActedRulesFields)
class ActedRulesFieldsAdmin(admin.ModelAdmin):
    list_display = ['fields_code', 'name', 'version', 'is_active', 'created_at']
    list_filter = ['is_active', 'version', 'created_at']
    search_fields = ['fields_code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['fields_code', 'name', 'description', 'version', 'is_active']
        }),
        ('Schema Definition', {
            'fields': ['schema'],
            'classes': ['wide']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]


@admin.register(ActedRule)
class ActedRuleAdmin(admin.ModelAdmin):
    list_display = ['rule_code', 'name', 'entry_point', 'priority', 'active', 'version', 'created_at']
    list_filter = ['entry_point', 'active', 'priority', 'version', 'created_at']
    search_fields = ['rule_code', 'name', 'description', 'entry_point__code']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Rule Identification', {
            'fields': ['rule_code', 'name', 'description', 'version']
        }),
        ('Execution Settings', {
            'fields': ['entry_point', 'priority', 'active', 'stop_processing']
        }),
        ('Rule Definition', {
            'fields': ['rules_fields', 'rule_data'],
            'classes': ['wide']
        }),
        ('Schedule', {
            'fields': ['active_from', 'active_until'],
            'classes': ['collapse']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('entry_point', 'priority', 'name')


@admin.register(ActedRuleExecution)
class ActedRuleExecutionAdmin(admin.ModelAdmin):
    list_display = ['execution_seq_no', 'entry_point', 'outcome', 'execution_time_ms', 'created_at']
    list_filter = ['outcome', 'entry_point', 'created_at']
    search_fields = ['execution_seq_no', 'rule__rule_code', 'entry_point']
    readonly_fields = ['execution_seq_no', 'entry_point', 'context_snapshot', 
                      'actions_result', 'outcome', 'execution_time_ms', 'error_message', 'created_at']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation of execution logs
    
    def has_change_permission(self, request, obj=None):
        return False  # Make executions read-only