"""
Populate acted_exam_session_subject_bundle_products table.

This script links exam session bundles with their component product variations
by matching the master bundle catalog with available exam session products.

Relationship Chain:
1. Master Catalog: ProductBundle → ProductBundleProduct → ProductProductVariation
2. Exam Session: ExamSessionSubjectBundle → ExamSessionSubjectBundleProduct → ExamSessionSubjectProductVariation

The script matches:
- Product (via product.id or product.code)
- ProductVariation (via variation.id or variation.name)
- ExamSession (via the bundle's exam_session_subject)
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import transaction
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectBundle,
    ExamSessionSubjectBundleProduct,
    ExamSessionSubjectProductVariation
)
from products.models import ProductBundleProduct


def populate_bundle_products(dry_run=True, verbose=True):
    """
    Populate exam session bundle products by matching master catalog bundles
    with available exam session product variations.

    Args:
        dry_run (bool): If True, don't save changes (default: True)
        verbose (bool): Print detailed output (default: True)

    Returns:
        dict: Statistics about the operation
    """
    stats = {
        'bundles_processed': 0,
        'products_created': 0,
        'products_skipped': 0,
        'products_updated': 0,
        'errors': []
    }

    # Get all active exam session bundles
    exam_bundles = ExamSessionSubjectBundle.objects.filter(
        is_active=True
    ).select_related(
        'bundle',
        'bundle__subject',
        'exam_session_subject',
        'exam_session_subject__exam_session',
        'exam_session_subject__subject'
    ).prefetch_related(
        'bundle__bundle_products__product_product_variation__product',
        'bundle__bundle_products__product_product_variation__product_variation'
    )

    if verbose:
        print(f"\n{'='*80}")
        print(f"[SEARCH] Found {exam_bundles.count()} active exam session bundles to process")
        print(f"{'='*80}\n")

    with transaction.atomic():
        for exam_bundle in exam_bundles:
            stats['bundles_processed'] += 1

            if verbose:
                print(f"\n[BUNDLE] Processing Bundle: {exam_bundle}")
                print(f"   Master Bundle: {exam_bundle.bundle.bundle_name}")
                print(f"   Subject: {exam_bundle.exam_session_subject.subject.code}")
                print(f"   Exam Session: {exam_bundle.exam_session_subject.exam_session}")

            # Get master bundle products
            master_products = exam_bundle.bundle.bundle_products.filter(is_active=True)

            if verbose:
                print(f"   Components in master bundle: {master_products.count()}")

            for idx, master_product in enumerate(master_products, 1):
                ppv = master_product.product_product_variation
                product = ppv.product
                variation = ppv.product_variation

                if verbose:
                    print(f"\n   [{idx}] Matching: {product.shortname} ({variation.name})")

                # Find matching ExamSessionSubjectProductVariation
                # Match by: same exam_session_subject + same product + same variation
                try:
                    espv = ExamSessionSubjectProductVariation.objects.get(
                        exam_session_subject_product__exam_session_subject=exam_bundle.exam_session_subject,
                        exam_session_subject_product__product=product,
                        product_product_variation__product_variation=variation
                    )

                    if verbose:
                        print(f"       [OK] Found matching ESPV: ID={espv.id}")

                    # Check if bundle product already exists
                    existing = ExamSessionSubjectBundleProduct.objects.filter(
                        bundle=exam_bundle,
                        exam_session_subject_product_variation=espv
                    ).first()

                    if existing:
                        # Update existing
                        updated = False
                        if existing.default_price_type != master_product.default_price_type:
                            existing.default_price_type = master_product.default_price_type
                            updated = True
                        if existing.quantity != master_product.quantity:
                            existing.quantity = master_product.quantity
                            updated = True
                        if existing.sort_order != master_product.sort_order:
                            existing.sort_order = master_product.sort_order
                            updated = True
                        if existing.is_active != master_product.is_active:
                            existing.is_active = master_product.is_active
                            updated = True

                        if updated:
                            if not dry_run:
                                existing.save()
                            stats['products_updated'] += 1
                            if verbose:
                                print(f"       [UPDATE] Updated existing bundle product")
                        else:
                            stats['products_skipped'] += 1
                            if verbose:
                                print(f"       [SKIP] Already exists (no changes needed)")
                    else:
                        # Create new bundle product
                        bundle_product = ExamSessionSubjectBundleProduct(
                            bundle=exam_bundle,
                            exam_session_subject_product_variation=espv,
                            default_price_type=master_product.default_price_type,
                            quantity=master_product.quantity,
                            sort_order=master_product.sort_order,
                            is_active=master_product.is_active
                        )

                        if not dry_run:
                            bundle_product.save()

                        stats['products_created'] += 1
                        if verbose:
                            print(f"       [CREATE] Created new bundle product")

                except ExamSessionSubjectProductVariation.DoesNotExist:
                    error_msg = (
                        f"[ERROR] No matching ESPV for {product.shortname} ({variation.name}) "
                        f"in {exam_bundle.exam_session_subject}"
                    )
                    stats['errors'].append(error_msg)
                    if verbose:
                        print(f"       {error_msg}")

                except ExamSessionSubjectProductVariation.MultipleObjectsReturned:
                    error_msg = (
                        f"[WARNING] Multiple ESPV matches for {product.shortname} ({variation.name}) "
                        f"in {exam_bundle.exam_session_subject} - need manual review"
                    )
                    stats['errors'].append(error_msg)
                    if verbose:
                        print(f"       {error_msg}")

                except Exception as e:
                    error_msg = f"[ERROR] Error processing {product.shortname}: {str(e)}"
                    stats['errors'].append(error_msg)
                    if verbose:
                        print(f"       {error_msg}")

        if dry_run:
            if verbose:
                print("\n" + "="*80)
                print("[DRY RUN] Rolling back transaction (no changes saved)")
                print("="*80)
            # Rollback the transaction in dry run mode
            transaction.set_rollback(True)
        else:
            if verbose:
                print("\n" + "="*80)
                print("[COMMIT] Committing changes to database...")
                print("="*80)

    return stats


def print_summary(stats, dry_run=True):
    """Print summary statistics"""
    print("\n" + "="*80)
    print("[SUMMARY]")
    print("="*80)
    print(f"Bundles Processed:      {stats['bundles_processed']}")
    print(f"Products Created:       {stats['products_created']}")
    print(f"Products Updated:       {stats['products_updated']}")
    print(f"Products Skipped:       {stats['products_skipped']}")
    print(f"Errors:                 {len(stats['errors'])}")

    if stats['errors']:
        print(f"\n[WARNING] Errors encountered:")
        for error in stats['errors']:
            print(f"   - {error}")

    if dry_run:
        print(f"\n{'='*80}")
        print("[INFO] This was a DRY RUN - no changes were saved")
        print("   Run with --commit to save changes to the database")
        print("="*80)
    else:
        print(f"\n{'='*80}")
        print("[SUCCESS] Changes committed to database")
        print("="*80)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='Populate exam session bundle products from master catalog'
    )
    parser.add_argument(
        '--commit',
        action='store_true',
        help='Actually save changes (default is dry-run)'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Reduce output verbosity'
    )

    args = parser.parse_args()

    dry_run = not args.commit
    verbose = not args.quiet

    try:
        stats = populate_bundle_products(dry_run=dry_run, verbose=verbose)
        print_summary(stats, dry_run=dry_run)

        if stats['errors']:
            sys.exit(1)  # Exit with error code if there were errors
        else:
            sys.exit(0)  # Success

    except Exception as e:
        print(f"\n[FATAL ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(2)
