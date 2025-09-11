from django.contrib import admin
from .models import (
    RuleEntryPoint, MessageTemplate, 
    HolidayCalendar, UserAcknowledgment, ContentStyleTheme, ContentStyle, 
    MessageTemplateStyle, ActedRulesFields, ActedRule, ActedRuleExecution,
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


@admin.register(HolidayCalendar)
class HolidayCalendarAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'country', 'delivery_delay_days', 'is_business_day']
    list_filter = ['country', 'is_business_day', 'date']
    search_fields = ['name']
    ordering = ['date']


@admin.register(UserAcknowledgment)
class UserAcknowledgmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'rule', 'message_template', 'acknowledged_at']
    list_filter = ['acknowledged_at']
    search_fields = ['user__email', 'rule__name']
    readonly_fields = ['acknowledged_at']
    raw_id_fields = ['user', 'rule', 'message_template']


# Style Management Admin
class ContentStyleInline(admin.TabularInline):
    model = ContentStyle
    extra = 0
    fields = ['name', 'element_type', 'css_class_selector', 'background_color', 'text_color', 'border_color', 'is_active']


@admin.register(ContentStyleTheme)
class ContentStyleThemeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    inlines = [ContentStyleInline]
    
    fieldsets = [
        (None, {
            'fields': ['name', 'description', 'is_active']
        }),
        ('Timestamps', {
            'fields': ['created_at'],
            'classes': ['collapse']
        })
    ]


@admin.register(ContentStyle)
class ContentStyleAdmin(admin.ModelAdmin):
    list_display = ['name', 'element_type', 'category', 'theme', 'css_class_selector', 'is_active', 'priority']
    list_filter = ['element_type', 'category', 'theme', 'is_active']
    search_fields = ['name', 'css_class_selector', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-priority', 'name']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'element_type', 'category', 'theme', 'css_class_selector', 'priority', 'is_active']
        }),
        ('Colors', {
            'fields': ['background_color', 'text_color', 'border_color'],
            'classes': ['wide']
        }),
        ('Layout & Spacing', {
            'fields': ['padding', 'margin', 'border_width', 'border_radius'],
            'classes': ['wide']
        }),
        ('Typography', {
            'fields': ['font_size', 'font_weight', 'text_align'],
            'classes': ['wide']
        }),
        ('Advanced Styling', {
            'fields': ['custom_styles'],
            'classes': ['wide'],
            'description': 'JSON object for additional CSS properties (e.g., {"boxShadow": "0 2px 4px rgba(0,0,0,0.1)", "transition": "all 0.3s ease"})'
        }),
        ('Description', {
            'fields': ['description']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]


@admin.register(MessageTemplateStyle)
class MessageTemplateStyleAdmin(admin.ModelAdmin):
    list_display = ['message_template', 'theme', 'get_custom_styles_count']
    list_filter = ['theme', 'message_template__message_type']
    search_fields = ['message_template__name']
    filter_horizontal = ['custom_styles']
    
    fieldsets = [
        (None, {
            'fields': ['message_template', 'theme']
        }),
        ('Style Overrides', {
            'fields': ['custom_styles'],
            'description': 'Select specific styles to override for this template'
        })
    ]
    
    def get_custom_styles_count(self, obj):
        return obj.custom_styles.count()
    get_custom_styles_count.short_description = 'Custom Styles'


# =============================================================================
# JSONB-BASED RULES ENGINE ADMIN
# =============================================================================

@admin.register(ActedRulesFields)
class ActedRulesFieldsAdmin(admin.ModelAdmin):
    list_display = ['fields_id', 'name', 'version', 'is_active', 'created_at']
    list_filter = ['is_active', 'version', 'created_at']
    search_fields = ['fields_id', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['fields_id', 'name', 'description', 'version', 'is_active']
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
    list_display = ['rule_id', 'name', 'entry_point', 'priority', 'active', 'version', 'created_at']
    list_filter = ['entry_point', 'active', 'priority', 'version', 'created_at']
    search_fields = ['rule_id', 'name', 'description', 'entry_point__code']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Rule Identification', {
            'fields': ['rule_id', 'name', 'description', 'version']
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
    list_display = ['execution_id', 'entry_point', 'outcome', 'execution_time_ms', 'created_at']
    list_filter = ['outcome', 'entry_point', 'created_at']
    search_fields = ['execution_id', 'rule__rule_id', 'entry_point']
    readonly_fields = ['execution_id', 'entry_point', 'context_snapshot', 
                      'actions_result', 'outcome', 'execution_time_ms', 'error_message', 'created_at']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation of execution logs
    
    def has_change_permission(self, request, obj=None):
        return False  # Make executions read-only