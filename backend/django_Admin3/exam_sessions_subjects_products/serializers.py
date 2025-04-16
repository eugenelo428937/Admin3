from rest_framework import serializers
from .models import ExamSessionSubjectProduct
from exam_sessions_subjects.serializers import ExamSessionSubjectSerializer
from products.serializers import ProductSerializer
from subjects.models import Subject
from products.models.products import Product

class ExamSessionSubjectProductSerializer(serializers.ModelSerializer):
    exam_session_subject_details = ExamSessionSubjectSerializer(source='exam_session_subject', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ExamSessionSubjectProduct
        fields = ['id', 'exam_session_subject', 'product', 'created_at', 'updated_at',
                 'exam_session_subject_details', 'product_details']
        read_only_fields = ['created_at', 'updated_at']

class ProductListSerializer(serializers.ModelSerializer):
    subject_id = serializers.IntegerField(
        source='exam_session_subject.subject.id')
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code')
    subject_description = serializers.CharField(
        source='exam_session_subject.subject.description')
    
    product_id = serializers.IntegerField(source='product.id')
    product_code = serializers.CharField(source='product.code')
    product_name = serializers.CharField(source='product.fullname')
    product_short_name = serializers.CharField(source='product.shortname')
    product_description = serializers.CharField(source='product.description')
    product_type = serializers.CharField(source='product.product_type.name')
    product_subtype = serializers.CharField(
        source='product.product_subtype.name')

    class Meta:
        model = ExamSessionSubjectProduct
        fields = [
            'id', 'product_id', 'product_code', 'product_name', 'product_short_name',
            'product_description', 'subject_id', 'subject_code', 'subject_description',
            'product_type', 'product_subtype'
        ]
