from rest_framework import serializers
from .models import TutorialEvent

class TutorialEventSerializer(serializers.ModelSerializer):
    exam_session_subject_product_variation_name = serializers.CharField(
        source='exam_session_subject_product_variation.name', 
        read_only=True
    )
    subject_code = serializers.CharField(
        source='exam_session_subject_product_variation.exam_session_subject_product.exam_session_subject.subject.code',
        read_only=True
    )
    
    class Meta:
        model = TutorialEvent
        fields = '__all__'
        extra_fields = ['exam_session_subject_product_variation_name', 'subject_code']
