"""
Clean bundle products to ensure they only reference ESPVs from the correct subject.

For each bundle, remove any bundle products that reference ESPVs from a different
subject than the bundle's subject.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import transaction
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectBundle,
    ExamSessionSubjectBundleProduct
)


def clean_bundle_products(dry_run=True, verbose=True):
    """
    Remove bundle products that don't match the bundle's subject.

    Args:
        dry_run (bool): If True, don't save changes (default: True)
        verbose (bool): Print detailed output (default: True)

    Returns:
        dict: Statistics about the operation
    """
    stats = {
        'bundles_processed': 0,
        'products_removed': 0,
        'bundles_cleaned': 0,
        'errors': []
    }

    # Get all active exam session bundles
    bundles = ExamSessionSubjectBundle.objects.filter(
        is_active=True
    ).select_related(
        'bundle__subject',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session'
    ).prefetch_related(
        'bundle_products__exam_session_subject_product_variation__exam_session_subject_product__exam_session_subject__subject'
    )

    if verbose:
        print(f"\n{'='*80}")
        print(f"[SEARCH] Found {bundles.count()} active exam session bundles to process")
        print(f"{'='*80}\n")

    with transaction.atomic():
        for bundle in bundles:
            stats['bundles_processed'] += 1

            bundle_subject = bundle.exam_session_subject.subject
            bundle_exam_session = bundle.exam_session_subject.exam_session

            if verbose:
                print(f"\n[BUNDLE] {bundle.bundle.bundle_name}")
                print(f"   Expected Subject: {bundle_subject.code}")
                print(f"   Exam Session: {bundle_exam_session}")
                print(f"   Total items: {bundle.bundle_products.count()}")

            # Find mismatched products
            to_delete = []

            for bp in bundle.bundle_products.all():
                espv = bp.exam_session_subject_product_variation
                espv_subject = espv.exam_session_subject_product.exam_session_subject.subject
                espv_exam_session = espv.exam_session_subject_product.exam_session_subject.exam_session

                # Check if ESPV subject matches bundle subject AND exam session matches
                if espv_subject.code != bundle_subject.code or espv_exam_session.id != bundle_exam_session.id:
                    to_delete.append(bp)
                    product = espv.exam_session_subject_product.product
                    variation = espv.product_product_variation.product_variation
                    if verbose:
                        print(f"   [MISMATCH] {product.shortname} ({variation.name}) - ESPV from {espv_subject.code}, expected {bundle_subject.code} - ID={bp.id}")

            # Delete mismatched products
            if to_delete:
                stats['bundles_cleaned'] += 1
                stats['products_removed'] += len(to_delete)

                if not dry_run:
                    for bp in to_delete:
                        bp.delete()

                if verbose:
                    print(f"   [REMOVED] {len(to_delete)} mismatched product(s)")
                    print(f"   [REMAINING] {bundle.bundle_products.count() - len(to_delete)} products")
            else:
                if verbose:
                    print(f"   [OK] All products match bundle subject")

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
    print(f"Bundles Processed:           {stats['bundles_processed']}")
    print(f"Bundles Cleaned:             {stats['bundles_cleaned']}")
    print(f"Mismatched Products Removed: {stats['products_removed']}")
    print(f"Errors:                      {len(stats['errors'])}")

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
        description='Clean bundle products by removing subject mismatches'
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
        stats = clean_bundle_products(dry_run=dry_run, verbose=verbose)
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
