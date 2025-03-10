# exam_sessions/serializers.py
from rest_framework import serializers
from .models import ExamSession

class ExamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date', 'create_date', 'modified_date']
        read_only_fields = ['create_date', 'modified_date']
