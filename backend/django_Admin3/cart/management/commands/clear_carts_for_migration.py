"""Management command to clear all shopping carts before store migration.

FR-013: System MUST clear all shopping carts before migration and notify affected users in advance.

This command should be run as part of the pre-migration checklist:
1. Notify users of upcoming maintenance window
2. Run this command to clear all shopping carts
3. Backup database
4. Run migrations
"""
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from cart.models import Cart, CartItem

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clear all shopping carts before store app migration (FR-013)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        # Get counts
        cart_count = Cart.objects.count()
        item_count = CartItem.objects.count()

        self.stdout.write(
            f'\nFound {cart_count} carts containing {item_count} items.\n'
        )

        if cart_count == 0:
            self.stdout.write(self.style.SUCCESS('No carts to clear.'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'DRY RUN: Would delete {item_count} cart items from {cart_count} carts.'
            ))
            return

        if not force:
            confirm = input(
                f'\nThis will permanently delete ALL {cart_count} carts and {item_count} items.\n'
                'This action cannot be undone.\n'
                'Type "yes" to confirm: '
            )
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled.'))
                return

        try:
            with transaction.atomic():
                # Delete cart items first (respects FK constraints)
                items_deleted, _ = CartItem.objects.all().delete()
                self.stdout.write(f'Deleted {items_deleted} cart items.')

                # Delete carts
                carts_deleted, _ = Cart.objects.all().delete()
                self.stdout.write(f'Deleted {carts_deleted} carts.')

                logger.info(
                    f'FR-013 Migration Prep: Cleared {carts_deleted} carts '
                    f'containing {items_deleted} items.'
                )

            self.stdout.write(self.style.SUCCESS(
                f'\nSuccessfully cleared {carts_deleted} carts containing {items_deleted} items.'
            ))

        except Exception as e:
            logger.error(f'Error clearing carts: {str(e)}')
            raise CommandError(f'Failed to clear carts: {str(e)}')
