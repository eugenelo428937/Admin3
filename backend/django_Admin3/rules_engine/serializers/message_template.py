from rest_framework import serializers
from ..models import MessageTemplate


class MessageTemplateSerializer(serializers.ModelSerializer):
    template_id = serializers.CharField(source='name', read_only=True)
    format = serializers.CharField(source='content_format', read_only=True)
    content_json = serializers.JSONField(source='json_content', read_only=True)
    
    class Meta:
        model = MessageTemplate
        fields = [
            'id', 'template_id', 'name', 'title', 'content', 'content_json',
            'format', 'content_format', 'json_content', 'message_type', 
            'variables', 'created_at', 'updated_at'
        ]