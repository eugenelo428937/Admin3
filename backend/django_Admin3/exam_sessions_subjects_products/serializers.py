from rest_framework import serializers
from .models import ExamSessionSubjectProduct
from exam_sessions_subjects.serializers import ExamSessionSubjectSerializer
from products.serializers import ProductSerializer

class ExamSessionSubjectProductSerializer(serializers.ModelSerializer):
    exam_session_subject_details = ExamSessionSubjectSerializer(source='exam_session_subject', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ExamSessionSubjectProduct
        fields = ['id', 'exam_session_subject', 'product', 'created_at', 'updated_at',
                 'exam_session_subject_details', 'product_details']
        read_only_fields = ['created_at', 'updated_at']