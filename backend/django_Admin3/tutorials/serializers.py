from rest_framework import serializers
from .models import TutorialEvent

class TutorialEventSerializer(serializers.ModelSerializer):
    exam_session_subject_product_variation_name = serializers.CharField(
        source='exam_session_subject_product_variation.name', 
        read_only=True
    )
    
    class Meta:
        model = TutorialEvent
        fields = '__all__'
        extra_fields = ['exam_session_subject_product_variation_name']
