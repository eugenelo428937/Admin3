"""
Management command to clear rules engine cache.

Usage:
    # Clear all rules cache (based on entry points in database)
    python manage.py clear_rules_cache

    # Clear cache for specific entry point
    python manage.py clear_rules_cache --entry-point=home_page_mount

    # Clear cache for multiple entry points
    python manage.py clear_rules_cache --entry-point=home_page_mount --entry-point=checkout_terms
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache

from rules_engine.models import ActedRule, RuleEntryPoint


class Command(BaseCommand):
    help = 'Clear rules engine cache for specified or all entry points'

    def add_arguments(self, parser):
        parser.add_argument(
            '--entry-point',
            action='append',
            dest='entry_points',
            help='Specific entry point(s) to clear cache for. Can be specified multiple times.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            dest='clear_all',
            help='Clear cache for ALL entry points (based on database records)',
        )

    def handle(self, *args, **options):
        entry_points = options.get('entry_points')
        clear_all = options.get('clear_all')

        if entry_points:
            # Clear specific entry points
            for entry_point in entry_points:
                self._invalidate_cache(entry_point)
                self.stdout.write(
                    self.style.SUCCESS(f"Cache invalidated for entry point: {entry_point}")
                )
        elif clear_all or not entry_points:
            # Clear all entry points found in database
            # Get unique entry points from both RuleEntryPoint and ActedRule
            db_entry_points = set()

            # From RuleEntryPoint model
            db_entry_points.update(
                RuleEntryPoint.objects.filter(is_active=True).values_list('code', flat=True)
            )

            # From ActedRule model (in case there are rules with entry points not in RuleEntryPoint)
            db_entry_points.update(
                ActedRule.objects.values_list('entry_point', flat=True).distinct()
            )

            if not db_entry_points:
                self.stdout.write(
                    self.style.WARNING("No entry points found in database")
                )
                return

            for entry_point in db_entry_points:
                self._invalidate_cache(entry_point)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Cache invalidated for {len(db_entry_points)} entry point(s): "
                    f"{', '.join(sorted(db_entry_points))}"
                )
            )

    def _invalidate_cache(self, entry_point: str) -> None:
        """Invalidate cache for the given entry point."""
        # Normalize cache key: replace spaces with underscores, lowercase
        safe_entry_point = entry_point.replace(' ', '_').lower()
        cache_key = f"rules:{safe_entry_point}"
        cache.delete(cache_key)
