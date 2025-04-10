from rest_framework import serializers
from .models import ExamSessionSubject
from subjects.serializers import SubjectSerializer
from exam_sessions.serializers import ExamSessionSerializer
from products.serializers import ProductSerializer

class ExamSessionSubjectSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    exam_session_details = ExamSessionSerializer(source='exam_session', read_only=True)
    products_details = ProductSerializer(source='products', many=True, read_only=True)

    class Meta:
        model = ExamSessionSubject
        fields = ['id', 'exam_session', 'subject', 'products', 
                 'created_at', 'updated_at', 'subject_details', 
                 'exam_session_details', 'products_details']
        read_only_fields = ['created_at', 'updated_at']