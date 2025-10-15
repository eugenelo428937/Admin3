"""
Management command to clean up old VAT audit records (Phase 4, Task T035)

Deletes VATAudit records older than 2 years (730 days) to maintain database size
while preserving compliance-required audit history.

Usage:
    python manage.py cleanup_vat_audit                    # Delete old records
    python manage.py cleanup_vat_audit --dry-run          # Preview without deleting
    python manage.py cleanup_vat_audit --days 1095        # Custom retention (3 years)

Retention Policy:
- Default: 730 days (2 years)
- Configurable via --days parameter
- Dry-run mode available for testing

Audit Trail:
- Logs deletion count
- Reports records affected
- Safe for automated scheduling (cron)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from vat.models import VATAudit


class Command(BaseCommand):
    help = 'Clean up VAT audit records older than specified retention period (default: 2 years)'

    def add_arguments(self, parser):
        """Add command-line arguments"""
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview records that would be deleted without actually deleting them',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=730,
            help='Retention period in days (default: 730 = 2 years)',
        )

    def handle(self, *args, **options):
        """Execute cleanup command"""
        # Get options
        dry_run = options['dry_run']
        retention_days = options['days']

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=retention_days)

        # Find records to delete
        old_records = VATAudit.objects.filter(created_at__lt=cutoff_date)
        record_count = old_records.count()

        # Output mode indicator
        mode = "[DRY RUN] " if dry_run else ""

        # Report findings
        self.stdout.write(
            self.style.WARNING(
                f"{mode}Found {record_count} VAT audit record(s) older than {retention_days} days "
                f"(created before {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')})"
            )
        )

        if record_count == 0:
            self.stdout.write(
                self.style.SUCCESS("No records to delete. Database is clean.")
            )
            return

        # Delete records (unless dry-run)
        if not dry_run:
            deleted_count, _ = old_records.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} VAT audit record(s)"
                )
            )
        else:
            self.stdout.write(
                self.style.NOTICE(
                    f"Dry run mode: Would delete {record_count} record(s). "
                    f"Run without --dry-run to perform actual deletion."
                )
            )

        # Summary statistics
        remaining_count = VATAudit.objects.count()
        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Cleanup complete. {remaining_count} VAT audit record(s) remaining."
                )
            )
