from django.contrib import admin
from .models import (
    RuleEntryPoint, Rule, RuleCondition, RuleAction, MessageTemplate, 
    HolidayCalendar, UserAcknowledgment, RuleExecutionLegacy, RuleChain, 
    RuleChainLink, RuleConditionGroup, ContentStyleTheme, ContentStyle, 
    MessageTemplateStyle, ActedRulesFields, ActedRule, ActedRuleExecution
)


class RuleConditionInline(admin.TabularInline):
    model = RuleCondition
    extra = 0
    fields = ['condition_group', 'condition_type', 'field_name', 'operator', 'value', 'is_negated']


class RuleActionInline(admin.TabularInline):
    model = RuleAction
    extra = 0


@admin.register(RuleEntryPoint)
class RuleEntryPointAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['code']


class RuleChainLinkInline(admin.TabularInline):
    model = RuleChainLink
    extra = 0
    fields = ['rule', 'execution_order', 'is_active', 'continue_on_failure']
    ordering = ['execution_order']


@admin.register(RuleChain)
class RuleChainAdmin(admin.ModelAdmin):
    list_display = ['name', 'entry_point', 'is_active', 'stop_on_failure', 'created_at']
    list_filter = ['entry_point', 'is_active', 'stop_on_failure', 'created_at']
    search_fields = ['name', 'description', 'entry_point__name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [RuleChainLinkInline]
    ordering = ['entry_point__code', 'name']


@admin.register(RuleChainLink)
class RuleChainLinkAdmin(admin.ModelAdmin):
    list_display = ['chain', 'rule', 'execution_order', 'is_active', 'continue_on_failure']
    list_filter = ['chain__entry_point', 'is_active', 'continue_on_failure']
    search_fields = ['chain__name', 'rule__name']
    ordering = ['chain', 'execution_order']


class RuleConditionGroupInline(admin.TabularInline):
    model = RuleConditionGroup
    extra = 0
    fields = ['name', 'logical_operator', 'parent_group', 'execution_order', 'is_active']


@admin.register(RuleConditionGroup)
class RuleConditionGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'rule', 'logical_operator', 'parent_group', 'execution_order', 'is_active']
    list_filter = ['logical_operator', 'is_active', 'rule__entry_point']
    search_fields = ['name', 'rule__name']
    ordering = ['rule', 'execution_order']


@admin.register(Rule)
class RuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_trigger_identifier', 'entry_point', 'priority', 'success_criteria', 'is_active', 'is_blocking', 'return_on_failure', 'created_at']
    list_filter = ['entry_point', 'trigger_type', 'success_criteria', 'is_active', 'is_blocking', 'return_on_failure', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['priority', 'name']
    inlines = [RuleConditionGroupInline, RuleConditionInline, RuleActionInline]
    raw_id_fields = ['entry_point']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'description', 'is_active']
        }),
        ('Entry Point & Trigger', {
            'fields': ['entry_point', 'trigger_type', 'priority']
        }),
        ('Success Criteria', {
            'fields': ['success_criteria', 'success_function', 'return_on_failure'],
            'description': 'Define how this rule determines success and whether to stop chain execution on failure'
        }),
        ('Blocking & Acknowledgment', {
            'fields': ['is_blocking'],
            'description': 'Whether this rule requires user acknowledgment before proceeding'
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    def get_trigger_identifier(self, obj):
        return obj.trigger_identifier
    get_trigger_identifier.short_description = 'Trigger'
    get_trigger_identifier.admin_order_field = 'entry_point__code'


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
    list_filter = ['acknowledged_at', 'rule__trigger_type']
    search_fields = ['user__email', 'rule__name']
    readonly_fields = ['acknowledged_at']
    raw_id_fields = ['user', 'rule', 'message_template']


@admin.register(RuleExecutionLegacy)
class RuleExecutionLegacyAdmin(admin.ModelAdmin):
    list_display = ['rule', 'user', 'conditions_met', 'execution_time']
    list_filter = ['conditions_met', 'execution_time']
    search_fields = ['rule__name', 'user__email']
    readonly_fields = ['rule', 'user', 'trigger_context', 'conditions_met', 
                      'actions_executed', 'execution_time', 'error_message']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation of execution logs
    
    def has_change_permission(self, request, obj=None):
        return False  # Make executions read-only


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


@admin.register(RuleCondition)
class RuleConditionAdmin(admin.ModelAdmin):
    list_display = ['rule', 'condition_group', 'condition_type', 'field_name', 'operator', 'value', 'is_negated']
    list_filter = ['condition_type', 'operator', 'is_negated', 'rule__entry_point', 'condition_group']
    search_fields = ['rule__name', 'field_name', 'value', 'condition_group__name']
    raw_id_fields = ['rule', 'condition_group']
    
    fieldsets = [
        ('Rule & Group', {
            'fields': ['rule', 'condition_group']
        }),
        ('Condition Definition', {
            'fields': ['condition_type', 'field_name', 'operator', 'value', 'is_negated']
        })
    ]


@admin.register(RuleAction)
class RuleActionAdmin(admin.ModelAdmin):
    list_display = ['rule', 'action_type', 'message_template', 'execution_order']
    list_filter = ['action_type', 'rule__entry_point']
    search_fields = ['rule__name']
    raw_id_fields = ['rule', 'message_template']


# =============================================================================
# NEW JSONB-BASED RULES ENGINE ADMIN
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
    search_fields = ['rule_id', 'name', 'description', 'entry_point']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Rule Identification', {
            'fields': ['rule_id', 'name', 'description', 'version']
        }),
        ('Execution Settings', {
            'fields': ['entry_point', 'priority', 'active', 'stop_processing']
        }),
        ('Rule Definition', {
            'fields': ['rules_fields_id', 'condition', 'actions'],
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
    list_display = ['execution_id', 'rule_id', 'entry_point', 'outcome', 'execution_time_ms', 'created_at']
    list_filter = ['outcome', 'entry_point', 'created_at']
    search_fields = ['execution_id', 'rule_id', 'entry_point']
    readonly_fields = ['execution_id', 'rule_id', 'entry_point', 'context_snapshot', 
                      'actions_result', 'outcome', 'execution_time_ms', 'error_message', 'created_at']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation of execution logs
    
    def has_change_permission(self, request, obj=None):
        return False  # Make executions read-only 