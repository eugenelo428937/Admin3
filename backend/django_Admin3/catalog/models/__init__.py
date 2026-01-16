"""Catalog models package.

Re-exports all catalog models for clean imports:
    from catalog.models import Subject, Product, ExamSession, ExamSessionSubject, ...

Updated 2026-01-16: Added ExamSessionSubjectProduct (moved from exam_sessions_subjects_products)
as part of T087 legacy app cleanup.
"""
from .subject import Subject
from .exam_session import ExamSession
from .exam_session_subject import ExamSessionSubject
from .exam_session_subject_product import ExamSessionSubjectProduct
from .product import Product
from .product_variation import ProductVariation
from .product_product_variation import ProductProductVariation
from .product_product_group import ProductProductGroup
from .product_bundle import ProductBundle
from .product_bundle_product import ProductBundleProduct
from .product_variation_recommendation import ProductVariationRecommendation

__all__ = [
    'Subject',
    'ExamSession',
    'ExamSessionSubject',
    'ExamSessionSubjectProduct',
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
]
