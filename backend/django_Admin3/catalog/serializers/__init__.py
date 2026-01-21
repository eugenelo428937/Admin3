"""
Catalog serializers package.

Re-exports all catalog serializers for convenient imports:
    from catalog.serializers import SubjectSerializer, ProductSerializer

Serializer modules:
- subject_serializers: SubjectSerializer
- exam_session_serializers: ExamSessionSerializer
- product_serializers: ProductSerializer, ProductVariationSerializer
- bundle_serializers: Bundle-related serializers
"""

from .subject_serializers import SubjectSerializer
from .exam_session_serializers import ExamSessionSerializer, ExamSessionSubjectSerializer
from .product_serializers import ProductSerializer, ProductVariationSerializer
from .bundle_serializers import (
    ProductBundleSerializer,
    ProductBundleProductSerializer,
    ExamSessionSubjectBundleSerializer,
    ExamSessionSubjectBundleProductSerializer,
)

__all__ = [
    # Subject serializers
    'SubjectSerializer',

    # Exam session serializers
    'ExamSessionSerializer',
    'ExamSessionSubjectSerializer',

    # Product serializers
    'ProductSerializer',
    'ProductVariationSerializer',

    # Bundle serializers
    'ProductBundleSerializer',
    'ProductBundleProductSerializer',
    'ExamSessionSubjectBundleSerializer',
    'ExamSessionSubjectBundleProductSerializer',
]
