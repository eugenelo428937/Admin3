"""
Django management command to clean up expired address cache entries.

This command deletes CachedAddress entries where expires_at < now().
Should be run periodically (e.g., daily via cron job) to prevent database bloat.

Usage:
    python manage.py cleanup_expired_cache
    python manage.py cleanup_expired_cache --dry-run
    python manage.py cleanup_expired_cache --older-than-days 30
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from address_cache.models import CachedAddress


class Command(BaseCommand):
    help = 'Clean up expired address cache entries'

    def add_arguments(self, parser):
        """Add command arguments"""
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be deleted without actually deleting',
        )

        parser.add_argument(
            '--older-than-days',
            type=int,
            default=0,
            help='Delete entries older than X days beyond expiration (default: 0)',
        )

        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of entries to delete per batch (default: 1000)',
        )

    def handle(self, *args, **options):
        """Execute the command"""
        dry_run = options['dry_run']
        older_than_days = options['older_than_days']
        batch_size = options['batch_size']

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=older_than_days)

        # Get count of expired entries
        expired_entries = CachedAddress.objects.filter(expires_at__lt=cutoff_date)
        total_count = expired_entries.count()

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('No expired cache entries found.'))
            return

        # Display summary
        self.stdout.write(f"\nFound {total_count} expired cache entries")
        self.stdout.write(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No entries will be deleted.'))
            self._print_sample_entries(expired_entries)
            return

        # Confirm deletion
        if total_count > 1000:
            confirm = input(f'\nAbout to delete {total_count} cache entries. Continue? [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write(self.style.WARNING('Cleanup cancelled.'))
                return

        # Delete in batches
        deleted_count = 0
        while True:
            # Get batch of expired entries
            batch_ids = list(expired_entries.values_list('id', flat=True)[:batch_size])

            if not batch_ids:
                break

            # Delete batch
            batch_deleted, _ = CachedAddress.objects.filter(id__in=batch_ids).delete()
            deleted_count += batch_deleted

            self.stdout.write(f"Deleted batch of {batch_deleted} entries (total: {deleted_count}/{total_count})")

        # Final summary
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Successfully deleted {deleted_count} expired cache entries.')
        )

        # Show statistics
        self._print_statistics()

    def _print_sample_entries(self, queryset):
        """Print sample of entries that would be deleted"""
        sample = queryset.order_by('expires_at')[:10]

        self.stdout.write('\nSample of entries to be deleted:')
        self.stdout.write(f"{'Postcode':<15} {'Expired':<20} {'Hits':<10} {'Created':<20}")
        self.stdout.write('-' * 70)

        for entry in sample:
            expired_str = entry.expires_at.strftime('%Y-%m-%d %H:%M')
            created_str = entry.created_at.strftime('%Y-%m-%d %H:%M')
            self.stdout.write(
                f"{entry.postcode:<15} {expired_str:<20} {entry.hit_count:<10} {created_str:<20}"
            )

        if queryset.count() > 10:
            self.stdout.write(f"... and {queryset.count() - 10} more entries")

    def _print_statistics(self):
        """Print cache statistics after cleanup"""
        active_count = CachedAddress.objects.filter(expires_at__gte=timezone.now()).count()
        total_count = CachedAddress.objects.count()

        self.stdout.write('\nCache Statistics:')
        self.stdout.write(f"  Active entries: {active_count}")
        self.stdout.write(f"  Total entries: {total_count}")

        if active_count > 0:
            # Get oldest and newest active entries
            oldest = CachedAddress.objects.filter(expires_at__gte=timezone.now()).order_by('created_at').first()
            newest = CachedAddress.objects.filter(expires_at__gte=timezone.now()).order_by('-created_at').first()

            if oldest and newest:
                self.stdout.write(f"  Oldest active entry: {oldest.created_at.strftime('%Y-%m-%d')}")
                self.stdout.write(f"  Newest active entry: {newest.created_at.strftime('%Y-%m-%d')}")
