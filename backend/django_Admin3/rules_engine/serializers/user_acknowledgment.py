from rest_framework import serializers
from ..models import UserAcknowledgment


class UserAcknowledgmentSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.rule_name', read_only=True)
    template_name = serializers.CharField(source='message_template.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserAcknowledgment
        fields = '__all__'