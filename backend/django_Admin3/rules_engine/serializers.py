from rest_framework import serializers
from .models import (
    Rule, RuleCondition, RuleAction, MessageTemplate, 
    HolidayCalendar, UserAcknowledgment, RuleExecution
)


class RuleConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleCondition
        fields = '__all__'


class RuleActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleAction
        fields = '__all__'


class RuleSerializer(serializers.ModelSerializer):
    conditions = RuleConditionSerializer(many=True, read_only=True)
    actions = RuleActionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Rule
        fields = '__all__'


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = '__all__'


class HolidayCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = HolidayCalendar
        fields = '__all__'


class UserAcknowledgmentSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    template_name = serializers.CharField(source='message_template.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserAcknowledgment
        fields = '__all__'


class RuleExecutionSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = RuleExecution
        fields = '__all__' 