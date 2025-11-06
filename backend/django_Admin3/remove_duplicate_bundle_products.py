"""
Remove duplicate bundle products.

For each bundle, if the same product+variation appears multiple times,
keep only the first one and delete the rest.
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


def remove_duplicates(dry_run=True, verbose=True):
    """
    Remove duplicate bundle products from each bundle.

    Args:
        dry_run (bool): If True, don't save changes (default: True)
        verbose (bool): Print detailed output (default: True)

    Returns:
        dict: Statistics about the operation
    """
    stats = {
        'bundles_processed': 0,
        'duplicates_removed': 0,
        'bundles_with_duplicates': 0,
        'errors': []
    }

    # Get all active exam session bundles
    bundles = ExamSessionSubjectBundle.objects.filter(
        is_active=True
    ).select_related(
        'bundle',
        'exam_session_subject__subject'
    ).prefetch_related(
        'bundle_products__exam_session_subject_product_variation__exam_session_subject_product__product',
        'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
    )

    if verbose:
        print(f"\n{'='*80}")
        print(f"[SEARCH] Found {bundles.count()} active exam session bundles to process")
        print(f"{'='*80}\n")

    with transaction.atomic():
        for bundle in bundles:
            stats['bundles_processed'] += 1

            if verbose:
                print(f"\n[BUNDLE] {bundle.bundle.bundle_name}")
                print(f"   Subject: {bundle.exam_session_subject.subject.code}")
                print(f"   Total items: {bundle.bundle_products.count()}")

            # Track seen products (by bundle_id + espv_id)
            seen = {}
            to_delete = []

            for bp in bundle.bundle_products.all():
                # Create unique key: bundle_id + espv_id
                key = (bp.bundle_id, bp.exam_session_subject_product_variation_id)

                if key in seen:
                    # This is a duplicate
                    to_delete.append(bp)
                    product_name = bp.exam_session_subject_product_variation.exam_session_subject_product.product.shortname
                    variation = bp.product_variation.name
                    if verbose:
                        print(f"   [DUPLICATE] {product_name} ({variation}) - ID={bp.id}")
                else:
                    # First occurrence - keep it
                    seen[key] = bp

            # Delete duplicates
            if to_delete:
                stats['bundles_with_duplicates'] += 1
                stats['duplicates_removed'] += len(to_delete)

                if not dry_run:
                    for bp in to_delete:
                        bp.delete()

                if verbose:
                    print(f"   [REMOVED] {len(to_delete)} duplicate(s)")
            else:
                if verbose:
                    print(f"   [OK] No duplicates")

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
    print(f"Bundles With Duplicates:     {stats['bundles_with_duplicates']}")
    print(f"Duplicate Records Removed:   {stats['duplicates_removed']}")
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
        description='Remove duplicate bundle products'
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
        stats = remove_duplicates(dry_run=dry_run, verbose=verbose)
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
