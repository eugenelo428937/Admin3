from django.contrib import admin
from .models import (
    Rule, RuleCondition, RuleAction, MessageTemplate, 
    HolidayCalendar, UserAcknowledgment, RuleExecution
)


class RuleConditionInline(admin.TabularInline):
    model = RuleCondition
    extra = 1


class RuleActionInline(admin.TabularInline):
    model = RuleAction
    extra = 1


@admin.register(Rule)
class RuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger_type', 'priority', 'is_active', 'is_blocking', 'created_at']
    list_filter = ['trigger_type', 'is_active', 'is_blocking', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['priority', 'name']
    inlines = [RuleConditionInline, RuleActionInline]


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'message_type', 'is_active', 'created_at']
    list_filter = ['message_type', 'is_active', 'created_at']
    search_fields = ['name', 'title', 'content']
    readonly_fields = ['created_at', 'updated_at']


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


@admin.register(RuleExecution)
class RuleExecutionAdmin(admin.ModelAdmin):
    list_display = ['rule', 'user', 'conditions_met', 'execution_time']
    list_filter = ['conditions_met', 'execution_time', 'rule__trigger_type']
    search_fields = ['rule__name', 'user__email']
    readonly_fields = ['execution_time']
    raw_id_fields = ['rule', 'user']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation of execution logs 