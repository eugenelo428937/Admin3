"""
Script to add Mock Exam eBook to exam sessions where Mock Exam Marking already exists.

This script:
1. Finds all exam sessions that have Mock Exam Marking products
2. Creates corresponding ExamSessionSubjectProductVariation entries for Mock Exam eBook
3. Copies prices from similar products (or sets default prices)

Run with: python manage.py shell < add_mock_exam_ebook_to_sessions.py
"""

from exam_sessions_subjects_products.models import (
    ExamSessionSubjectProduct,
    ExamSessionSubjectProductVariation,
    Price
)
from products.models import Product, ProductProductVariation
from django.db import transaction

def add_mock_exam_ebook_to_sessions():
    """Add Mock Exam eBook to all exam sessions that have Mock Exam Marking."""

    # Get the Mock Exam product (eBook)
    mock_exam_product = Product.objects.get(id=89, code='M1', fullname='Mock Exam')
    mock_exam_ppv = ProductProductVariation.objects.get(
        id=289,
        product=mock_exam_product,
        product_variation__variation_type='eBook'
    )

    print(f"Mock Exam Product: {mock_exam_product.fullname}")
    print(f"ProductProductVariation: {mock_exam_ppv.id} ({mock_exam_ppv.product_variation.variation_type})")

    # Find all exam sessions that have Mock Exam Marking
    mock_exam_marking = Product.objects.get(id=79, code='M1', fullname='Mock Exam Marking')
    marking_essps = ExamSessionSubjectProduct.objects.filter(
        product=mock_exam_marking
    ).select_related('exam_session_subject__subject', 'exam_session_subject__exam_session')

    print(f"\nFound {marking_essps.count()} exam sessions with Mock Exam Marking")

    created_count = 0

    with transaction.atomic():
        for essp in marking_essps:
            exam_session = essp.exam_session_subject.exam_session
            subject = essp.exam_session_subject.subject

            # Check if Mock Exam eBook already exists for this session
            existing_essp = ExamSessionSubjectProduct.objects.filter(
                exam_session_subject=essp.exam_session_subject,
                product=mock_exam_product
            ).first()

            if not existing_essp:
                # Create ExamSessionSubjectProduct
                existing_essp = ExamSessionSubjectProduct.objects.create(
                    exam_session_subject=essp.exam_session_subject,
                    product=mock_exam_product,
                    active=True
                )
                print(f"\n✓ Created ESSP for {subject.code} - {exam_session.name}")

            # Check if ESSPV already exists
            existing_esspv = ExamSessionSubjectProductVariation.objects.filter(
                exam_session_subject_product=existing_essp,
                product_product_variation=mock_exam_ppv
            ).first()

            if not existing_esspv:
                # Create ExamSessionSubjectProductVariation
                esspv = ExamSessionSubjectProductVariation.objects.create(
                    exam_session_subject_product=existing_essp,
                    product_product_variation=mock_exam_ppv,
                    active=True
                )

                # Find "Additional Mock Pack" prices for this subject to use as template
                additional_mock_esspvs = ExamSessionSubjectProductVariation.objects.filter(
                    exam_session_subject_product__exam_session_subject=essp.exam_session_subject,
                    product_product_variation__product__shortname__icontains='Additional Mock'
                ).prefetch_related('prices').first()

                if additional_mock_esspvs and additional_mock_esspvs.prices.exists():
                    # Copy prices from Additional Mock Pack
                    for source_price in additional_mock_esspvs.prices.all():
                        Price.objects.create(
                            exam_session_subject_product_variation=esspv,
                            price_type=source_price.price_type,
                            amount=source_price.amount,
                            currency=source_price.currency,
                            active=True
                        )
                    print(f"  ✓ Created ESSPV with prices copied from Additional Mock Pack")
                else:
                    # Fallback to default price if no template found
                    Price.objects.create(
                        exam_session_subject_product_variation=esspv,
                        price_type='standard',
                        amount='25.00',
                        currency='gbp',
                        active=True
                    )
                    print(f"  ✓ Created ESSPV with default price £25.00")

                created_count += 1

    print(f"\n✅ Complete! Created {created_count} new ExamSessionSubjectProductVariation entries")
    print(f"\nNow the recommendations should appear on Mock Exam Marking product cards!")

# Run the function
if __name__ == '__main__':
    add_mock_exam_ebook_to_sessions()
