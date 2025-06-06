from rest_framework import serializers
from .models import Subject

class SubjectSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='description', read_only=True)  # Add name field for frontend compatibility
    
    class Meta:
        model = Subject
        fields = ['id', 'code', 'description', 'name']
