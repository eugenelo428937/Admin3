"""Session setup service for copying products and creating bundles.

Orchestrates the Step 3 atomic copy/create operation:
- Copy active non-tutorial products from previous session
- Copy prices for each copied product
- Create bundles from catalog templates
- Populate bundle products by matching PPVs
"""
import logging

from django.db import transaction

from catalog.models import ExamSessionSubject, ProductBundle, ProductBundleProduct
from store.models.product import Product
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

logger = logging.getLogger(__name__)


class SessionSetupService:
    """Service for copying products and bundles from a previous exam session."""

    @staticmethod
    @transaction.atomic
    def copy_products_and_bundles(new_session_id, previous_session_id):
        """
        Copy active non-tutorial products and prices from the previous session,
        then create bundles from catalog templates for the new session.

        Args:
            new_session_id: ID of the newly created exam session
            previous_session_id: ID of the previous exam session to copy from

        Returns:
            dict with counts of created records and skipped subjects

        Raises:
            ValueError: If no ESS records exist for the new session
        """
        # 1. Build subject → new_ess mapping for the new session
        new_ess_records = ExamSessionSubject.objects.filter(
            exam_session_id=new_session_id
        ).select_related('subject')

        if not new_ess_records.exists():
            raise ValueError(
                f"No exam session subjects found for session {new_session_id}. "
                "Complete Step 2 first."
            )

        subject_to_new_ess = {ess.subject_id: ess for ess in new_ess_records}

        # 2. Get active products from previous session, excluding tutorials
        previous_products = Product.objects.filter(
            exam_session_subject__exam_session_id=previous_session_id,
            is_active=True,
        ).exclude(
            product_product_variation__product_variation__variation_type='Tutorial'
        ).select_related(
            'exam_session_subject__subject',
            'product_product_variation__product_variation',
        )

        products_created = 0
        prices_created = 0
        skipped_subjects = set()
        # Track new products for bundle creation: (new_ess_id, ppv_id) → new_product
        new_product_lookup = {}

        # 3. Copy each product to the new session
        for prev_product in previous_products:
            subject_id = prev_product.exam_session_subject.subject_id
            new_ess = subject_to_new_ess.get(subject_id)

            if not new_ess:
                skipped_subjects.add(prev_product.exam_session_subject.subject.code)
                continue

            # Create new product (product_code auto-generates on save)
            new_product = Product(
                exam_session_subject=new_ess,
                product_product_variation=prev_product.product_product_variation,
                is_active=True,
            )
            new_product.save()
            products_created += 1
            new_product_lookup[
                (new_ess.id, prev_product.product_product_variation_id)
            ] = new_product

            # 4. Copy prices for this product
            prev_prices = Price.objects.filter(product=prev_product)
            for prev_price in prev_prices:
                Price.objects.create(
                    product=new_product,
                    price_type=prev_price.price_type,
                    amount=prev_price.amount,
                    currency=prev_price.currency,
                )
                prices_created += 1

        # 5. Create bundles from catalog templates
        bundles_created = 0
        bundle_products_created = 0

        for new_ess in new_ess_records:
            # Find active catalog bundle templates for this subject
            bundle_templates = ProductBundle.objects.filter(
                subject=new_ess.subject,
                is_active=True,
            ).prefetch_related('bundle_products__product_product_variation')

            for template in bundle_templates:
                # Create store Bundle from template
                new_bundle = Bundle.objects.create(
                    bundle_template=template,
                    exam_session_subject=new_ess,
                    is_active=True,
                    display_order=template.display_order,
                )
                bundles_created += 1

                # Populate bundle products by matching PPVs
                template_products = ProductBundleProduct.objects.filter(
                    bundle=template,
                    is_active=True,
                )
                for tbp in template_products:
                    ppv_id = tbp.product_product_variation_id
                    new_product = new_product_lookup.get((new_ess.id, ppv_id))

                    if new_product:
                        BundleProduct.objects.create(
                            bundle=new_bundle,
                            product=new_product,
                            default_price_type=tbp.default_price_type,
                            quantity=tbp.quantity,
                            sort_order=tbp.sort_order,
                            is_active=True,
                        )
                        bundle_products_created += 1

        return {
            'products_created': products_created,
            'prices_created': prices_created,
            'bundles_created': bundles_created,
            'bundle_products_created': bundle_products_created,
            'skipped_subjects': sorted(skipped_subjects),
        }

    @staticmethod
    def get_session_data_counts(session_id):
        """Return counts of active ESS, products, and bundles for a session."""
        ess_count = ExamSessionSubject.objects.filter(
            exam_session_id=session_id, is_active=True
        ).count()
        product_count = Product.objects.filter(
            exam_session_subject__exam_session_id=session_id, is_active=True
        ).count()
        bundle_count = Bundle.objects.filter(
            exam_session_subject__exam_session_id=session_id, is_active=True
        ).count()
        return {
            'exam_session_subjects': ess_count,
            'products': product_count,
            'bundles': bundle_count,
            'has_data': ess_count > 0 or product_count > 0 or bundle_count > 0,
        }

    @staticmethod
    @transaction.atomic
    def deactivate_session_data(session_id):
        """
        Deactivate all ESS, products, prices, bundles, and bundle products
        for an exam session. Uses a transaction for all-or-nothing behavior.
        """
        ess_ids = list(
            ExamSessionSubject.objects.filter(
                exam_session_id=session_id
            ).values_list('id', flat=True)
        )

        # Deactivate in dependency order (deepest first)
        bp_count = BundleProduct.objects.filter(
            bundle__exam_session_subject_id__in=ess_ids, is_active=True
        ).update(is_active=False)

        bundle_count = Bundle.objects.filter(
            exam_session_subject_id__in=ess_ids, is_active=True
        ).update(is_active=False)

        price_count = Price.objects.filter(
            product__exam_session_subject_id__in=ess_ids, is_active=True
        ).update(is_active=False)

        product_count = Product.objects.filter(
            exam_session_subject_id__in=ess_ids, is_active=True
        ).update(is_active=False)

        ess_count = ExamSessionSubject.objects.filter(
            id__in=ess_ids, is_active=True
        ).update(is_active=False)

        return {
            'exam_session_subjects_deactivated': ess_count,
            'products_deactivated': product_count,
            'prices_deactivated': price_count,
            'bundles_deactivated': bundle_count,
            'bundle_products_deactivated': bp_count,
        }
