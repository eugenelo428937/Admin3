from rest_framework import serializers
from .models import Event, Session

class EventSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    location = serializers.CharField(source='location.title', read_only=True)
    venue = serializers.CharField(source='venue.title', read_only=True)
    learning_mode_display = serializers.CharField(source='get_learning_mode_display', read_only=True)
    primary_instructor_name = serializers.CharField(source='primary_instructor.name', read_only=True)
    
    class Meta:
        model = Event
        fields = '__all__'
        # Add extra fields for frontend grouping
        extra_fields = ['subject', 'location', 'venue', 'learning_mode_display', 'primary_instructor_name']

    def get_subject(self, obj):
        return obj.course_template.title if obj.course_template else ''

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'
