"""
Fix exam session bundle subject mismatches.

This script corrects ExamSessionSubjectBundle records that are linked to incorrect
exam session subjects. It matches the bundle's subject with the correct exam session subject.

Example:
- "CM1 Materials & Marking Bundle" (master subject: CM1) linked to CB1 exam session subject
- Should be linked to CM1 exam session subject for the same exam session

Usage:
    python fix_bundle_subjects.py          # Dry run (no changes)
    python fix_bundle_subjects.py --commit # Actually save changes
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import transaction
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle
from exam_sessions_subjects.models import ExamSessionSubject


def fix_bundle_subjects(dry_run=True, verbose=True):
    """
    Fix exam session bundle subject associations.

    Args:
        dry_run (bool): If True, don't save changes (default: True)
        verbose (bool): Print detailed output (default: True)

    Returns:
        dict: Statistics about the operation
    """
    stats = {
        'bundles_processed': 0,
        'bundles_fixed': 0,
        'bundles_correct': 0,
        'bundles_no_match': 0,
        'errors': []
    }

    # Get all active exam session bundles
    exam_bundles = ExamSessionSubjectBundle.objects.filter(
        is_active=True
    ).select_related(
        'bundle__subject',
        'exam_session_subject__exam_session',
        'exam_session_subject__subject'
    )

    if verbose:
        print(f"\n{'='*80}")
        print(f"[SEARCH] Found {exam_bundles.count()} active exam session bundles to check")
        print(f"{'='*80}\n")

    with transaction.atomic():
        for bundle in exam_bundles:
            stats['bundles_processed'] += 1

            master_subject = bundle.bundle.subject
            current_subject = bundle.exam_session_subject.subject
            exam_session = bundle.exam_session_subject.exam_session

            if verbose:
                print(f"\n[BUNDLE] {bundle.bundle.bundle_name}")
                print(f"   Master Subject: {master_subject.code}")
                print(f"   Current Exam Session Subject: {current_subject.code}")
                print(f"   Exam Session: {exam_session}")

            # Check if subjects match
            if master_subject.code == current_subject.code:
                stats['bundles_correct'] += 1
                if verbose:
                    print(f"   [OK] Subject already correct")
                continue

            # Find the correct exam session subject
            try:
                correct_exam_session_subject = ExamSessionSubject.objects.get(
                    exam_session=exam_session,
                    subject=master_subject
                )

                if verbose:
                    print(f"   [MISMATCH] Found correct exam session subject: {master_subject.code}")

                # Update the bundle
                bundle.exam_session_subject = correct_exam_session_subject

                if not dry_run:
                    bundle.save()

                stats['bundles_fixed'] += 1
                if verbose:
                    print(f"   [FIX] Updated bundle to use {master_subject.code} exam session subject")

            except ExamSessionSubject.DoesNotExist:
                error_msg = (
                    f"[ERROR] No exam session subject found for "
                    f"{master_subject.code} in {exam_session}"
                )
                stats['errors'].append(error_msg)
                stats['bundles_no_match'] += 1
                if verbose:
                    print(f"   {error_msg}")

            except ExamSessionSubject.MultipleObjectsReturned:
                error_msg = (
                    f"[WARNING] Multiple exam session subjects found for "
                    f"{master_subject.code} in {exam_session} - need manual review"
                )
                stats['errors'].append(error_msg)
                stats['bundles_no_match'] += 1
                if verbose:
                    print(f"   {error_msg}")

            except Exception as e:
                error_msg = f"[ERROR] Error processing bundle {bundle.id}: {str(e)}"
                stats['errors'].append(error_msg)
                if verbose:
                    print(f"   {error_msg}")

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
    print(f"Bundles Fixed:          {stats['bundles_fixed']}")
    print(f"Bundles Already Correct: {stats['bundles_correct']}")
    print(f"Bundles No Match:       {stats['bundles_no_match']}")
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
        description='Fix exam session bundle subject mismatches'
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
        stats = fix_bundle_subjects(dry_run=dry_run, verbose=verbose)
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
